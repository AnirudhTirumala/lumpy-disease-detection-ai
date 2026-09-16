'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, FileText, UserX, AlertTriangle } from 'lucide-react';

interface UserRow {
  id: string; name: string; email: string; role: string; status?: string;
  location?: string; specialization?: string; licenseNumber?: string;
  qualifications?: string; profileImageUrl?: string;
  docUrls?: string[]; createdAt: string;
}

type Tab = 'all' | 'pending';

const STATUS_COLOR: Record<string, string> = {
  active:            'bg-green-100 text-green-700',
  pending_otp:       'bg-yellow-100 text-yellow-700',
  pending_approval:  'bg-orange-100 text-orange-700',
  rejected:          'bg-red-100 text-red-700',
  deleted:           'bg-gray-100 text-gray-400',
  removed:           'bg-gray-200 text-gray-500',
};
const ROLE_COLOR: Record<string, string> = {
  user:   'bg-gray-100 text-gray-600',
  doctor: 'bg-blue-100 text-blue-700',
  admin:  'bg-purple-100 text-purple-700',
};

function safeStatus(s?: string) {
  if (!s) return 'unknown';
  return s.replace(/_/g, ' ');
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);
  const [removing, setRemoving] = useState(false);

  function load() {
    setLoading(true);
    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsers((d.users || []).filter((u: any) => u.status !== 'removed')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);

  async function handleAction(doctorId: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, action }),
    });
    setUsers(prev => prev.map(u => u.id === doctorId
      ? { ...u, status: action === 'approve' ? 'active' : 'rejected' } : u));
    setSelected(null);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch('/api/admin/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: removeTarget.id, permanent: false }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== removeTarget.id));
        setRemoveTarget(null);
        setSelected(null);
      }
    } finally { setRemoving(false); }
  }

  const pending = users.filter(u => u.role === 'doctor' && u.status === 'pending_approval');
  const displayed = tab === 'pending' ? pending : users;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-canvas rounded-xl p-1">
          <button onClick={() => setTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'pending' ? 'bg-paper shadow text-ink' : 'text-subink hover:text-ink'
            }`}>
            Pending Approvals
            {pending.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pending.length}</span>
            )}
          </button>
          <button onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'all' ? 'bg-paper shadow text-ink' : 'text-subink hover:text-ink'
            }`}>
            All Users ({users.length})
          </button>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-subink hover:text-ink px-3 py-1.5 border border-hairline rounded-xl">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-paper border border-hairline rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-sm text-subink text-center py-10">Loading users...</p>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink">
              {tab === 'pending' ? 'No pending doctor approvals' : 'No users yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {displayed.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-canvas transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center text-sm font-bold text-accent-600 shrink-0 overflow-hidden">
                  {u.profileImageUrl
                    ? <img src={u.profileImageUrl} className="w-full h-full object-cover" alt="" />
                    : (u.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {u.role === 'doctor' ? `Dr. ${u.name}` : (u.name || 'Unknown')}
                  </p>
                  <p className="text-xs text-subink">{u.email}</p>
                  {u.specialization && <p className="text-xs text-subink">{u.specialization}</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                  {u.role}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLOR[u.status || ''] || 'bg-gray-100 text-gray-500'}`}>
                  {safeStatus(u.status)}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {u.role === 'doctor' && (
                    <button onClick={() => setSelected(u)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-hairline rounded-xl text-xs font-semibold text-subink hover:text-ink transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}
                  {u.status === 'pending_approval' && (
                    <>
                      <button onClick={() => handleAction(u.id, 'approve')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleAction(u.id, 'reject')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {/* ── Remove: available for ALL non-admin users regardless of status ── */}
                  {u.role !== 'admin' && (
                    <button onClick={() => setRemoveTarget(u)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors">
                      <UserX className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-paper rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Doctor Profile</h3>
              <button onClick={() => setSelected(null)} className="text-subink hover:text-ink text-xl">✕</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-accent-100 flex items-center justify-center text-xl font-bold text-accent-600 overflow-hidden">
                {selected.profileImageUrl
                  ? <img src={selected.profileImageUrl} className="w-full h-full object-cover" alt="" />
                  : (selected.name || '?')[0]}
              </div>
              <div>
                <p className="font-bold text-ink">Dr. {selected.name}</p>
                <p className="text-sm text-subink">{selected.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[selected.status || ''] || 'bg-gray-100'}`}>
                  {safeStatus(selected.status)}
                </span>
              </div>
            </div>
            <div className="bg-canvas rounded-xl p-4 space-y-2 text-sm">
              {selected.specialization && <div className="flex justify-between"><span className="text-subink">Specialization</span><span className="font-semibold">{selected.specialization}</span></div>}
              {selected.licenseNumber && <div className="flex justify-between"><span className="text-subink">License No.</span><span className="font-mono text-xs">{selected.licenseNumber}</span></div>}
              {selected.qualifications && <div className="flex justify-between"><span className="text-subink">Qualifications</span><span className="font-semibold">{selected.qualifications}</span></div>}
              {selected.location && <div className="flex justify-between"><span className="text-subink">Location</span><span>{selected.location}</span></div>}
              {selected.createdAt && <div className="flex justify-between"><span className="text-subink">Registered</span><span>{new Date(selected.createdAt).toLocaleDateString()}</span></div>}
            </div>
            {selected.docUrls && selected.docUrls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-subink mb-2">Uploaded Documents</p>
                <div className="grid grid-cols-2 gap-2">
                  {selected.docUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-canvas border border-hairline rounded-xl text-xs text-accent-600 hover:bg-accent-50 transition-colors">
                      <FileText className="w-3.5 h-3.5" /> Document {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {selected.status === 'pending_approval' && (
              <div className="flex gap-3">
                <button onClick={() => handleAction(selected.id, 'reject')}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleAction(selected.id, 'approve')}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  <CheckCircle className="w-4 h-4" /> Approve Access
                </button>
              </div>
            )}
            {/* Remove button inside modal for ALL statuses */}
            <button onClick={() => setRemoveTarget(selected)}
              className="w-full py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <UserX className="w-4 h-4" /> Remove This Doctor
            </button>
            <button onClick={() => setSelected(null)}
              className="w-full py-2 border border-hairline rounded-xl text-sm text-subink hover:text-ink">Close</button>
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-paper rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Remove {removeTarget.role === 'doctor' ? 'Doctor' : 'User'}
                </h3>
                <p className="text-xs text-subink mt-0.5">{removeTarget.name} ({removeTarget.email})</p>
              </div>
            </div>
            <p className="text-xs text-subink bg-canvas rounded-xl p-3">
              This will suspend their account. They won't be able to log in, but their data is retained. Contact <strong>cow@lumpy.ai</strong> if you need to reverse this.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveTarget(null)}
                className="flex-1 py-2.5 border border-hairline rounded-xl text-sm text-subink hover:text-ink">
                Cancel
              </button>
              <button onClick={handleRemove} disabled={removing}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
                {removing ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
