import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

export async function GET(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;
  const userId = session.userId; // always your own notifications

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    const notifs = await db.collection('notifications')
      .find({
        userId,
        ...(user?.createdAt ? { createdAt: { $gte: user.createdAt } } : {}),
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      notifications: notifs.map(n => ({
        id: n._id!.toString(),
        title: n.title,
        body: n.body,
        type: n.type,
        read: n.read,
        link: n.link,
        createdAt: n.createdAt,
      })),
      unreadCount: notifs.filter(n => !n.read).length,
    });
  } catch (e: any) {
    console.error('[notifications GET]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { notifId } = await request.json();
    const db = await getDb();

    if (notifId && ObjectId.isValid(notifId)) {
      // Only mark it read if it actually belongs to the logged-in user.
      await db.collection('notifications').updateOne(
        { _id: new ObjectId(notifId), userId: session.userId },
        { $set: { read: true } },
      );
    } else {
      await db.collection('notifications').updateMany({ userId: session.userId }, { $set: { read: true } });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[notifications PATCH]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = await getDb();

    if (id && ObjectId.isValid(id)) {
      // Only delete it if it actually belongs to the logged-in user.
      await db.collection('notifications').deleteOne({ _id: new ObjectId(id), userId: session.userId });
    } else {
      await db.collection('notifications').deleteMany({ userId: session.userId });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[notifications DELETE]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
