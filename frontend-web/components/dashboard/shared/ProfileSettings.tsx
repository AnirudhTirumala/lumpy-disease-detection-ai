'use client';
import { useState, useRef } from 'react';
import { Camera, Loader2, CheckCircle, Trash2, AlertTriangle, Phone, Shield } from 'lucide-react';
import { getStoredUser, setStoredUser, signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function ProfileSettings() {
  const router = useRouter();
  const user = getStoredUser();
  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [specialization, setSpecialization] = useState(user?.specialization || '');
  const [preview, setPreview] = useState<string | null>(user?.profileImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Phone verification
  const [phone, setPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp' | 'done'>('input');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneMsg, setPhoneMsg] = useState('');

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      // No need to send userId anymore — the server reads it from the
      // logged-in session cookie, so you can no longer accidentally (or
      // maliciously) edit someone else's profile from this form.
      const fd = new FormData();
      fd.append('name', name);
      fd.append('location', location);
      if (user?.role === 'doctor') fd.append('specialization', specialization);
      if (imageFile) fd.append('profileImage', imageFile);
      const res = await fetch('/api/users', { method: 'PATCH', body: fd });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error); return; }
      setStoredUser({ ...user, ...data.user });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setSaveError('Save failed.'); }
    finally { setSaving(false); }
  }

  async function sendPhoneOtp() {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) { setPhoneError('Enter a valid 10-digit number.'); return; }
    setPhoneSending(true); setPhoneError('');
    try {
      const res = await fetch('/api/auth/send-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }), // userId now comes from the session
      });
      const data = await res.json();
      if (!res.ok) { setPhoneError(data.error); return; }
      setPhoneMsg(data.message);
      setPhoneStep('otp');
    } catch { setPhoneError('Failed to send OTP.'); }
    finally { setPhoneSending(false); }
  }

  async function verifyPhoneOtp() {
    setPhoneVerifying(true); setPhoneError('');
    try {
      const res = await fetch('/api/auth/verify-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: phoneOtp }), // userId now comes from the session
      });
      const data = await res.json();
      if (!res.ok) { setPhoneError(data.error); return; }
      setPhoneStep('done');
      setPhoneMsg('Phone number verified! ✅');
    } catch { setPhoneError('Verification failed.'); }
    finally { setPhoneVerifying(false); }
  }

  async function sendDeleteOtp() {
    setSendingOtp(true); setDeleteError('');
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error); return; }
      setOtpSent(true);
    } catch { setDeleteError('Failed to send OTP.'); }
    finally { setSendingOtp(false); }
  }

  async function handleDelete() {
    if (!deleteOtp) return;
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: deleteOtp }), // userId now comes from the session
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error); return; }
      // signOut() is now async — it clears the real server session before
      // clearing the local copy, so we await it before navigating away.
      await signOut();
      router.push('/login');
    } catch { setDeleteError('Failed.'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Profile */}
      <div className="bg-paper border border-hairline rounded-2xl p-7 shadow-card">
        <h2 className="text-base font-bold text-ink mb-5">Profile Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-accent-100 flex items-center justify-center border-2 border-accent-200">
                {preview
                  ? <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-accent-500">{user?.name?.[0]?.toUpperCase()}</span>
                }
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent-500 hover:bg-accent-600 text-white rounded-full flex items-center justify-center shadow transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </div>
            <div>
              <p className="font-bold text-ink">{user?.name}</p>
              <p className="text-xs text-subink capitalize">{user?.role}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-accent-600 hover:underline mt-0.5">Change photo</button>
            </div>
          </div>

          {[
            { label: 'Full Name', value: name, onChange: setName, required: true },
            { label: 'Location', value: location, onChange: setLocation, placeholder: 'Village / District / State' },
          ].map(({ label, value, onChange, placeholder, required }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-subink mb-1 block">{label}</label>
              <input value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
                className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-colors" />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-subink mb-1 block">Email</label>
            <input value={user?.email} disabled
              className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas/50 text-sm text-subink cursor-not-allowed" />
          </div>

          {user?.role === 'doctor' && (
            <div>
              <label className="text-xs font-semibold text-subink mb-1 block">Specialization</label>
              <input value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Bovine Medicine"
                className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-colors" />
            </div>
          )}

          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved && <CheckCircle className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Phone verification */}
      <div className="bg-paper border border-hairline rounded-2xl p-7 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <Phone className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Mobile Number Verification</h3>
            <p className="text-xs text-subink">Required for alerts and account security</p>
          </div>
        </div>

        {phoneStep === 'done' ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">Phone verified!</p>
              <p className="text-xs text-green-600">+91 {phone}</p>
            </div>
          </div>
        ) : phoneStep === 'input' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-canvas border border-hairline rounded-xl text-sm font-semibold text-subink">+91</div>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number" maxLength={10}
                className="flex-1 border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-colors" />
            </div>
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
            <button onClick={sendPhoneOtp} disabled={phoneSending || phone.length !== 10}
              className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              {phoneSending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send OTP
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-subink">{phoneMsg}</p>
            <input value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP" maxLength={6}
              className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 text-center text-xl font-bold tracking-[0.4em] transition-colors" />
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setPhoneStep('input'); setPhoneOtp(''); setPhoneError(''); }}
                className="flex-1 py-2.5 border border-hairline rounded-xl text-sm text-subink hover:text-ink transition-colors">← Back</button>
              <button onClick={sendPhoneOtp} disabled={phoneSending}
                className="flex-1 py-2.5 border border-hairline rounded-xl text-sm text-subink hover:text-ink transition-colors">
                {phoneSending ? 'Sending...' : 'Resend OTP'}
              </button>
              <button onClick={verifyPhoneOtp} disabled={phoneOtp.length !== 6 || phoneVerifying}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                {phoneVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Verify
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone - delete */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-xs text-red-600 mb-4">Deleting your account is irreversible. Your scan data is retained per medical records policy.</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        ) : !otpSent ? (
          <div className="space-y-3">
            <p className="text-xs text-red-600 bg-white rounded-xl p-3 border border-red-200">
              We'll send an OTP to <strong>{user?.email}</strong> to confirm deletion.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-hairline rounded-xl text-sm text-subink">Cancel</button>
              <button onClick={sendDeleteOtp} disabled={sendingOtp}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                {sendingOtp && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send OTP
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input value={deleteOtp} onChange={e => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP from email" maxLength={6}
              className="w-full border border-red-300 rounded-xl px-4 py-2.5 text-sm bg-white text-ink focus:outline-none focus:border-red-500 text-center tracking-[0.4em] font-bold text-lg" />
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowDelete(false); setOtpSent(false); setDeleteOtp(''); }}
                className="flex-1 py-2.5 border border-hairline rounded-xl text-sm text-subink">Cancel</button>
              <button onClick={handleDelete} disabled={deleteOtp.length !== 6 || deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
