'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
    } catch { setError('Server error.'); }
    finally { setLoading(false); }
  }

  const BG = (
    <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/login-bg.jpg')" }}>
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );

  if (!token) return (
    <div className="relative min-h-screen flex items-center justify-center">{BG}
      <p className="relative z-10 text-red-300">Invalid reset link.</p>
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {BG}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-8 text-white backdrop-blur-md">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="LumpyAI" width={60} height={60} className="mb-3 object-contain" />
          {done ? (
            <>
              <CheckCircle className="w-14 h-14 text-green-400 mb-3" />
              <h2 className="text-xl font-bold">Password Reset!</h2>
              <p className="text-sm text-white/70 mt-2 text-center">You can now log in with your new password.</p>
              <button onClick={() => router.push('/login')}
                className="mt-5 w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-white/90 transition-colors">
                Go to Login
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Set new password</h2>
              <p className="text-sm text-white/70 mt-1">Enter and confirm your new password</p>
            </>
          )}
        </div>

        {!done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1 block">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50" />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/60 mb-1 block">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Re-enter password"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50" />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
