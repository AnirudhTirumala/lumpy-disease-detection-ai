// lib/requireAuth.ts
// Call one of these at the top of every API route that needs a logged-in user.
//
// Usage:
//   const session = requireAuth();
//   if (session instanceof NextResponse) return session; // not logged in -> 401
//   // session.userId / session.role / session.email are now trustworthy
//
//   const session = requireRole('admin');
//   if (session instanceof NextResponse) return session; // not logged in, or wrong role

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME, SessionPayload, Role } from './session';

export function getSession(): SessionPayload | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function requireAuth(): SessionPayload | NextResponse {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  return session;
}

export function requireRole(role: Role | Role[]): SessionPayload | NextResponse {
  const session = requireAuth();
  if (session instanceof NextResponse) return session;

  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden. You do not have access to this resource.' }, { status: 403 });
  }
  return session;
}
