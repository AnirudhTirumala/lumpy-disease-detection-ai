'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, X, Info, Lightbulb, Phone } from 'lucide-react';
import { signIn, dashboardPath, type Role } from '@/lib/auth';

type Panel = 'about' | 'tips' | 'contact' | null;

const TIPS = [
  { emoji: '🌅', tip: 'Scan cattle in natural daylight for best AI accuracy.' },
  { emoji: '📸', tip: 'Capture the entire body — especially neck, back, and flanks.' },
  { emoji: '🔍', tip: 'Multiple scans over several days improves detection reliability.' },
  { emoji: '🚫', tip: 'Isolate suspected cattle immediately to prevent herd spread.' },
  { emoji: '💧', tip: 'Lumpy skin spreads through insects — use repellent on your herd.' },
  { emoji: '📋', tip: 'Always consult your vet after a positive AI detection.' },
  { emoji: '⚡', tip: 'Early detection saves lives — scan weekly during outbreak season.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const roles: { id: Role; label: string; emoji: string }[] = [
    { id: 'user', label: 'Farmer', emoji: '👨‍🌾' },
    { id: 'doctor', label: 'Vet', emoji: '👨‍⚕️' },
    { id: 'admin', label: 'Admin', emoji: '🛡️' },
  ];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await signIn(email, password);
      if ('error' in result) { setError(result.error); return; }
      if (result.user.role !== role) {
        setError(`This account is a "${result.user.role}" — please select the correct tab.`);
        return;
      }
      router.push(dashboardPath(result.user.role));
    } finally { setLoading(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setForgotLoading(true); setForgotMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotMsg((await res.json()).message || 'Reset link sent!');
    } catch { setForgotMsg('Server error.'); }
    finally { setForgotLoading(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Return to the public landing page without starting the login flow. */}
      <Link href="/"
        className="absolute top-5 left-5 z-20 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
        ← Home
      </Link>

      {/* Floating action buttons — top right */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        {([
          { id: 'about' as Panel, icon: Info, label: 'About' },
          { id: 'tips' as Panel, icon: Lightbulb, label: 'Tips' },
          { id: 'contact' as Panel, icon: Phone, label: 'Contact' },
        ]).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setPanel(panel === id ? null : id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold backdrop-blur-md border transition-all ${
              panel === id
                ? 'bg-white text-gray-900 border-white'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Floating panels */}
      {panel && (
        <div className="absolute top-16 right-5 z-20 w-80 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl text-white shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm capitalize">{panel}</h3>
            <button onClick={() => setPanel(null)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          {panel === 'about' && (
            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo.png" alt="LumpyAI" width={40} height={40} className="rounded-xl" />
                <div>
                  <p className="font-bold text-white">LumpyAI</p>
                  <p className="text-xs text-white/50">AI-Powered Cattle Health</p>
                </div>
              </div>
              <p>LumpyAI uses a YOLO deep learning model trained on thousands of cattle images to detect Lumpy Skin Disease early — before it spreads.</p>
              <p>Farmers upload a photo, our AI analyses it in seconds, and if lumpy skin is detected, a case is automatically sent to a registered veterinarian for review.</p>
              <div className="bg-white/10 rounded-xl p-3 mt-2">
                <p className="text-xs font-semibold text-white mb-1">How it works</p>
                <ol className="text-xs text-white/70 space-y-1 list-decimal pl-4">
                  <li>Register and add your cattle</li>
                  <li>Upload or capture a photo of an animal</li>
                  <li>AI analyses within seconds</li>
                  <li>Doctor reviews flagged cases</li>
                  <li>Get treatment advice via chat</li>
                </ol>
              </div>
            </div>
          )}

          {panel === 'tips' && (
            <div className="space-y-2.5">
              {TIPS.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                  <span className="text-base shrink-0">{t.emoji}</span>
                  <p>{t.tip}</p>
                </div>
              ))}
            </div>
          )}

          {panel === 'contact' && (
            <div className="space-y-3 text-sm text-white/80">
              <p>Need help? Reach out to our support team:</p>
              <div className="space-y-2">
                <a href="tel:+919999999999"
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors">
                  <Phone className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-white/50">Phone</p>
                    <p className="font-semibold text-white">+91 99999 99999</p>
                  </div>
                </a>
                <a href="mailto:cow@lumpy.ai"
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors">
                  <span className="text-lg">✉️</span>
                  <div>
                    <p className="text-xs text-white/50">Email</p>
                    <p className="font-semibold text-white">cow@lumpy.ai</p>
                  </div>
                </a>
              </div>
              <p className="text-xs text-white/40">Support hours: Mon–Sat, 9am–6pm IST</p>
            </div>
          )}
        </div>
      )}

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-3xl border border-white/10 bg-black/35 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <Image src="/logo.png" alt="LumpyAI" width={72} height={72} className="mb-3 object-contain rounded-2xl" />
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-white/60 mt-1">Sign in to LumpyAI</p>
          </div>

          {showForgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <h2 className="text-base font-bold text-white">Forgot password</h2>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                placeholder="your@email.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/50" />
              {forgotMsg && <p className="text-sm text-green-300">{forgotMsg}</p>}
              <button type="submit" disabled={forgotLoading}
                className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
                {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />} Send reset link
              </button>
              <button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-white/50 hover:text-white">← Back</button>
            </form>
          ) : (
            <>
              {/* Role tabs */}
              <div className="flex bg-white/10 rounded-2xl p-1 mb-6 gap-1">
                {roles.map(r => (
                  <button key={r.id} onClick={() => { setRole(r.id); setError(''); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      role === r.id ? 'bg-white text-gray-900 shadow-md' : 'text-white/70 hover:text-white'
                    }`}>
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/50 mb-1 block">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@email.com" autoComplete="email"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/50 mb-1 block">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      required placeholder="••••••••" autoComplete="current-password"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/60 pr-10 transition-colors" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-white/50 hover:text-white transition-colors">Forgot password?</button>
                </div>
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-red-300">{error}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-lg">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
              <p className="text-sm text-center text-white/50 mt-5">
                Don't have an account?{' '}
                <Link href="/register" className="text-white font-semibold hover:underline">Create one</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
