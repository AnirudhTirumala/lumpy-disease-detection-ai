'use client';
import { useState } from 'react';
import { Cpu, RefreshCw, Shield, CheckCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/DashButton';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface ModelRow {
  name: string;
  version: string;
  accuracy: string;
  status: 'Active' | 'Staging' | 'Archived';
  updated: string;
}

const INITIAL_MODELS: ModelRow[] = [
  { name: 'YOLO v26 — LSD Detect', version: 'v2.4.1', accuracy: '94.7%', status: 'Active', updated: '2026-05-30' },
  { name: 'YOLO v26 — Severity', version: 'v1.8.0', accuracy: '91.2%', status: 'Active', updated: '2026-04-12' },
  { name: 'YOLO v26 — LSD Detect', version: 'v2.5.0', accuracy: '96.1%', status: 'Staging', updated: '2026-06-10' },
];

const PERMISSIONS = [
  { perm: 'Upload Images', farmer: true, doctor: true, admin: true },
  { perm: 'View Own Reports', farmer: true, doctor: true, admin: true },
  { perm: 'View All Reports', farmer: false, doctor: true, admin: true },
  { perm: 'Submit Analysis', farmer: false, doctor: true, admin: true },
  { perm: 'Manage Users', farmer: false, doctor: false, admin: true },
  { perm: 'Deploy AI Models', farmer: false, doctor: false, admin: true },
  { perm: 'View Analytics', farmer: false, doctor: true, admin: true },
  { perm: 'Export Data', farmer: false, doctor: true, admin: true },
];

export default function ModelRegistry() {
  const [models, setModels] = useState<ModelRow[]>(INITIAL_MODELS);
  const [deployOpen, setDeployOpen] = useState(false);
  const [detail, setDetail] = useState<ModelRow | null>(null);
  const { push } = useToast();

  function handlePromote(version: string) {
    setModels((prev) =>
      prev.map((m) => {
        if (m.version === version) return { ...m, status: 'Active' };
        if (m.status === 'Active') return { ...m, status: 'Archived' };
        return m;
      }),
    );
    push(`${version} promoted to production`);
  }

  function handleDeploy() {
    setDeployOpen(false);
    push('New model upload started — this can take a few minutes', 'info');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">AI Model Registry</h2>
        <Button size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => setDeployOpen(true)}>
          Deploy New
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {models.map((m, i) => (
          <Card key={i} padding="lg" accent={m.status === 'Active'} hoverable>
            <div className="flex items-center justify-between mb-4">
              <span className="w-9 h-9 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </span>
              <Badge tone={m.status === 'Active' ? 'ok' : m.status === 'Staging' ? 'warn' : 'neutral'}>{m.status}</Badge>
            </div>
            <h3 className="text-sm font-bold text-ink mb-1">{m.name}</h3>
            <p className="text-xs text-subink mb-4">{m.version} · Updated {m.updated}</p>
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-subink">Accuracy</span>
                <span className="font-mono text-accent-600">{m.accuracy}</span>
              </div>
              <div className="h-1.5 bg-hairline rounded-full overflow-hidden">
                <div className="h-full bg-accent-500 rounded-full" style={{ width: m.accuracy }} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setDetail(m)}>Details</Button>
              {m.status === 'Staging' && (
                <Button size="sm" className="flex-1" onClick={() => handlePromote(m.version)}>Promote</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-accent-600" />
          <h2 className="text-sm font-bold text-ink">Role Permissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline">
                {['Permission', 'Farmer', 'Veterinarian', 'Admin'].map((h) => (
                  <th key={h} className="text-left py-2 pr-6 text-gray-400 uppercase tracking-widest font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {PERMISSIONS.map((row) => (
                <tr key={row.perm} className="hover:bg-canvas transition-colors">
                  <td className="py-2.5 pr-6 text-subink">{row.perm}</td>
                  {[row.farmer, row.doctor, row.admin].map((v, i) => (
                    <td key={i} className="py-2.5 pr-6">
                      {v
                        ? <CheckCircle className="w-3.5 h-3.5 text-ok" />
                        : <span className="w-3.5 h-3.5 rounded-full border border-hairline inline-block" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        title="Deploy a new model"
        subtitle="Upload weights to stage a new model for review"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeployOpen(false)}>Cancel</Button>
            <Button onClick={handleDeploy}>Start upload</Button>
          </>
        }
      >
        <div className="border-2 border-dashed border-hairline rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-accent-600" />
          </div>
          <p className="text-sm font-medium text-ink">Drop model weights here, or click to browse</p>
          <p className="text-xs text-subink">Supports .pt, .onnx — staged automatically after upload</p>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        subtitle={detail ? `${detail.version} · ${detail.status}` : ''}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-subink">Accuracy</span><span className="font-mono text-ink">{detail.accuracy}</span></div>
            <div className="flex justify-between"><span className="text-subink">Last updated</span><span className="text-ink">{detail.updated}</span></div>
            <div className="flex justify-between"><span className="text-subink">Framework</span><span className="text-ink">YOLOv8 (Ultralytics)</span></div>
            <div className="flex justify-between"><span className="text-subink">Input size</span><span className="text-ink">640×640</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}