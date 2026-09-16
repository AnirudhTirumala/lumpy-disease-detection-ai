import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendOTPEmail } from '@/lib/email';
import type { UserDoc } from '@/lib/types';

function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase().trim() });

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (user.status !== 'pending_otp') return NextResponse.json({ error: 'OTP already verified.' }, { status: 400 });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection<UserDoc>('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { otp, otpExpiry, updatedAt: new Date() } },
    );

    await sendOTPEmail(email, user.name, otp);
    return NextResponse.json({ message: 'OTP resent successfully.' });
  } catch (e: any) {
    console.error('[resend-otp]', e);
    return NextResponse.json({ error: 'Server error. Check email configuration.' }, { status: 500 });
  }
}
