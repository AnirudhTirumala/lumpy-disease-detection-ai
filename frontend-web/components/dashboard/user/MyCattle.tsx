'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

type AnimalType = 'Cow' | 'Buffalo' | 'Bull' | 'Calf' | 'Heifer' | 'Ox';
const ANIMAL_TYPES: AnimalType[] = ['Cow', 'Buffalo', 'Bull', 'Calf', 'Heifer', 'Ox'];

const ANIMAL_EMOJI: Record<AnimalType, string> = {
  Cow: '🐄', Buffalo: '🐃', Bull: '🐂', Calf: '🐮', Heifer: '🐄', Ox: '🐂',
};

const STATUS_COLORS = {
  healthy: 'bg-green-100 text-green-700',
  lumpy: 'bg-red-100 text-red-700',
  unscanned: 'bg-gray-100 text-gray-500',
};
const STATUS_LABELS = { healthy: 'Healthy', lumpy: 'Needs attention', unscanned: 'Not scanned' };

interface Cattle {
  id: string; name: string; animalType: AnimalType; age: number;
  lastStatus: 'healthy' | 'lumpy' | 'unscanned'; lastScanDate?: string;
}

export default function MyCattle() {
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [animalType, setAnimalType] = useState<AnimalType>('Cow');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const user = getStoredUser();

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/cattle?farmerId=${user.id}`)
      .then(r => r.json())
      .then(d => setCattle(d.cattle || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user?.id) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/cattle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: user.id, name: name.trim(), animalType, age: Number(age) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setCattle(prev => [data.cattle, ...prev]);
      setShowModal(false); setName(''); setAge(''); setAnimalType('Cow');
    } catch { setError('Failed to add. Try again.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this animal?')) return;
    await fetch(`/api/cattle?id=${id}`, { method: 'DELETE' });
    setCattle(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink">{cattle.length} animals in your herd</h2>
          <p className="text-xs text-subink mt-0.5">Track health and scan each animal individually</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add animal
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-subink py-10 text-center">Loading your herd...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cattle.map(c => (
            <div key={c.id} className="bg-paper border border-hairline rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{ANIMAL_EMOJI[c.animalType]}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[c.lastStatus]}`}>
                    {STATUS_LABELS[c.lastStatus]}
                  </span>
                  <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-bold text-ink">{c.name}</p>
              <p className="text-xs text-subink mt-0.5">{c.animalType} · {c.age} {c.age === 1 ? 'year' : 'years'} old</p>
              {c.lastScanDate && (
                <p className="text-[10px] text-gray-400 mt-2">
                  Last scanned {new Date(c.lastScanDate).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
          {cattle.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <p className="text-4xl mb-3">🐄</p>
              <p className="text-sm text-subink">No animals yet. Click "Add animal" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-paper rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-ink mb-4">Add new animal</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-subink mb-1 block">Animal name</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="e.g. My Cow, Lakshmi, etc."
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-subink mb-1 block">Animal type</label>
                <select value={animalType} onChange={e => setAnimalType(e.target.value as AnimalType)}
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500">
                  {ANIMAL_TYPES.map(t => <option key={t} value={t}>{ANIMAL_EMOJI[t]} {t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-subink mb-1 block">Age (years)</label>
                <input type="number" min={0} value={age} onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-hairline rounded-xl text-sm font-semibold text-subink hover:text-ink transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                  {saving ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
