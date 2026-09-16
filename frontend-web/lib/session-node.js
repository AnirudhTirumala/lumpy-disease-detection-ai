// lib/session-node.js
// Plain CommonJS copy of the verification half of lib/session.ts, used only
// by server.js (which runs directly under Node, outside Next.js's
// TypeScript build step, so it can't `require()` a .ts file).
//
// IMPORTANT: if you ever change the signing logic in lib/session.ts, mirror
// the change here too — these two files must stay in sync since they
// verify the same token format.

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error('SESSION_SECRET is not set. Add it to .env.local before starting the server.');
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days — must match lib/session.ts

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  const expectedSignature = sign(body);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < 0) return null;
    if (!payload.userId || !payload.role || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { verifySessionToken };
