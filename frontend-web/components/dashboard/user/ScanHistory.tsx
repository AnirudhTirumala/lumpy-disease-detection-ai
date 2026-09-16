'use client';
import { useState, useEffect } from 'react';
import { getStoredUser } from '@/lib/auth';

interface Scan {
  id: string; cattleName: string; animalType: string; result: 'healthy' | 'lumpy';
  confidence: number; reviewedByDoctor: boolean; imageUrl?: string; createdAt: string;
}

export default function ScanHistory() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'lumpy'>('all');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/scans?farmerId=${user.id}`)
      .then(r => r.json())
      .then(d => setScans(d.scans || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = filter === 'all' ? scans : scans.filter(s => s.result === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-bold text-ink">Scan History ({scans.length} total)</h2>
        <div className="flex gap-1 bg-canvas rounded-xl p-1">
          {(['all', 'healthy', 'lumpy'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-accent-500 text-white' : 'text-subink hover:text-ink'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-paper border border-hairline rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-hairline text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          <span className="col-span-1">Image</span>
          <span className="col-span-3">Animal</span>
          <span className="col-span-3">Date</span>
          <span className="col-span-2">Confidence</span>
          <span className="col-span-2">Result</span>
          <span className="col-span-1">Vet</span>
        </div>

        <div className="divide-y divide-hairline">
          {loading && <p className="text-center text-sm text-subink py-10">Loading scans...</p>}
          {!loading && filtered.map(s => (
            <div key={s.id} className="grid grid-cols-12 gap-2 items-center px-6 py-3 hover:bg-canvas transition-colors">
              <div className="col-span-1">
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" onClick={() => setPreviewImg(s.imageUrl!)}
                      className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform" />
                  : <div className="w-8 h-8 rounded-lg bg-canvas flex items-center justify-center text-lg">🐄</div>
                }
              </div>
              <div className="col-span-3">
                <p className="text-sm font-semibold text-ink">{s.cattleName}</p>
                <p className="text-xs text-subink">{s.animalType}</p>
              </div>
              <span className="col-span-3 text-xs text-subink">{new Date(s.createdAt).toLocaleString()}</span>
              <span className="col-span-2 font-mono text-xs text-accent-600">{s.confidence}%</span>
              <span className="col-span-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  s.result === 'lumpy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>{s.result === 'lumpy' ? 'Lumpy' : 'Healthy'}</span>
              </span>
              <span className="col-span-1">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  s.reviewedByDoctor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>{s.reviewedByDoctor ? '✓' : '…'}</span>
              </span>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-sm text-subink py-10">No scans found.</p>
          )}
        </div>
      </div>

      {/* Image preview modal */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer">
          <img src={previewImg} alt="Scan" className="max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
