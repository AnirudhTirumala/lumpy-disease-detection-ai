'use client';
import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading && !stats) return <p className="text-sm text-subink text-center py-20">Loading analytics...</p>;
  if (!stats) return null;

  const detRate = stats.totalScans > 0 ? Math.round((stats.totalDetections / stats.totalScans) * 100) : 0;
  const healthyRate = 100 - detRate;

  const pieData = [
    { name: 'Lumpy Detected', value: stats.totalDetections, color: '#DC2626' },
    { name: 'Healthy', value: stats.totalScans - stats.totalDetections, color: '#16A34A' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-ink">Platform Analytics — Real Data Only</h2>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-subink hover:text-ink px-3 py-1.5 border border-hairline rounded-xl">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {stats.totalScans === 0 ? (
        <div className="bg-canvas border border-hairline rounded-2xl p-16 text-center">
          <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink">No data yet</p>
          <p className="text-xs text-subink mt-1">Analytics will appear as farmers use the platform.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly bar chart */}
          <div className="bg-paper border border-hairline rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-sm font-bold text-ink mb-4">Monthly Scans vs Detections</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.monthly || []} barGap={4}>
                <CartesianGrid stroke="#ECECF3" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ECECF3', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="scans" fill="#6953F4" radius={[4,4,0,0]} name="Total Scans" />
                <Bar dataKey="detections" fill="#DC2626" radius={[4,4,0,0]} name="Lumpy Detected" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-paper border border-hairline rounded-2xl p-6">
            <h3 className="text-sm font-bold text-ink mb-4">Overall Results</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ECECF3', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-subink">{d.name}</span>
                      </div>
                      <span className="font-semibold text-ink">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-subink text-center py-10">No scan results yet</p>
            )}
          </div>

          {/* User growth */}
          <div className="bg-paper border border-hairline rounded-2xl p-6 lg:col-span-3">
            <h3 className="text-sm font-bold text-ink mb-1">Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Active Farmers', value: stats.activeFarmers },
                { label: 'Active Doctors', value: stats.activeDoctors },
                { label: 'Detection Rate', value: `${detRate}%` },
                { label: 'Pending Approvals', value: stats.pendingDoctors },
              ].map(({ label, value }) => (
                <div key={label} className="bg-canvas rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-ink">{value}</p>
                  <p className="text-xs text-subink mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
