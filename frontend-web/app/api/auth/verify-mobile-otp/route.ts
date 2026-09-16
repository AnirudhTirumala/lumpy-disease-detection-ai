// app/api/auth/verify-mobile-otp/route.ts
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { otp } = await request.json();
    if (!otp) return NextResponse.json({ error: 'otp required.' }, { status: 400 });

    const userId = session.userId; // always your own account

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (user.phoneOtp !== otp) return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
    if (!user.phoneOtpExpiry || new Date() > user.phoneOtpExpiry)
      return NextResponse.json({ error: 'OTP expired. Click Resend.' }, { status: 400 });

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: { phoneVerified: true, updatedAt: new Date() },
        $unset: { phoneOtp: '', phoneOtpExpiry: '' },
      },
    );

    return NextResponse.json({ message: 'Phone verified successfully!' });
  } catch (e: any) {
    console.error('[verify-mobile-otp]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
