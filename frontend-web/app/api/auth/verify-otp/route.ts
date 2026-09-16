import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { UserDoc } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp)
      return NextResponse.json({ error: 'Email and OTP required.' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase().trim() });

    if (!user)
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (user.otp !== otp)
      return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });

    if (!user.otpExpiry || new Date() > user.otpExpiry)
      return NextResponse.json({ error: 'OTP expired. Please register again.' }, { status: 400 });

    // Farmers become active; doctors go to pending_approval
    const newStatus = user.role === 'doctor' ? 'pending_approval' : 'active';

    await db.collection<UserDoc>('users').updateOne(
      { email: email.toLowerCase() },
      {
        $set: { status: newStatus, updatedAt: new Date() },
        $unset: { otp: '', otpExpiry: '' },
      },
    );

    // Notify admin about new doctor registration
    if (user.role === 'doctor') {
      const admin = await db.collection<UserDoc>('users').findOne({ role: 'admin' });
      if (admin) {
        await db.collection('notifications').insertOne({
          userId: admin._id!.toString(),
          title: 'New doctor registration',
          body: `Dr. ${user.name} (${user.email}) is waiting for approval.`,
          type: 'system',
          read: false,
          link: '/dashboard/admin?tab=users',
          createdAt: new Date(),
        });
      }
      return NextResponse.json({
        message: 'Email verified! Your account is pending admin approval. You will be notified by email.',
        status: 'pending_approval',
      });
    }

    return NextResponse.json({ message: 'Email verified! You can now log in.', status: 'active' });
  } catch (e: any) {
    console.error('[verify-otp]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
