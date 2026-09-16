'use client';
import { useState, useEffect } from 'react';
import { Users, Stethoscope, ScanLine, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface Stats {
  totalUsers: number; totalScans: number; totalDetections: number; pendingDoctors: number;
  monthly: { month: string; scans: number; detections: number }[];
}
interface Doctor {
  id: string; name: string; email: string; status: string;
  specialization?: string; licenseNumber?: string; createdAt: string;
}
interface UserRow {
  id: string; name: string; email: string; role: string; status: string; createdAt: string;
}

type AdminTab = 'overview' | 'doctors' | 'users';

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, doctorsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/approve'),
        fetch('/api/users'),
      ]);
      const [statsData, doctorsData, usersData] = await Promise.all([
        statsRes.json(), doctorsRes.json(), usersRes.json(),
      ]);
      setStats(statsData);
      setDoctors(doctorsData.doctors || []);
      setUsers(usersData.users || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleApprove(doctorId: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, action }),
    });
    setDoctors(prev => prev.map(d => d.id === doctorId
      ? { ...d, status: action === 'approve' ? 'active' : 'rejected' } : d));
    if (stats) setStats({ ...stats, pendingDoctors: Math.max(0, stats.pendingDoctors - 1) });
  }

  const TABS = [
    { key: 'overview' as AdminTab, label: 'Overview', icon: ScanLine },
    { key: 'doctors' as AdminTab, label: `Doctor Approvals${stats?.pendingDoctors ? ` (${stats.pendingDoctors})` : ''}`, icon: Stethoscope },
    { key: 'users' as AdminTab, label: 'All Users', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-canvas rounded-2xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === key ? 'bg-paper shadow text-ink' : 'text-subink hover:text-ink'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={loadAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-subink hover:text-ink">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
              { label: 'Total Scans', value: stats.totalScans, icon: ScanLine, color: 'text-purple-500' },
              { label: 'Lumpy Detected', value: stats.totalDetections, icon: AlertTriangle, color: 'text-red-500' },
              { label: 'Pending Approval', value: stats.pendingDoctors, icon: Clock, color: 'text-yellow-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-paper border border-hairline rounded-2xl p-5 flex items-center gap-4">
                <Icon className={`w-7 h-7 ${color} shrink-0`} />
                <div>
                  <p className="text-3xl font-bold text-ink">{value}</p>
                  <p className="text-xs text-subink">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          {stats.monthly.length > 0 && (
            <div className="bg-paper border border-hairline rounded-2xl p-6">
              <h3 className="text-sm font-bold text-ink mb-4">Monthly Activity</h3>
              <div className="space-y-3">
                {stats.monthly.map(m => (
                  <div key={m.month} className="flex items-center gap-4">
                    <span className="text-xs text-subink w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 flex gap-2 items-center">
                      <div className="flex-1 bg-canvas rounded-full h-2 relative">
                        <div className="h-2 bg-accent-400 rounded-full"
                          style={{ width: `${stats.totalScans > 0 ? (m.scans / stats.totalScans) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-subink w-16 text-right">{m.scans} scans</span>
                    </div>
                    <div className="flex-1 flex gap-2 items-center">
                      <div className="flex-1 bg-canvas rounded-full h-2">
                        <div className="h-2 bg-red-400 rounded-full"
                          style={{ width: `${stats.totalDetections > 0 ? (m.detections / stats.totalDetections) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-red-500 w-20 text-right">{m.detections} lumpy</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Doctor approvals */}
      {tab === 'doctors' && (
        <div className="bg-paper border border-hairline rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-hairline">
            <h3 className="text-sm font-bold text-ink">Doctor Registration Requests</h3>
          </div>
          <div className="divide-y divide-hairline">
            {doctors.length === 0 && (
              <p className="text-sm text-subink text-center py-10">No doctor registrations yet.</p>
            )}
            {doctors.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center text-sm font-bold text-accent-600 shrink-0">
                  {d.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">Dr. {d.name}</p>
                  <p className="text-xs text-subink">{d.email}</p>
                  {d.specialization && <p className="text-xs text-subink">{d.specialization} · {d.licenseNumber}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.status === 'pending_approval' ? (
                    <>
                      <button onClick={() => handleApprove(d.id, 'approve')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleApprove(d.id, 'reject')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.status === 'active' ? '✓ Approved' : '✗ Rejected'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All users */}
      {tab === 'users' && (
        <div className="bg-paper border border-hairline rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-hairline">
            <h3 className="text-sm font-bold text-ink">All Users ({users.length})</h3>
          </div>
          <div className="divide-y divide-hairline">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-canvas flex items-center justify-center text-sm font-bold text-subink shrink-0">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-subink">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                  u.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                  u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                }`}>{u.role}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  u.status === 'active' ? 'bg-green-100 text-green-700' :
                  u.status === 'pending_otp' ? 'bg-yellow-100 text-yellow-700' :
                  u.status === 'pending_approval' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>{u.status.replace('_', ' ')}</span>
                <span className="text-xs text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
