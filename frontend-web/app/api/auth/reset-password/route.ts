import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import type { UserDoc } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password)
      return NextResponse.json({ error: 'Token and new password required.' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);
    await db.collection<UserDoc>('users').updateOne(
      { _id: user._id },
      {
        $set: { passwordHash, updatedAt: new Date() },
        $unset: { resetToken: '', resetTokenExpiry: '' },
      },
    );

    return NextResponse.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (e: any) {
    console.error('[reset-password]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
