'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, AlertTriangle, ScanLine, RotateCcw } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

type AnimalType = 'Cow' | 'Buffalo' | 'Bull' | 'Calf' | 'Jersey Cow' | 'Heifer' | 'Ox';
const ANIMAL_TYPES: AnimalType[] = ['Cow', 'Buffalo', 'Bull', 'Calf', 'Jersey Cow', 'Heifer', 'Ox'];
const ANIMAL_EMOJI: Record<AnimalType, string> = {
  'Cow': '🐄', 'Buffalo': '🐃', 'Bull': '🐂', 'Calf': '🐮', 'Jersey Cow': '🐄', 'Heifer': '🐄', 'Ox': '🐂',
};

export default function ScanTool() {
  const [animalName, setAnimalName] = useState('');
  const [animalType, setAnimalType] = useState<AnimalType>('Cow');
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

  async function startCamera() {
    setError(''); setCameraReady(false); setCaptureMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setTimeout(() => {
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.onloadedmetadata = () => v.play().catch(console.error).finally(() => setCameraReady(true));
        }
      }, 150);
    } catch { setError('Camera access denied.'); setCaptureMode(null); }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setCameraReady(false);
  }

  function capturePhoto() {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
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
    setImageFile(file); setPreview(URL.createObjectURL(file)); setCaptureMode(null);
  }

  async function runScan() {
    if (!imageFile) { setError('Upload or capture an image first.'); return; }
    if (!animalName.trim()) { setError('Enter the animal name.'); return; }
    setScanning(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      // Doctor/Admin scans ARE saved — pass a synthetic farmerId = own id, cattleId = generated
      if (user?.id) {
        fd.append('farmerId', user.id);   // tagged under their own account
        fd.append('cattleId', `staff-${Date.now()}`);
        fd.append('cattleName', animalName.trim());
        fd.append('animalType', animalType);
      }
      const res = await fetch('/api/dashboard/user', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Scan failed'); return; }
      setResult(data.predictions?.[0] || null);
    } catch (e: any) { setError(e.message || 'Scan failed.'); }
    finally { setScanning(false); }
  }

  function reset() {
    setCaptureMode(null); setPreview(null); setImageFile(null);
    setResult(null); setError(''); setAnimalName(''); stopCamera();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-accent-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">AI Lumpy Skin Scanner</h3>
            <p className="text-xs text-subink">Scan results are saved to your records and visible to the doctor team</p>
          </div>
        </div>

        {/* Animal info — required before scan */}
        {!result && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-subink mb-1 block">Animal Type</label>
              <select value={animalType} onChange={e => setAnimalType(e.target.value as AnimalType)}
                className="w-full border border-hairline rounded-xl px-3 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500">
                {ANIMAL_TYPES.map(t => <option key={t} value={t}>{ANIMAL_EMOJI[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-subink mb-1 block">Animal Name / Tag</label>
              <input value={animalName} onChange={e => setAnimalName(e.target.value)}
                placeholder="e.g. Field Sample 1"
                className="w-full border border-hairline rounded-xl px-3 py-2.5 bg-canvas text-sm text-ink focus:outline-none focus:border-accent-500" />
            </div>
          </div>
        )}

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
            </div>
            <div className="flex gap-3">
              <button onClick={() => { stopCamera(); setCaptureMode(null); }}
                className="flex-1 py-3 border-2 border-hairline rounded-xl text-sm font-semibold text-subink hover:text-ink">Cancel</button>
              <button onClick={capturePhoto} disabled={!cameraReady}
                className="flex-1 py-3 bg-accent-500 hover:bg-accent-600 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" /> Capture
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full max-h-56 object-contain bg-canvas rounded-2xl" />
              <button onClick={reset}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-sm">✕</button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            {!result && (
              <button onClick={runScan} disabled={scanning}
                className="w-full py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all">
                {scanning
                  ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing...</>
                  : <><ScanLine className="w-5 h-5" /> Run AI Scan</>}
              </button>
            )}
          </div>
        )}

        {result && (
          <div className={`rounded-2xl p-5 border-2 ${result.label === 'lumpy' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              {result.label === 'lumpy' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <CheckCircle className="w-8 h-8 text-green-500" />}
              <div>
                <p className={`text-lg font-bold ${result.label === 'lumpy' ? 'text-red-700' : 'text-green-700'}`}>
                  {result.label === 'lumpy' ? '⚠️ Lumpy Skin Detected' : '✅ No Lumpy Skin Detected'}
                </p>
                <p className="text-sm text-subink">Confidence: {Math.round(result.confidence * 100)}% · Saved to scan records</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${result.label === 'lumpy' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.round(result.confidence * 100)}%` }} />
            </div>
            <button onClick={reset}
              className="mt-4 w-full py-2.5 border border-hairline rounded-xl text-sm font-semibold text-subink hover:text-ink flex items-center justify-center gap-2 transition-colors">
              <RotateCcw className="w-4 h-4" /> Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
