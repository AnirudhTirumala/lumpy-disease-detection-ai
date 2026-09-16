'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Eye, RefreshCw, Flag, MessageSquare, X, ZoomIn } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

interface CaseItem {
  id: string; farmer: string; farmerId: string; farmerLocation?: string;
  cattle: string; animalType: string; result: 'healthy' | 'lumpy';
  submitted: string; confidence: number; severity: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Under Review' | 'Reviewed' | 'Closed';
  doctorNotes?: string; flagged?: boolean; treatmentNotes?: string; imageUrl?: string;
}

const SEV_COLOR: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
};
const STATUS_COLOR: Record<string, string> = {
  'Pending':      'bg-yellow-100 text-yellow-700',
  'Under Review': 'bg-blue-100 text-blue-700',
  'Reviewed':     'bg-green-100 text-green-700',
  'Closed':       'bg-gray-100 text-gray-500',
};

type TabFilter = 'All' | 'Pending' | 'Under Review' | 'Reviewed' | 'Closed';

export default function CaseQueue() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [stats, setStats] = useState({ open: 0, underReview: 0, high: 0, resolved: 0 });
  const [filter, setFilter] = useState<TabFilter>('All');
  const [selected, setSelected] = useState<CaseItem | null>(null);
  const [notes, setNotes] = useState('');
  const [treatNotes, setTreatNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);
  const user = getStoredUser();

  function load() {
    fetch('/api/dashboard/doctor')
      .then(r => r.json())
      .then(d => {
        setCases(d.cases || []);
        setStats(d.stats || { open: 0, underReview: 0, high: 0, resolved: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  async function updateCase(id: string, updates: Record<string, any>) {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/doctor', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, doctorId: user?.id, ...updates }),
      });
      if (res.ok) {
        setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updates } : null);
        load(); // refresh stats
      }
    } finally { setSaving(false); }
  }

  function openCase(c: CaseItem) {
    setSelected(c);
    setNotes(c.doctorNotes || '');
    setTreatNotes(c.treatmentNotes || '');
  }

  const tabs: TabFilter[] = ['All', 'Pending', 'Under Review', 'Reviewed', 'Closed'];
  const filtered = filter === 'All' ? cases : cases.filter(c => c.status === filter);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.open, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', tab: 'Pending' },
          { label: 'Under Review', value: stats.underReview, icon: AlertTriangle, color: 'text-blue-500', bg: 'bg-blue-50', tab: 'Under Review' },
          { label: 'High Severity', value: stats.high, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', tab: 'All' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', tab: 'Reviewed' },
        ].map(({ label, value, icon: Icon, color, bg, tab }) => (
          <button key={label} onClick={() => setFilter(tab as TabFilter)}
            className={`${bg} border border-hairline rounded-2xl p-5 text-left hover:shadow-md transition-all`}>
            <Icon className={`w-6 h-6 ${color} mb-2`} />
            <p className="text-3xl font-bold text-ink">{value}</p>
            <p className="text-xs text-subink mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-paper border border-hairline rounded-2xl overflow-hidden shadow-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline flex-wrap gap-3">
          <h3 className="text-sm font-bold text-ink">
            {filter === 'All' ? `All Cases (${cases.length})` : `${filter} (${filtered.length})`}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} className="flex items-center gap-1.5 text-xs text-subink hover:text-ink px-3 py-1.5 border border-hairline rounded-xl">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {tabs.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === t ? 'bg-accent-500 text-white' : 'text-subink hover:text-ink border border-hairline'
                }`}>{t}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-sm text-subink py-10">Loading cases...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-ink">No {filter !== 'All' ? filter.toLowerCase() : ''} cases</p>
            <p className="text-xs text-subink mt-1">Cases appear when farmers scan their animals</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas/50">
                  {['#', 'Image', 'Farmer', 'Animal', 'Result', 'Conf.', 'Severity', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-canvas transition-colors ${c.flagged ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-4 py-3 text-xs text-subink">{i + 1}</td>
                    <td className="px-4 py-3">
                      {c.imageUrl
                        ? <img src={c.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform border border-hairline"
                            onClick={() => { openCase(c); setImgZoom(true); }} />
                        : <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center text-xl">🐄</div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink text-xs">{c.farmer}</p>
                      {c.farmerLocation && <p className="text-[10px] text-subink">{c.farmerLocation}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-ink">{c.cattle}</p>
                      <p className="text-[10px] text-subink">{c.animalType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        c.result === 'lumpy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>{c.result === 'lumpy' ? '⚠️ Lumpy' : '✅ Healthy'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-accent-600">{c.confidence}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SEV_COLOR[c.severity]}`}>{c.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                      {c.flagged && <span className="ml-1 text-orange-500">🚩</span>}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-subink whitespace-nowrap">
                      {new Date(c.submitted).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openCase(c)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-semibold transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-paper rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-hairline sticky top-0 bg-paper z-10">
              <div>
                <h3 className="font-bold text-ink">Case Details</h3>
                <p className="text-xs text-subink mt-0.5">{selected.farmer} · {selected.cattle} ({selected.animalType})</p>
              </div>
              <button onClick={() => { setSelected(null); setImgZoom(false); }}
                className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-subink hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image */}
              {selected.imageUrl && (
                <div>
                  <p className="text-xs font-semibold text-subink mb-2">Uploaded Image (click to zoom)</p>
                  <img src={selected.imageUrl} alt="Scan"
                    className="w-full max-h-56 object-contain rounded-2xl bg-canvas cursor-zoom-in hover:opacity-90 border border-hairline transition-opacity"
                    onClick={() => setImgZoom(true)} />
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Farmer', value: selected.farmer },
                  { label: 'Location', value: selected.farmerLocation || '—' },
                  { label: 'Animal', value: `${selected.cattle} (${selected.animalType})` },
                  { label: 'AI Result', value: selected.result === 'lumpy' ? '⚠️ Lumpy' : '✅ Healthy' },
                  { label: 'Confidence', value: `${selected.confidence}%` },
                  { label: 'Severity', value: selected.severity },
                  { label: 'Status', value: selected.status },
                  { label: 'Submitted', value: new Date(selected.submitted).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-canvas rounded-xl p-3">
                    <p className="text-[10px] text-subink uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-ink mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Doctor review notes */}
              <div>
                <label className="text-xs font-semibold text-subink mb-2 block">Review Notes (sent to farmer)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Write your diagnosis and recommendations for the farmer..."
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent-500 resize-none transition-colors" />
              </div>

              {/* Treatment notes (for Under Review) */}
              <div>
                <label className="text-xs font-semibold text-subink mb-2 block">Treatment Notes (internal)</label>
                <textarea value={treatNotes} onChange={e => setTreatNotes(e.target.value)} rows={2}
                  placeholder="Treatment plan, medication, follow-up schedule..."
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm text-ink bg-canvas focus:outline-none focus:border-accent-500 resize-none transition-colors" />
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-subink uppercase tracking-wider">Actions</p>

                {/* Flag toggle */}
                <button
                  onClick={() => updateCase(selected.id, { flagged: !selected.flagged })}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    selected.flagged
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-orange-300 text-orange-600 hover:bg-orange-50'
                  }`}>
                  <Flag className="w-4 h-4" />
                  {selected.flagged ? '🚩 Flagged — Click to unflag' : 'Flag for later review'}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  {/* Under Review */}
                  {selected.status !== 'Under Review' && selected.status !== 'Closed' && (
                    <button
                      onClick={() => updateCase(selected.id, {
                        status: 'Under Review',
                        doctorNotes: notes || selected.doctorNotes,
                        treatmentNotes: treatNotes,
                      })}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                      🔄 Under Review
                    </button>
                  )}

                  {/* Mark Reviewed */}
                  {selected.status !== 'Reviewed' && selected.status !== 'Closed' && (
                    <button
                      onClick={() => {
                        updateCase(selected.id, {
                          status: 'Reviewed',
                          doctorNotes: notes,
                          treatmentNotes: treatNotes,
                        });
                        setSelected(null);
                      }}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" /> Mark Reviewed
                    </button>
                  )}

                  {/* Close Case */}
                  {selected.status !== 'Closed' && (
                    <button
                      onClick={() => {
                        updateCase(selected.id, {
                          status: 'Closed',
                          doctorNotes: notes || selected.doctorNotes,
                          treatmentNotes: treatNotes,
                        });
                        setSelected(null);
                      }}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                      🔒 Close Case
                    </button>
                  )}

                  {/* Save notes only */}
                  <button
                    onClick={() => updateCase(selected.id, { doctorNotes: notes, treatmentNotes: treatNotes })}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-accent-400 text-accent-600 hover:bg-accent-50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                    <MessageSquare className="w-4 h-4" /> Save Notes
                  </button>
                </div>
              </div>

              {/* Existing notes display */}
              {selected.doctorNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Last Review Notes</p>
                  <p className="text-sm text-blue-800">{selected.doctorNotes}</p>
                </div>
              )}
              {selected.treatmentNotes && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Treatment Notes</p>
                  <p className="text-sm text-purple-800">{selected.treatmentNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image zoom modal */}
      {imgZoom && selected?.imageUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] cursor-zoom-out"
          onClick={() => setImgZoom(false)}>
          <img src={selected.imageUrl} alt="Scan zoom"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
