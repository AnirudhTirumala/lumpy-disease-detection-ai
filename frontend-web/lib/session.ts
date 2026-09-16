// lib/session.ts
// Signs and verifies session tokens using HMAC-SHA256. No external deps.
// The token format is: base64url(payload) + "." + base64url(signature)
// This is intentionally simple (similar shape to a JWT) rather than pulling
// in a new dependency for something this small.

import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error(
    'SESSION_SECRET is not set. Add SESSION_SECRET=<a long random string> to .env.local'
  );
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = 'user' | 'doctor' | 'admin';

export interface SessionPayload {
  userId: string;
  role: Role;
  email: string;
  iat: number; // issued-at, unix seconds
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET as string).update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'iat'>): string {
  const full: SessionPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  const expectedSignature = sign(body);

  // Constant-time comparison to avoid timing attacks.
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < 0) return null; // expired or tampered clock
    if (!payload.userId || !payload.role || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'lumpy_session';
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
