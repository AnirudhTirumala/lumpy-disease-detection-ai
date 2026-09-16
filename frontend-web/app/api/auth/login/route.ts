import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session';
import type { UserDoc, AuthUser } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password)
      return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserDoc>('users').findOne({ email: email.toLowerCase().trim() });

    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

    if (user.status === 'pending_otp')
      return NextResponse.json({ error: 'Please verify your email OTP first.' }, { status: 403 });
    if (user.status === 'pending_approval')
      return NextResponse.json({ error: 'Your doctor account is awaiting admin approval.' }, { status: 403 });
    if (user.status === 'rejected')
      return NextResponse.json({ error: 'Your account application was rejected. Contact support.' }, { status: 403 });
    if (user.status === 'removed' || user.status === 'deleted')
      return NextResponse.json({ error: 'This account has been suspended. Contact cow@lumpy.ai for help.' }, { status: 403 });

    const authUser: AuthUser = {
      id: user._id!.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImageUrl: user.profileImageFileId ? `/api/images/${user.profileImageFileId}` : undefined,
      location: user.location,
      specialization: user.specialization,
    };

    // Issue a signed session cookie. This — not the response body — is what
    // every other API route will trust to know who is making the request.
    const token = createSessionToken({
      userId: authUser.id,
      role: authUser.role,
      email: authUser.email,
    });

    const response = NextResponse.json({ user: authUser });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,          // not readable from client-side JS (blocks XSS token theft)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',         // blocks most CSRF vectors
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (e: any) {
    console.error('[login]', e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
