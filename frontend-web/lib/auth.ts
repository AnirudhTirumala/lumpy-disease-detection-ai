// lib/auth.ts
export type { Role, AuthUser } from './types';

export async function signIn(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Login failed' };
  // Note: localStorage here is only for showing the name/role instantly in the UI.
  // It is NOT what the server trusts — the httpOnly session cookie set by
  // /api/auth/login is the actual source of truth for every API route.
  if (typeof window !== 'undefined') {
    localStorage.setItem('lumpy_user', JSON.stringify(data.user));
  }
  return { user: data.user };
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('lumpy_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lumpy_user', JSON.stringify(user));
  }
}

export async function signOut() {
  // Clear the real server-side session first, then the local UI copy.
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Even if this fails (e.g. offline), still clear local state below.
  }
  if (typeof window !== 'undefined') localStorage.removeItem('lumpy_user');
}

export function dashboardPath(role: string) {
  return `/dashboard/${role}`;
}
