'use client';
// OutbreakMap.tsx — real outbreak data from DB, rendered with Leaflet
// Install: npm install leaflet react-leaflet @types/leaflet
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, MapPin, RefreshCw } from 'lucide-react';

// Dynamically import map to avoid SSR issues
const MapWithNoSSR = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => (
  <div className="w-full h-[450px] bg-canvas rounded-2xl flex items-center justify-center">
    <p className="text-sm text-subink animate-pulse">Loading map...</p>
  </div>
)});

interface OutbreakPoint {
  lat: number; lng: number; farmerName: string; location: string;
  cattleName: string; animalType: string; confidence: number; date: string;
}

export default function OutbreakMap() {
  const [points, setPoints] = useState<OutbreakPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function loadData() {
    setLoading(true);
    try {
      // Get all lumpy scans with farmer location
      const res = await fetch('/api/scans?all=1');
      const data = await res.json();
      const lumpyScans = (data.scans || []).filter((s: any) => s.result === 'lumpy');

      // Get farmer locations
      const userRes = await fetch('/api/users?role=user&status=active');
      const userData = await userRes.json();
      const userMap = new Map((userData.users || []).map((u: any) => [u.id, u]));

      // Convert to map points — geocode location string to approximate lat/lng
      const pts: OutbreakPoint[] = [];
      for (const scan of lumpyScans) {
        const farmer = userMap.get(scan.farmerId) as any;
        if (!farmer?.location) continue;
        // Approximate lat/lng from India districts (real geocoding needs Google Maps API)
        const coords = approximateCoords(farmer.location);
        if (!coords) continue;
        pts.push({
          lat: coords.lat + (Math.random() - 0.5) * 0.05, // slight jitter so overlapping pins spread
          lng: coords.lng + (Math.random() - 0.5) * 0.05,
          farmerName: farmer.name,
          location: farmer.location,
          cattleName: scan.cattleName,
          animalType: scan.animalType,
          confidence: scan.confidence,
          date: scan.createdAt,
        });
      }
      setPoints(pts);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" /> Outbreak Map
          </h2>
          <p className="text-xs text-subink mt-0.5">
            {points.length} active outbreak{points.length !== 1 ? 's' : ''} detected ·
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-hairline rounded-xl text-xs font-semibold text-subink hover:text-ink transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {points.length === 0 && !loading && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-700">No outbreaks detected</p>
            <p className="text-xs text-green-600">All scanned animals appear healthy in the system.</p>
          </div>
        </div>
      )}

      <MapWithNoSSR points={points} />

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-subink">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" /> High confidence (&gt;85%)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-400" /> Medium (65–85%)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" /> Low (&lt;65%)
        </div>
      </div>
    </div>
  );
}

// Simple lookup table for major Indian districts → lat/lng
// For production: replace with Google Geocoding API
function approximateCoords(location: string): { lat: number; lng: number } | null {
  const loc = location.toLowerCase();
  const lookup: Record<string, [number, number]> = {
    'andhra pradesh': [15.9129, 79.7400], 'guntur': [16.3067, 80.4365],
    'anantapur': [14.6819, 77.6006], 'krishna': [16.6100, 80.6500],
    'telangana': [18.1124, 79.0193], 'hyderabad': [17.3850, 78.4867],
    'tamil nadu': [11.1271, 78.6569], 'chennai': [13.0827, 80.2707],
    'karnataka': [15.3173, 75.7139], 'bengaluru': [12.9716, 77.5946],
    'maharashtra': [19.7515, 75.7139], 'mumbai': [19.0760, 72.8777],
    'gujarat': [22.2587, 71.1924], 'rajasthan': [27.0238, 74.2179],
    'uttar pradesh': [26.8467, 80.9462], 'punjab': [31.1471, 75.3412],
    'haryana': [29.0588, 76.0856], 'madhya pradesh': [22.9734, 78.6569],
    'west bengal': [22.9868, 87.8550], 'odisha': [20.9517, 85.0985],
    'kerala': [10.8505, 76.2711], 'bihar': [25.0961, 85.3131],
  };

  for (const [key, [lat, lng]] of Object.entries(lookup)) {
    if (loc.includes(key)) return { lat, lng };
  }
  // Default to centre of India if no match
  return { lat: 20.5937, lng: 78.9629 };
}
