'use client';
import { useState } from 'react';
import { User, Bell, Lock, Save } from 'lucide-react';
import Card from '@/components/ui/Card';
import DashInput from '@/components/ui/DashInput';
import Button from '@/components/ui/DashButton';
import { useToast } from '@/components/ui/Toast';
import type { AuthUser } from '@/lib/auth';

export default function SettingsPanel({ user }: { user: AuthUser }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      push('Profile settings saved');
    }, 700);
  }

  function initials(n: string) {
    return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-accent-600" />
          <h2 className="text-sm font-bold text-ink">Profile</h2>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-100 flex items-center justify-center text-accent-700 font-bold text-lg">
            {initials(name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-subink capitalize">{user.role === 'user' ? 'Farmer' : user.role}</p>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <DashInput label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <DashInput label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-4 h-4 text-accent-600" />
          <h2 className="text-sm font-bold text-ink">Notification preferences</h2>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Email alerts"
            desc="Get notified by email when a scan result is ready"
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
          <ToggleRow
            label="SMS alerts"
            desc="Receive a text message for high-severity detections"
            checked={smsAlerts}
            onChange={setSmsAlerts}
          />
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-accent-600" />
          <h2 className="text-sm font-bold text-ink">Security</h2>
        </div>
        <div className="space-y-4">
          <DashInput label="Current password" type="password" placeholder="••••••••" />
          <DashInput label="New password" type="password" placeholder="••••••••" />
          <Button variant="secondary">Update password</Button>
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-subink mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-accent-500' : 'bg-gray-200'}`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}