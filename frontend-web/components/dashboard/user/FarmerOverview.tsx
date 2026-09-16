'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, CheckCircle, AlertTriangle,
  Activity, ShieldCheck, Clock, ScanLine, RotateCcw, Zap,
} from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

type AnimalType = 'Cow' | 'Buffalo' | 'Bull' | 'Calf' | 'Jersey Cow' | 'Heifer' | 'Ox';
const ANIMAL_TYPES: AnimalType[] = ['Cow', 'Buffalo', 'Bull', 'Calf', 'Jersey Cow', 'Heifer', 'Ox'];
const ANIMAL_EMOJI: Record<AnimalType, string> = {
  'Cow': '🐄', 'Buffalo': '🐃', 'Bull': '🐂', 'Calf': '🐮',
  'Jersey Cow': '🐄', 'Heifer': '🐄', 'Ox': '🐂',
};

interface Cattle { id: string; name: string; animalType: AnimalType; }
interface Stats { totalScans: number; healthy: number; alerts: number; pending: number; }
type Step = 1 | 2 | 3 | 4;

export default function FarmerOverview() {
  const [step, setStep] = useState<Step>(1);
  const [stats, setStats] = useState<Stats>({ totalScans: 0, healthy: 0, alerts: 0, pending: 0 });
  const [cattle, setCattle] = useState<Cattle[]>([]);
  const [selectedType, setSelectedType] = useState<AnimalType | null>(null);
  const [selectedCattle, setSelectedCattle] = useState<Cattle | null>(null);
  const [captureMode, setCaptureMode] = useState<'upload' | 'camera' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ label: string; confidence: number } | null>(null);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/scans?farmerId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        const s = d.scans || [];
        setStats({
          totalScans: s.length,
          healthy: s.filter((x: any) => x.result === 'healthy').length,
          alerts: s.filter((x: any) => x.result === 'lumpy').length,
          pending: s.filter((x: any) => !x.reviewedByDoctor).length,
        });
      });
    fetch(`/api/cattle?farmerId=${user.id}`)
      .then(r => r.json())
      .then(d => setCattle(d.cattle || []));
  }, [user?.id]);

  async function startCamera() {
    setError(''); setCameraReady(false); setCaptureMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      // Wait for DOM update then attach stream
      setTimeout(() => {
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.onloadedmetadata = () => {
            v.play().catch(console.error).finally(() => setCameraReady(true));
          };
        }
      }, 150);
    } catch {
      setError('Camera access denied. Please allow camera in browser settings.');
      setCaptureMode(null);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setCameraReady(false);
  }

  function capturePhoto() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      setImageFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
      setPreview(URL.createObjectURL(blob));
      stopCamera(); setCaptureMode(null);
    }, 'image/jpeg', 0.95);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setCaptureMode(null); // important: clear capture mode so scan button shows
  }

  async function runScan() {
    if (!imageFile || !selectedCattle || !user?.id) { setError('Please select an animal and image first.'); return; }
    setScanning(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      fd.append('farmerId', user.id);
      fd.append('cattleId', selectedCattle.id);
      fd.append('cattleName', selectedCattle.name);
      fd.append('animalType', selectedCattle.animalType);

      const res = await fetch('/api/dashboard/user', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Scan failed'); return; }

      const top = data.predictions?.[0];
      if (!top) { setError('No prediction returned.'); return; }
      setResult(top); setStep(4);

      const isLumpy = top.label === 'lumpy';
      setStats(prev => ({
        totalScans: prev.totalScans + 1,
        healthy: prev.healthy + (isLumpy ? 0 : 1),
        alerts: prev.alerts + (isLumpy ? 1 : 0),
        pending: prev.pending + 1, // all go to doctor review
      }));
    } catch (e: any) { setError(e.message || 'Scan failed.'); }
    finally { setScanning(false); }
  }

  function reset() {
    setStep(1); setSelectedType(null); setSelectedCattle(null);
    setCaptureMode(null); setPreview(null); setImageFile(null);
    setResult(null); setError(''); stopCamera();
  }

  const filteredCattle = cattle.filter(c => !selectedType || c.animalType === selectedType);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: stats.totalScans, icon: Activity, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Healthy', value: stats.healthy, icon: ShieldCheck, gradient: 'from-green-500 to-emerald-600' },
          { label: 'Lumpy Detected', value: stats.alerts, icon: AlertTriangle, gradient: 'from-red-500 to-rose-600' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, gradient: 'from-amber-500 to-orange-500' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
            <Icon className="w-6 h-6 mb-3 opacity-80" />
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs opacity-80 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Wizard */}
      <div className="bg-paper border border-hairline rounded-3xl overflow-hidden shadow-card">
        {/* Steps */}
        <div className="flex border-b border-hairline">
          {[
            { n: 1, label: 'Animal Type' },
            { n: 2, label: 'Select Animal' },
            { n: 3, label: 'Capture Image' },
            { n: 4, label: 'AI Result' },
          ].map(({ n, label }) => (
            <div key={n} className={`flex-1 py-3.5 text-center text-xs font-semibold transition-all ${
              step === n ? 'bg-accent-500 text-white' :
              step > n ? 'bg-green-500 text-white' : 'text-subink bg-canvas/50'
            }`}>
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-1.5 ${
                step === n ? 'bg-white/30' : step > n ? 'bg-white/30' : 'bg-gray-200 text-gray-500'
              }`}>{step > n ? '✓' : n}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div className="p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h3 className="text-base font-bold text-ink mb-1">Select animal type</h3>
              <p className="text-xs text-subink mb-5">Choose what kind of cattle to scan</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {ANIMAL_TYPES.map(type => (
                  <button key={type} onClick={() => { setSelectedType(type); setStep(2); }}
                    className="group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-hairline hover:border-accent-400 hover:bg-accent-50 transition-all active:scale-95">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{ANIMAL_EMOJI[type]}</span>
                    <span className="text-xs font-semibold text-ink">{type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-ink">Select animal to scan</h3>
                  <p className="text-xs text-subink mt-0.5">{ANIMAL_EMOJI[selectedType!]} {selectedType} · {filteredCattle.length} registered</p>
                </div>
                <button onClick={() => setStep(1)} className="text-xs text-accent-600 hover:underline">← Back</button>
              </div>
              {filteredCattle.length === 0 ? (
                <div className="text-center py-12 bg-canvas rounded-2xl">
                  <p className="text-4xl mb-2">{ANIMAL_EMOJI[selectedType!]}</p>
                  <p className="text-sm font-semibold text-ink">No {selectedType} registered</p>
                  <p className="text-xs text-subink mt-1">Add animals in "My Cattle" tab first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredCattle.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCattle(c); setStep(3); }}
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 border-hairline hover:border-accent-400 hover:bg-accent-50 transition-all text-left">
                      <span className="text-2xl">{ANIMAL_EMOJI[c.animalType]}</span>
                      <div>
                        <p className="text-sm font-bold text-ink">{c.name}</p>
                        <p className="text-xs text-subink">{c.animalType}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-ink">Capture or upload image</h3>
                  <p className="text-xs text-subink mt-0.5">
                    Scanning: {ANIMAL_EMOJI[selectedCattle!.animalType]} <strong>{selectedCattle!.name}</strong>
                  </p>
                </div>
                <button onClick={() => { setStep(2); setPreview(null); setImageFile(null); stopCamera(); setCaptureMode(null); }}
                  className="text-xs text-accent-600 hover:underline">← Back</button>
              </div>

              {/* Mode selector - shown when no image and no active camera */}
              {!preview && captureMode !== 'camera' && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setCaptureMode('upload'); setTimeout(() => fileRef.current?.click(), 50); }}
                    className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-hairline hover:border-accent-400 hover:bg-accent-50 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center group-hover:bg-accent-200 transition-colors">
                      <Upload className="w-7 h-7 text-accent-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-ink">Upload Image</p>
                      <p className="text-xs text-subink mt-0.5">JPG, PNG, WEBP</p>
                    </div>
                  </button>
                  <button onClick={startCamera}
                    className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-hairline hover:border-green-400 hover:bg-green-50 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Camera className="w-7 h-7 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-ink">Live Camera</p>
                      <p className="text-xs text-subink mt-0.5">Capture now</p>
                    </div>
                  </button>
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {/* Live camera */}
              {captureMode === 'camera' && !preview && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="text-white text-center space-y-2">
                          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}
                    {cameraReady && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-white/70 rounded-tl-lg" />
                        <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-white/70 rounded-tr-lg" />
                        <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-white/70 rounded-bl-lg" />
                        <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-white/70 rounded-br-lg" />
                        <p className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                          Position animal in frame
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { stopCamera(); setCaptureMode(null); }}
                      className="flex-1 py-3 border-2 border-hairline rounded-xl text-sm font-semibold text-subink hover:text-ink transition-colors">
                      Cancel
                    </button>
                    <button onClick={capturePhoto} disabled={!cameraReady}
                      className="flex-1 py-3 bg-accent-500 hover:bg-accent-600 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      <Camera className="w-5 h-5" /> Capture Photo
                    </button>
                  </div>
                </div>
              )}

              {/* ── Preview + SCAN BUTTON ─────────────────────────────────── */}
              {preview && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-canvas rounded-2xl" />
                    <button
                      onClick={() => { setPreview(null); setImageFile(null); setCaptureMode(null); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-sm transition-colors">
                      ✕
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}

                  {/* SCAN BUTTON — always visible when preview exists */}
                  <button
                    onClick={runScan}
                    disabled={scanning}
                    className="w-full py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg">
                    {scanning
                      ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing with AI...</>
                      : <><ScanLine className="w-5 h-5" /> Run AI Scan</>
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Result */}
          {step === 4 && result && (
            <div className="space-y-5 text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mx-auto shadow-lg ${
                result.label === 'lumpy' ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {result.label === 'lumpy'
                  ? <AlertTriangle className="w-12 h-12 text-red-500" />
                  : <CheckCircle className="w-12 h-12 text-green-500" />}
              </div>

              <div>
                <h3 className={`text-2xl font-bold ${result.label === 'lumpy' ? 'text-red-600' : 'text-green-600'}`}>
                  {result.label === 'lumpy' ? '⚠️ Lumpy Skin Detected' : '✅ Appears Healthy'}
                </h3>
                <p className="text-subink text-sm mt-1">
                  {ANIMAL_EMOJI[selectedCattle!.animalType]} {selectedCattle!.name} · {selectedCattle!.animalType}
                </p>
              </div>

              <div className="bg-canvas rounded-2xl p-5 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-ink">AI Confidence</span>
                  <span className={`text-3xl font-bold ${result.label === 'lumpy' ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      result.label === 'lumpy'
                        ? 'bg-gradient-to-r from-red-400 to-red-600'
                        : 'bg-gradient-to-r from-green-400 to-green-600'
                    }`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-subink mt-2">
                  {result.label === 'lumpy'
                    ? '⚠️ Case sent to doctor queue for review.'
                    : '✅ Sent to vet for confirmation. Regular monitoring recommended.'}
                </p>
              </div>

              {preview && <img src={preview} alt="Scanned" className="w-full max-h-36 object-contain rounded-xl bg-canvas" />}

              <button onClick={reset}
                className="w-full py-3 border-2 border-accent-500 text-accent-600 hover:bg-accent-50 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Scan Another Animal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
