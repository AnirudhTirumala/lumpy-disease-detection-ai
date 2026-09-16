'use client';
import { useState, useEffect } from 'react';
import { FileText, X, ZoomIn } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

interface Scan {
  id: string; cattleName: string; animalType: string; result: 'healthy' | 'lumpy';
  confidence: number; reviewedByDoctor: boolean; doctorNotes?: string;
  treatmentNotes?: string; imageUrl?: string; createdAt: string;
}

export default function Reports() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Scan | null>(null);
  const [imgZoom, setImgZoom] = useState(false);
  const user = getStoredUser();

  useEffect(() => {
    if (!user?.id) return;
    // Poll every 5s so doctor notes appear in real time
    function load() {
      fetch(`/api/scans?farmerId=${user!.id}`)
        .then(r => r.json())
        .then(d => setScans(d.scans || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [user?.id]);

  const reviewed = scans.filter(s => s.reviewedByDoctor);
  const pending  = scans.filter(s => !s.reviewedByDoctor);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-accent-600" />
        <h2 className="text-sm font-bold text-ink">My Reports ({scans.length} total)</h2>
        <span className="text-xs text-subink ml-2">· Auto-updates every 5s</span>
      </div>

      {/* Reviewed by doctor */}
      {reviewed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-subink uppercase tracking-wider mb-3">✅ Reviewed by Veterinarian ({reviewed.length})</h3>
          <div className="space-y-3">
            {reviewed.map((s, i) => (
              <div key={s.id}
                className="bg-paper border border-hairline rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelected(s); setImgZoom(false); }}>
                <div className="flex items-start gap-4">
                  {s.imageUrl
                    ? <img src={s.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-hairline shrink-0" />
                    : <div className="w-16 h-16 rounded-xl bg-canvas flex items-center justify-center text-3xl shrink-0">🐄</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-ink text-sm">{s.cattleName}</p>
                      <span className="text-xs text-subink">{s.animalType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        s.result === 'lumpy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>{s.result === 'lumpy' ? '⚠️ Lumpy' : '✅ Healthy'}</span>
                      <span className="text-xs font-mono text-accent-600">{s.confidence}%</span>
                    </div>
                    <p className="text-xs text-subink mt-1">{new Date(s.createdAt).toLocaleString()}</p>
                    {s.doctorNotes && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-blue-700 mb-0.5">Doctor's Review</p>
                        <p className="text-xs text-blue-800 line-clamp-2">{s.doctorNotes}</p>
                      </div>
                    )}
                    {s.treatmentNotes && (
                      <div className="mt-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-purple-700 mb-0.5">Treatment Plan</p>
                        <p className="text-xs text-purple-800 line-clamp-2">{s.treatmentNotes}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">✓ Reviewed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending review */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-subink uppercase tracking-wider mb-3">⏳ Pending Vet Review ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(s => (
              <div key={s.id}
                className="bg-paper border border-hairline rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => { setSelected(s); setImgZoom(false); }}>
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-hairline shrink-0" />
                  : <div className="w-12 h-12 rounded-xl bg-canvas flex items-center justify-center text-2xl shrink-0">🐄</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{s.cattleName} <span className="text-subink font-normal text-xs">({s.animalType})</span></p>
                  <p className="text-xs text-subink">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  s.result === 'lumpy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>{s.result === 'lumpy' ? '⚠️ Lumpy' : '✅ Healthy'}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-semibold shrink-0">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && scans.length === 0 && (
        <div className="text-center py-16 bg-paper border border-hairline rounded-2xl">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink">No reports yet</p>
          <p className="text-xs text-subink mt-1">Run a scan to generate your first report.</p>
        </div>
      )}

      {/* Detail modal */}
      {selected && !imgZoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setSelected(null)}>
          <div className="bg-paper rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-ink">Scan Report</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-subink hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="Scan"
                className="w-full max-h-48 object-contain rounded-xl bg-canvas cursor-zoom-in border border-hairline"
                onClick={() => setImgZoom(true)} />
            )}
            <div className="bg-canvas rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-subink">Animal</span><span className="font-semibold">{selected.cattleName} ({selected.animalType})</span></div>
              <div className="flex justify-between"><span className="text-subink">Date</span><span>{new Date(selected.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-subink">AI Result</span>
                <span className={`font-bold ${selected.result === 'lumpy' ? 'text-red-600' : 'text-green-600'}`}>
                  {selected.result === 'lumpy' ? '⚠️ Lumpy Detected' : '✅ Healthy'}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-subink">Confidence</span><span>{selected.confidence}%</span></div>
            </div>
            {selected.doctorNotes ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">🩺 Doctor's Review Notes</p>
                <p className="text-sm text-blue-800">{selected.doctorNotes}</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-yellow-700">⏳ Awaiting vet review. You will be notified when the doctor adds notes.</p>
              </div>
            )}
            {selected.treatmentNotes && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-700 mb-1">💊 Treatment Plan</p>
                <p className="text-sm text-purple-800">{selected.treatmentNotes}</p>
              </div>
            )}
            <button onClick={() => setSelected(null)}
              className="w-full py-2.5 border border-hairline rounded-xl text-sm text-subink hover:text-ink">Close</button>
          </div>
        </div>
      )}

      {/* Zoom */}
      {imgZoom && selected?.imageUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] cursor-zoom-out" onClick={() => setImgZoom(false)}>
          <img src={selected.imageUrl} alt="Zoom" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
