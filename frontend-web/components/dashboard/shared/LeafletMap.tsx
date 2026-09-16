'use client';
// components/dashboard/shared/LeafletMap.tsx
// Dynamically loaded to avoid SSR issues with Leaflet
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Point {
  lat: number; lng: number; farmerName: string; location: string;
  cattleName: string; animalType: string; confidence: number; date: string;
}

function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const L = require('leaflet');
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
  }, [points]);
  return null;
}

function markerColor(confidence: number) {
  if (confidence >= 85) return '#EF4444';   // red
  if (confidence >= 65) return '#F97316';   // orange
  return '#EAB308';                          // yellow
}

export default function LeafletMap({ points }: { points: Point[] }) {
  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: '450px', width: '100%', borderRadius: '16px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={10}
          pathOptions={{
            color: markerColor(p.confidence),
            fillColor: markerColor(p.confidence),
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm space-y-1 min-w-[180px]">
              <p className="font-bold text-red-600">⚠️ Lumpy Detected</p>
              <p><span className="font-semibold">Animal:</span> {p.cattleName} ({p.animalType})</p>
              <p><span className="font-semibold">Farmer:</span> {p.farmerName}</p>
              <p><span className="font-semibold">Location:</span> {p.location}</p>
              <p><span className="font-semibold">Confidence:</span> {p.confidence}%</p>
              <p><span className="font-semibold">Date:</span> {new Date(p.date).toLocaleDateString()}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {points.length > 1 && <FitBounds points={points} />}
    </MapContainer>
  );
}
