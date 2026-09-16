'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, CheckCircle, Upload, X } from 'lucide-react';

type Step = 'form' | 'otp' | 'done';
type Role = 'user' | 'doctor';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [role, setRole] = useState<Role>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [location, setLocation] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const profileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  function handleProfileImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileImage(f);
    setProfilePreview(URL.createObjectURL(f));
  }

  function handleDocs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setDocFiles(prev => [...prev, ...files].slice(0, 5)); // max 5 docs
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);

    try {
      // First register (text data)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, location, specialization, licenseNumber, qualifications }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      // Upload profile image + docs if doctor
      if (role === 'doctor' && (profileImage || docFiles.length > 0)) {
        const fd = new FormData();
        fd.append('email', email);
        if (profileImage) fd.append('profileImage', profileImage);
        docFiles.forEach(f => fd.append('docs', f));
        await fetch('/api/auth/upload-docs', { method: 'POST', body: fd });
      }

      setPendingEmail(email);
      setStep('otp');
    } catch { setError('Server error. Try again.'); }
    finally { setLoading(false); }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep('done');
    } catch { setError('Server error. Try again.'); }
    finally { setLoading(false); }
  }

  async function handleResendOTP() {
    setResendLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOtp('');
    } catch { setError('Failed to resend. Try again.'); }
    finally { setResendLoading(false); }
  }

  const BG = (
    <>
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/login-bg.jpg')" }}>
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <Link href="/"
        className="fixed top-5 left-5 z-20 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
        ← Home
      </Link>
    </>
  );

  if (step === 'done') return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {BG}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-8 text-white backdrop-blur-md text-center space-y-4">
        <Image src="/logo.png" alt="LumpyAI" width={60} height={60} className="mx-auto object-contain" />
        <CheckCircle className="w-14 h-14 text-green-400 mx-auto" />
        <h2 className="text-xl font-bold">{role === 'doctor' ? 'Registration Submitted!' : 'Email Verified!'}</h2>
        <p className="text-sm text-white/70">
          {role === 'doctor'
            ? 'Your account is pending admin approval. You will receive an email once approved.'
            : 'Your account is ready. You can now log in.'}
        </p>
        <button onClick={() => router.push('/login')}
          className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-white/90 transition-colors">
          Go to Login
        </button>
      </div>
    </div>
  );

  if (step === 'otp') return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {BG}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-8 text-white backdrop-blur-md">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="LumpyAI" width={50} height={50} className="mb-3 object-contain" />
          <h2 className="text-xl font-bold">Verify your email</h2>
          <p className="text-sm text-white/70 mt-1 text-center">
            We sent a 6-digit code to <span className="font-semibold text-white">{pendingEmail}</span>
          </p>
        </div>
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit OTP" maxLength={6}
            className="w-full text-center text-3xl font-bold tracking-[0.5em] bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50" />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={otp.length !== 6 || loading}
            className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Verify OTP
          </button>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { setStep('form'); setOtp(''); }}
              className="text-sm text-white/60 hover:text-white">← Back</button>
            <button type="button" onClick={handleResendOTP} disabled={resendLoading}
              className="text-sm text-white/60 hover:text-white flex items-center gap-1">
              {resendLoading && <Loader2 className="w-3 h-3 animate-spin" />} Resend OTP
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      {BG}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-8 text-white backdrop-blur-md">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="LumpyAI" width={60} height={60} className="mb-3 object-contain" />
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm text-white/70 mt-1">Join LumpyAI to protect your cattle</p>
        </div>

        <div className="flex bg-white/10 rounded-xl p-1 mb-6">
          {(['user', 'doctor'] as Role[]).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                role === r ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
              }`}>
              {r === 'user' ? '👨‍🌾 Farmer' : '👨‍⚕️ Veterinarian'}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          {/* Profile image */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer" onClick={() => profileRef.current?.click()}>
              {profilePreview ? <img src={profilePreview} className="w-full h-full object-cover" alt="" /> : <span className="text-2xl">📷</span>}
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60">Profile Photo</p>
              <button type="button" onClick={() => profileRef.current?.click()} className="text-xs text-white hover:underline">Upload photo</button>
            </div>
            <input ref={profileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImage} />
          </div>

          {[
            { label: 'Full Name', value: name, onChange: setName, placeholder: 'Your full name', required: true },
            { label: 'Email', value: email, onChange: setEmail, placeholder: 'you@email.com', type: 'email', required: true },
            { label: 'Location (village / district)', value: location, onChange: setLocation, placeholder: 'e.g. Guntur, Andhra Pradesh' },
          ].map(({ label, value, onChange, placeholder, type, required }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-white/60 mb-1 block">{label}</label>
              <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)}
                required={required} placeholder={placeholder}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50" />
            </div>
          ))}

          {role === 'doctor' && (
            <>
              {[
                { label: 'Specialization *', value: specialization, onChange: setSpecialization, placeholder: 'e.g. Bovine Medicine', required: true },
                { label: 'License Number *', value: licenseNumber, onChange: setLicenseNumber, placeholder: 'VET-XXXXX', required: true },
                { label: 'Qualifications', value: qualifications, onChange: setQualifications, placeholder: 'e.g. BVSc, MVSc' },
              ].map(({ label, value, onChange, placeholder, required }) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-white/60 mb-1 block">{label}</label>
                  <input value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1 block">Upload Documents (license, degree, etc.)</label>
                <div onClick={() => docRef.current?.click()}
                  className="border border-dashed border-white/20 rounded-xl px-4 py-3 cursor-pointer hover:border-white/40 transition-colors">
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <Upload className="w-4 h-4" />
                    <span>Click to upload (max 5 files)</span>
                  </div>
                  {docFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {docFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-white/80">
                          <span className="truncate">{f.name}</span>
                          <button type="button" onClick={e => { e.stopPropagation(); setDocFiles(prev => prev.filter((_, j) => j !== i)); }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input ref={docRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocs} />
              </div>
              <p className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                ⚠️ Doctor accounts require admin approval after email verification.
              </p>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-white/60 mb-1 block">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/60 mb-1 block">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Re-enter password"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50" />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-white hover:bg-white/90 text-gray-900 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Sending OTP...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-center text-white/60 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-white font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
