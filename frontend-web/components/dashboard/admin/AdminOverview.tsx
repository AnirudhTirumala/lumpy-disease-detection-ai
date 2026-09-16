'use client';
import { useState, useEffect } from 'react';
import { Users, ScanLine, AlertTriangle, Clock, TrendingUp, TrendingDown, RefreshCw, Activity, UserCheck, UserX } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);

  if (!stats && loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stats) return null;

  const detRate = stats.totalScans > 0 ? Math.round((stats.totalDetections / stats.totalScans) * 100) : 0;
  const pieData = [
    { name: 'Lumpy', value: stats.totalDetections, color: '#DC2626' },
    { name: 'Healthy', value: Math.max(0, stats.totalScans - stats.totalDetections), color: '#16A34A' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Platform Overview</h2>
          <p className="text-xs text-subink mt-0.5">Real-time data · Auto-refreshes every 15s</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-semibold transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Farmers', value: stats.activeFarmers, icon: Users, gradient: 'from-blue-500 to-blue-600', change: '+Real' },
          { label: 'Active Vets', value: stats.activeDoctors, icon: UserCheck, gradient: 'from-green-500 to-emerald-600', change: '+Real' },
          { label: 'Total Scans', value: stats.totalScans, icon: ScanLine, gradient: 'from-purple-500 to-violet-600', change: 'All time' },
          { label: 'Lumpy Detected', value: stats.totalDetections, icon: AlertTriangle, gradient: 'from-red-500 to-rose-600', change: `${detRate}% rate` },
        ].map(({ label, value, icon: Icon, gradient, change }) => (
          <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
            <Icon className="w-6 h-6 mb-4 opacity-90" />
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-sm opacity-80 mt-1">{label}</p>
            <p className="text-xs opacity-60 mt-0.5">{change}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-paper border border-hairline rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Monthly Activity</h3>
              <p className="text-xs text-subink mt-0.5">Scans vs detections over time</p>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-accent-500" /><span className="text-subink">Scans</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-500" /><span className="text-subink">Detections</span></div>
            </div>
          </div>
          {stats.monthly?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.monthly}>
                <defs>
                  <linearGradient id="scansGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6953F4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6953F4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ECECF3" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ECECF3', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="scans" stroke="#6953F4" strokeWidth={2} fill="url(#scansGrad)" />
                <Area type="monotone" dataKey="detections" stroke="#DC2626" strokeWidth={2} fill="url(#detGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-subink">No scan data yet</p>
            </div>
          )}
        </div>

        {/* Pie + stats */}
        <div className="bg-paper border border-hairline rounded-2xl p-6 shadow-card flex flex-col">
          <h3 className="text-sm font-bold text-ink mb-1">Detection Rate</h3>
          <p className="text-xs text-subink mb-4">Overall scan results</p>
          {pieData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-3xl font-bold text-ink">{detRate}%</p>
                  <p className="text-[10px] text-subink">Lumpy Rate</p>
                </div>
              </div>
              <div className="w-full space-y-2 mt-4">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-subink text-xs">{d.name}</span>
                    </div>
                    <span className="font-bold text-ink">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-subink text-center">Run scans to see detection rate</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending approvals alert */}
      {stats.pendingDoctors > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">{stats.pendingDoctors} doctor{stats.pendingDoctors > 1 ? 's' : ''} waiting for approval</p>
            <p className="text-xs text-amber-600 mt-0.5">Review their documents and approve or reject access.</p>
          </div>
          <a href="/dashboard/admin?tab=users" className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors">
            Review Now
          </a>
        </div>
      )}

      {stats.totalScans === 0 && (
        <div className="bg-canvas border border-hairline rounded-2xl p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink">No activity yet</p>
          <p className="text-xs text-subink mt-1">Data will populate as farmers start using the platform.</p>
        </div>
      )}
    </div>
  );
}
