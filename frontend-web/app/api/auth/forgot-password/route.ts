import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/mongodb';
import { sendPasswordResetEmail } from '@/lib/email';
import type { UserDoc } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email)
      return NextResponse.json({ error: 'Email required.' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.collection<UserDoc>('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() } },
    );

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, user.name, resetUrl);

    return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (e: any) {
    console.error('[forgot-password]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
