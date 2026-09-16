// app/api/auth/send-mobile-otp/route.ts
// Uses fast2sms (free India SMS) — sign up at fast2sms.com and get API key
// Add to .env.local:  FAST2SMS_API_KEY=your_key_here

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/requireAuth';

function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function POST(request: Request) {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'phone required.' }, { status: 400 });

    // Always the logged-in user's own account — never a client-supplied id.
    const userId = session.userId;

    const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    if (cleanPhone.length !== 10)
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { phone: cleanPhone, phoneOtp: otp, phoneOtpExpiry: otpExpiry, updatedAt: new Date() } },
    );

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (apiKey) {
      try {
        await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: `Your LumpyAI verification code is ${otp}. Valid for 10 minutes. Do not share.`,
            language: 'english',
            flash: 0,
            numbers: cleanPhone,
          }),
        });
      } catch (smsErr) {
        console.error('[SMS send error]', smsErr);
      }
    } else {
      console.log(`[DEV] Mobile OTP for ${cleanPhone}: ${otp}`);
    }

    // Never echo the OTP back in the response in production — only useful
    // for local development when no SMS key is configured.
    const devHint = process.env.NODE_ENV !== 'production' && !apiKey ? ` (dev mode, no SMS key: OTP is ${otp})` : '';

    return NextResponse.json({
      message: apiKey ? `OTP sent to +91 ${cleanPhone}` : `Check server console for OTP.${devHint}`,
    });
  } catch (e: any) {
    console.error('[send-mobile-otp]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
