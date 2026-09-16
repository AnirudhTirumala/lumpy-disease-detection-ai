'use client';
import { useState, useEffect } from 'react';
import { Search, X, ZoomIn } from 'lucide-react';

interface ScanRow {
  id: string; farmerId: string; cattleName: string; animalType: string;
  result: 'healthy' | 'lumpy'; confidence: number; reviewedByDoctor: boolean;
  doctorNotes?: string; imageUrl?: string; createdAt: string; farmerName?: string;
}

export default function PatientRecords() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ScanRow | null>(null);
  const [imgZoom, setImgZoom] = useState(false);

  useEffect(() => {
    fetch('/api/scans?all=1')
      .then(r => r.json())
      .then(async d => {
        const rows = d.scans || [];
        // Enrich with farmer names
        const enriched = await Promise.all(rows.map(async (s: any) => {
          try {
            const res = await fetch(`/api/users?role=user`);
            const data = await res.json();
            const farmer = (data.users || []).find((u: any) => u.id === s.farmerId);
            return { ...s, farmerName: farmer?.name || 'Unknown Farmer' };
          } catch { return { ...s, farmerName: 'Unknown Farmer' }; }
        }));
        setScans(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? scans.filter(s =>
        s.cattleName?.toLowerCase().includes(query.toLowerCase()) ||
        s.animalType?.toLowerCase().includes(query.toLowerCase()) ||
        s.result?.includes(query.toLowerCase()) ||
        s.farmerName?.toLowerCase().includes(query.toLowerCase())
      )
    : scans;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subink" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by farmer, animal or result..."
            className="w-full pl-9 pr-4 py-2.5 bg-canvas border border-hairline rounded-xl text-sm text-ink focus:outline-none focus:border-accent-500 transition-colors" />
        </div>
        <span className="text-xs text-subink">{filtered.length} records</span>
      </div>

      <div className="bg-paper border border-hairline rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-canvas/50">
                {['S.No', 'Image', 'Farmer', 'Animal', 'Date & Time', 'AI Result', 'Accuracy', 'Vet Review', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading && (
                <tr><td colSpan={9} className="text-center text-sm text-subink py-10">Loading records...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-sm text-subink py-10">No records found</td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-canvas transition-colors">
                  <td className="px-4 py-3 text-xs text-subink font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    {s.imageUrl
                      ? <img src={s.imageUrl} alt=""
                          className="w-10 h-10 rounded-lg object-cover cursor-zoom-in hover:scale-110 transition-transform border border-hairline"
                          onClick={() => { setSelected(s); setImgZoom(true); }} />
                      : <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center text-xl">🐄</div>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-ink">{s.farmerName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-ink">{s.cattleName}</p>
                    <p className="text-[10px] text-subink">{s.animalType}</p>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-subink whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      s.result === 'lumpy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>{s.result === 'lumpy' ? '⚠️ Lumpy' : '✅ Healthy'}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-accent-600">{s.confidence}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      s.reviewedByDoctor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>{s.reviewedByDoctor ? '✓ Reviewed' : 'Pending'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelected(s); setImgZoom(false); }}
                      className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-xs font-semibold transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && !imgZoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-paper rounded-2xl shadow-2xl w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-ink">Scan Record</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-subink hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="Scan"
                className="w-full max-h-48 object-contain rounded-xl bg-canvas cursor-zoom-in"
                onClick={() => setImgZoom(true)} />
            )}
            <div className="bg-canvas rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-subink">Farmer</span><span className="font-semibold">{selected.farmerName}</span></div>
              <div className="flex justify-between"><span className="text-subink">Animal</span><span className="font-semibold">{selected.cattleName} ({selected.animalType})</span></div>
              <div className="flex justify-between"><span className="text-subink">Date</span><span>{new Date(selected.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-subink">AI Result</span>
                <span className={`font-bold ${selected.result === 'lumpy' ? 'text-red-600' : 'text-green-600'}`}>
                  {selected.result === 'lumpy' ? '⚠️ Lumpy' : '✅ Healthy'}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-subink">Accuracy</span><span className="font-semibold">{selected.confidence}%</span></div>
              <div className="flex justify-between"><span className="text-subink">Vet Review</span>
                <span className={selected.reviewedByDoctor ? 'text-blue-600 font-semibold' : 'text-subink'}>
                  {selected.reviewedByDoctor ? '✓ Reviewed' : 'Pending'}
                </span>
              </div>
            </div>
            {selected.doctorNotes && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">Doctor Notes</p>
                <p className="text-sm text-blue-800">{selected.doctorNotes}</p>
              </div>
            )}
            <button onClick={() => setSelected(null)}
              className="w-full py-2 border border-hairline rounded-xl text-sm text-subink hover:text-ink">Close</button>
          </div>
        </div>
      )}

      {/* Zoom modal */}
      {imgZoom && selected?.imageUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] cursor-zoom-out"
          onClick={() => setImgZoom(false)}>
          <img src={selected.imageUrl} alt="Zoom"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
