import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, getGridFSBucket } from '@/lib/mongodb';
import { requireAuth, requireRole } from '@/lib/requireAuth';
import type { UserDoc } from '@/lib/types';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// PATCH /api/users  → update YOUR OWN profile (not anyone else's)
export async function PATCH(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const location = formData.get('location') as string | null;
    const specialization = formData.get('specialization') as string | null;
    const profileImage = formData.get('profileImage') as File | null;

    // userId is taken from the session, never from the request body —
    // this is what stops a user from editing someone else's profile.
    const userId = session.userId;

    const db = await getDb();
    const updates: any = { updatedAt: new Date() };
    if (name) updates.name = name.trim();
    if (location !== null) updates.location = location;
    if (specialization !== null) updates.specialization = specialization;

    if (profileImage) {
      if (!ALLOWED_IMAGE_TYPES.includes(profileImage.type)) {
        return NextResponse.json(
          { error: 'Profile image must be a JPEG, PNG, or WEBP file.' },
          { status: 400 },
        );
      }
      if (profileImage.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Profile image must be under 5MB.' }, { status: 400 });
      }

      const bucket = await getGridFSBucket('profile_images');
      const buffer = Buffer.from(await profileImage.arrayBuffer());
      const stream = bucket.openUploadStream(profileImage.name, {
        metadata: { userId, contentType: profileImage.type },
      });
      await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve); stream.on('error', reject);
        stream.write(buffer); stream.end();
      });
      updates.profileImageFileId = stream.id.toString();
    }

    await db.collection<UserDoc>('users').updateOne(
      { _id: new ObjectId(userId) }, { $set: updates },
    );

    const updated = await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(userId) });
    if (!updated) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    return NextResponse.json({
      user: {
        id: updated._id!.toString(),
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        location: updated.location,
        specialization: updated.specialization,
        profileImageUrl: updated.profileImageFileId ? `/api/images/${updated.profileImageFileId}` : null,
      },
    });
  } catch (e: any) {
    console.error('[users PATCH]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// GET /api/users  → list users (admin only — this returns PII like email/location)
export async function GET(request: Request) {
  const session = requireRole('admin');
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const db = await getDb();
    const query: any = {};
    if (role) query.role = role;
    if (status) query.status = status;

    const users = await db.collection<UserDoc>('users')
      .find(query, { projection: { passwordHash: 0, otp: 0, resetToken: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      users: users.map(u => ({
        id: u._id!.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        location: u.location,
        specialization: u.specialization,
        licenseNumber: u.licenseNumber,
        qualifications: (u as any).qualifications,
        profileImageUrl: u.profileImageFileId ? `/api/images/${u.profileImageFileId}` : null,
        docUrls: (u as any).docFileIds?.map((id: string) => `/api/images/${id}`) || [],
        createdAt: u.createdAt,
      })),
    });
  } catch (e: any) {
    console.error('[users GET]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// DELETE /api/users  → delete YOUR OWN account after OTP verification
export async function DELETE(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { otp } = await request.json();
    if (!otp) return NextResponse.json({ error: 'otp required.' }, { status: 400 });

    const userId = session.userId; // always your own account, never one passed in

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(userId) });

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (user.otp !== otp) return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
    if (!user.otpExpiry || new Date() > user.otpExpiry)
      return NextResponse.json({ error: 'OTP expired. Request a new one.' }, { status: 400 });

    await db.collection<UserDoc>('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { status: 'deleted' as any, deletedAt: new Date(), updatedAt: new Date() } as any },
    );

    return NextResponse.json({ success: true, message: 'Account deleted. Your data is retained per policy.' });
  } catch (e: any) {
    console.error('[users DELETE]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
