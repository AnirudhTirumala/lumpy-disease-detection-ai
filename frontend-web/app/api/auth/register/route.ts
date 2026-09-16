import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { sendOTPEmail } from '@/lib/email';
import type { UserDoc } from '@/lib/types';

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const { name, email, password, role, specialization, licenseNumber, location } = await request.json();

    if (!name || !email || !password || !role)
      return NextResponse.json({ error: 'Name, email, password and role are required.' }, { status: 400 });

    if (role === 'admin')
      return NextResponse.json({ error: 'Admin accounts cannot be self-registered.' }, { status: 403 });

    const db = await getDb();
    const existing = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    // Farmers get pending_otp; doctors get pending_otp first, then pending_approval after OTP
    const doc: UserDoc = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      status: 'pending_otp',
      otp,
      otpExpiry,
      location,
      specialization,
      licenseNumber,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<UserDoc>('users').insertOne(doc);
    await sendOTPEmail(email, name, otp);

    return NextResponse.json({
      message: 'OTP sent to your email. Please verify to continue.',
      email,
      role,
    }, { status: 201 });
  } catch (e: any) {
    console.error('[register]', e);
    return NextResponse.json({ error: 'Server error. Check email configuration.' }, { status: 500 });
  }
}
