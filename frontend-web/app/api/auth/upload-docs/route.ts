import { NextResponse } from 'next/server';
import { getDb, getGridFSBucket } from '@/lib/mongodb';
import type { UserDoc } from '@/lib/types';

// This route runs DURING doctor registration, before any login session
// exists (register -> verify email OTP -> upload-docs -> admin approval).
// Because there's no session yet, we can't use requireAuth() here. Instead,
// we only allow it to act on accounts that are still in the one-time
// "pending_approval" window — this stops someone from using a stranger's
// email to silently overwrite an already-active account's profile image
// or attach documents to it.
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DOCS = 5;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const profileImage = formData.get('profileImage') as File | null;
    const docs = formData.getAll('docs') as File[];

    if (!email) return NextResponse.json({ error: 'email required.' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase() });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (user.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'This step is only available right after registration.' },
        { status: 403 },
      );
    }

    if (profileImage && !ALLOWED_IMAGE_TYPES.includes(profileImage.type)) {
      return NextResponse.json({ error: 'Profile image must be JPEG, PNG, or WEBP.' }, { status: 400 });
    }
    if (profileImage && profileImage.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Profile image must be under 10MB.' }, { status: 400 });
    }
    if (docs.length > MAX_DOCS) {
      return NextResponse.json({ error: `You can upload at most ${MAX_DOCS} documents.` }, { status: 400 });
    }
    for (const doc of docs) {
      if (!ALLOWED_DOC_TYPES.includes(doc.type)) {
        return NextResponse.json({ error: 'Documents must be PDF, JPEG, PNG, or WEBP.' }, { status: 400 });
      }
      if (doc.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'Each document must be under 10MB.' }, { status: 400 });
      }
    }

    const updates: Partial<UserDoc & { docFileIds: string[] }> = {};

    if (profileImage) {
      const bucket = await getGridFSBucket('profile_images');
      const buffer = Buffer.from(await profileImage.arrayBuffer());
      const stream = bucket.openUploadStream(profileImage.name, {
        metadata: { userId: user._id!.toString(), contentType: profileImage.type },
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve); stream.on('error', reject);
        stream.write(buffer); stream.end();
      });
      updates.profileImageFileId = stream.id.toString();
    }

    const docIds: string[] = [];
    for (const doc of docs) {
      const bucket = await getGridFSBucket('doctor_docs');
      const buffer = Buffer.from(await doc.arrayBuffer());
      const stream = bucket.openUploadStream(doc.name, {
        metadata: { userId: user._id!.toString(), email, contentType: doc.type },
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve); stream.on('error', reject);
        stream.write(buffer); stream.end();
      });
      docIds.push(stream.id.toString());
    }
    if (docIds.length > 0) (updates as any).docFileIds = docIds;

    if (Object.keys(updates).length > 0) {
      await db.collection('users').updateOne(
        { email: email.toLowerCase() },
        { $set: { ...updates, updatedAt: new Date() } },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[upload-docs]', e);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
