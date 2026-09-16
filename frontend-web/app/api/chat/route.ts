import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, getGridFSBucket } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';
import { emitToThread, emitToUser, isUserOnline } from '@/lib/socketEmit';
import type { MessageDoc } from '@/lib/types';

function makeThreadId(a: string, b: string) { return [a, b].sort().join('_'); }

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'audio/webm', 'audio/mpeg', 'audio/mp4',
  'video/mp4', 'video/webm',
  'application/pdf', // prescriptions / documents
];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

function serializeMessage(m: MessageDoc) {
  return {
    id: m._id!.toString(),
    threadId: m.threadId,
    sender: m.sender,
    senderId: m.senderId,
    senderName: m.senderName,
    type: m.type,
    text: m.text,
    fileUrl: m.fileId ? `/api/images/${m.fileId}` : null,
    fileName: m.fileName,
    fileMimeType: m.fileMimeType,
    duration: m.duration,
    deliveredTo: m.deliveredTo || [],
    readBy: m.readBy || [],
    reactions: m.reactions || {},
    createdAt: m.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');
  const userId = session.userId; // always the logged-in user, never a client param

  const db = await getDb();

  if (threadId) {
    // A threadId is just "sortedId1_sortedId2" — guessable if you know two
    // user ids. Verify the requester is actually one of the two participants
    // before returning any messages for it.
    const [idA, idB] = threadId.split('_');
    if (userId !== idA && userId !== idB) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const messages = await db.collection<MessageDoc>('messages')
      .find({ threadId })
      .sort({ createdAt: 1 })
      .toArray();

    const unreadIds = messages
      .filter(m => m.senderId !== userId && !(m.readBy || []).includes(userId))
      .map(m => m._id!);

    if (unreadIds.length > 0) {
      await db.collection<MessageDoc>('messages').updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { readBy: userId, deliveredTo: userId } as any },
      );
      // Tell the sender's client to flip those ticks to "seen" (blue).
      emitToThread(threadId, 'message:read', {
        threadId,
        readerId: userId,
        messageIds: unreadIds.map(id => id.toString()),
      });
    }

    return NextResponse.json({ messages: messages.map(serializeMessage) });
  }

  // Thread list — always for the logged-in user, never a userId passed in.
  const threads = await db.collection<MessageDoc>('messages').aggregate([
    { $match: { $or: [{ farmerId: userId }, { doctorId: userId }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$threadId',
        lastMessage: { $first: '$text' },
        lastMessageTime: { $first: '$createdAt' },
        lastType: { $first: '$type' },
        farmerId: { $first: '$farmerId' },
        doctorId: { $first: '$doctorId' },
        unreadCount: { $sum: { $cond: [{ $in: [userId, '$readBy'] }, 0, 1] } },
      },
    },
    { $sort: { lastMessageTime: -1 } },
  ]).toArray();

  // Resolve the other participant for every thread in one query. Per-thread
  // lookups turn the badge/chat polling path into an N+1 database workload.
  const otherIds = threads
    .map((thread) => thread.farmerId === userId ? thread.doctorId : thread.farmerId)
    .filter((id): id is string => Boolean(id && ObjectId.isValid(id)));
  const otherUsers = otherIds.length > 0
    ? await db.collection('users').find(
        { _id: { $in: otherIds.map((id) => new ObjectId(id)) } },
        { projection: { name: 1, profileImageFileId: 1, role: 1, availabilityStatus: 1 } },
      ).toArray()
    : [];
  const usersById = new Map(otherUsers.map((other) => [other._id.toString(), other]));

  const enriched = threads.map((t) => {
    const otherId = t.farmerId === userId ? t.doctorId : t.farmerId;
    const other = usersById.get(otherId);
    return {
      threadId: t._id,
      otherId,
      otherName: other?.name || 'Unknown',
      otherAvatar: other?.profileImageFileId ? `/api/images/${other.profileImageFileId}` : null,
      otherOnline: isUserOnline(otherId),
      otherAvailability: other?.role === 'doctor' ? (other?.availabilityStatus || 'offline') : undefined,
      lastMessage: t.lastType !== 'text' ? `📎 ${t.lastType}` : (t.lastMessage || ''),
      lastMessageTime: t.lastMessageTime,
      unreadCount: t.unreadCount,
    };
  });

  return NextResponse.json({ threads: enriched });
}

export async function POST(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const formData = await request.formData();
    const receiverId = formData.get('receiverId') as string;
    const text       = formData.get('text') as string || '';
    const type       = (formData.get('type') as string || 'text') as MessageDoc['type'];
    const file       = formData.get('file') as File | null;
    const duration   = formData.get('duration') ? Number(formData.get('duration')) : undefined;

    if (!receiverId)
      return NextResponse.json({ error: 'receiverId required.' }, { status: 400 });

    // Sender identity comes entirely from the session now — a user can no
    // longer send a message that claims to be from someone else.
    const senderId = session.userId;
    const senderRole: 'farmer' | 'doctor' = session.role === 'doctor' ? 'doctor' : 'farmer';

    const db = await getDb();

    // Make sure the receiver actually exists.
    if (!ObjectId.isValid(receiverId) || !(await db.collection('users').findOne({ _id: new ObjectId(receiverId) }))) {
      return NextResponse.json({ error: 'Receiver not found.' }, { status: 404 });
    }

    // Look up the sender's real name server-side rather than trusting a
    // client-supplied "senderName" field, which could be spoofed.
    const senderDoc = await db.collection('users').findOne({ _id: new ObjectId(senderId) });
    const senderName = senderDoc?.name || session.email;

    const threadId = makeThreadId(senderId, receiverId);
    let fileId: string | undefined;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;

    if (file && type !== 'text') {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'File must be under 20MB.' }, { status: 400 });
      }

      const bucket = await getGridFSBucket('chat_files');
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = bucket.openUploadStream(file.name, {
        metadata: { threadId, senderId, type, contentType: file.type },
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve); stream.on('error', reject);
        stream.write(buffer); stream.end();
      });
      fileId = stream.id.toString();
      fileName = file.name;
      fileMimeType = file.type;
    }

    const now = new Date();
    const receiverOnline = isUserOnline(receiverId);

    const msg: MessageDoc = {
      threadId,
      farmerId: senderRole === 'farmer' ? senderId : receiverId,
      doctorId: senderRole === 'doctor' ? senderId : receiverId,
      sender: senderRole,
      senderId,
      senderName,
      type,
      text,
      fileId,
      fileName,
      fileMimeType,
      duration,
      readBy: [senderId],
      // If the receiver's socket is currently connected, count it delivered
      // immediately (double tick). Otherwise it stays single-tick (sent
      // only) until they next open the app and GET this thread/list.
      deliveredTo: receiverOnline ? [senderId, receiverId] : [senderId],
      reactions: {},
      createdAt: now,
    };

    const result = await db.collection<MessageDoc>('messages').insertOne(msg);
    const fullMsg = { ...msg, _id: result.insertedId };

    await db.collection('notifications').insertOne({
      userId: receiverId,
      title: `New message`,
      body: type === 'text' ? (text || '...') : `Sent a ${type}`,
      type: 'message',
      read: false,
      createdAt: now,
    });

    const serialized = serializeMessage(fullMsg);

    // Push it out in real time to anyone with the thread open...
    emitToThread(threadId, 'message:new', serialized);
    // ...and to the receiver's personal room, so a badge/toast updates even
    // if they don't currently have this specific thread open.
    emitToUser(receiverId, 'thread:updated', { threadId, message: serialized });

    return NextResponse.json({ message: serialized }, { status: 201 });
  } catch (e: any) {
    console.error('[chat POST]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// PATCH /api/chat  → toggle an emoji reaction on a message
export async function PATCH(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { messageId, emoji } = await request.json();
    if (!messageId || !emoji) return NextResponse.json({ error: 'messageId and emoji required.' }, { status: 400 });
    if (!ObjectId.isValid(messageId)) return NextResponse.json({ error: 'Invalid messageId.' }, { status: 400 });

    const ALLOWED_EMOJI = ['👍', '✅', '❓', '❤️', '😢'];
    if (!ALLOWED_EMOJI.includes(emoji)) {
      return NextResponse.json({ error: 'Unsupported reaction.' }, { status: 400 });
    }

    const db = await getDb();
    const msg = await db.collection<MessageDoc>('messages').findOne({ _id: new ObjectId(messageId) });
    if (!msg) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

    // Only the two thread participants can react to a message in it.
    const userId = session.userId;
    if (msg.farmerId !== userId && msg.doctorId !== userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const reactions = { ...(msg.reactions || {}) };
    if (reactions[userId] === emoji) {
      delete reactions[userId]; // tapping the same emoji again removes it
    } else {
      reactions[userId] = emoji;
    }

    await db.collection<MessageDoc>('messages').updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { reactions } },
    );

    emitToThread(msg.threadId, 'message:reaction', { messageId, reactions });

    return NextResponse.json({ success: true, reactions });
  } catch (e: any) {
    console.error('[chat PATCH]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
