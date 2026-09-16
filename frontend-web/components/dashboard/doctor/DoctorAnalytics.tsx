'use client';
import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

export default function DoctorAnalytics() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [severity, setSeverity] = useState<any[]>([]);
  const [resultSplit, setResultSplit] = useState<any[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  function load() {
    fetch('/api/dashboard/doctor')
      .then(r => r.json())
      .then(d => {
        const cases = d.cases || [];
        setTotalCases(cases.length);
        setLastUpdated(new Date());

        // Monthly breakdown
        const byMonth: Record<string, { cases: number; resolved: number; lumpy: number }> = {};
        cases.forEach((c: any) => {
          const m = new Date(c.submitted).toLocaleString('default', { month: 'short', year: '2-digit' });
          if (!byMonth[m]) byMonth[m] = { cases: 0, resolved: 0, lumpy: 0 };
          byMonth[m].cases++;
          if (c.status === 'Reviewed' || c.status === 'Closed') byMonth[m].resolved++;
          if (c.result === 'lumpy') byMonth[m].lumpy++;
        });
        setMonthly(Object.entries(byMonth).slice(-6).map(([month, v]) => ({ month, ...v })));

        // Severity
        const high = cases.filter((c: any) => c.severity === 'High').length;
        const med  = cases.filter((c: any) => c.severity === 'Medium').length;
        const low  = cases.filter((c: any) => c.severity === 'Low').length;
        setSeverity([
          { name: 'High', value: high, color: '#DC2626' },
          { name: 'Medium', value: med, color: '#D97706' },
          { name: 'Low', value: low, color: '#2563EB' },
        ].filter(s => s.value > 0));

        // Result split
        const lumpy   = cases.filter((c: any) => c.result === 'lumpy').length;
        const healthy = cases.filter((c: any) => c.result !== 'lumpy').length;
        setResultSplit([
          { name: 'Lumpy', value: lumpy, color: '#DC2626' },
          { name: 'Healthy', value: healthy, color: '#16A34A' },
        ].filter(s => s.value > 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  if (loading && totalCases === 0) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (totalCases === 0) return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-ink">No case data yet</p>
      <p className="text-xs text-subink mt-1">Analytics update automatically as farmers submit scans.</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Analytics</h2>
          <p className="text-xs text-subink mt-0.5">
            {totalCases} total cases · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-xs text-subink hover:text-ink px-3 py-1.5 border border-hairline rounded-xl">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly bar chart */}
        <div className="bg-paper border border-hairline rounded-2xl p-6 shadow-card lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-accent-600" />
            <h3 className="text-sm font-bold text-ink">Cases vs Resolved</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid stroke="#ECECF3" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ECECF3', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="cases"    fill="#6953F4" radius={[4,4,0,0]} name="Cases" />
              <Bar dataKey="resolved" fill="#16A34A" radius={[4,4,0,0]} name="Resolved" />
              <Bar dataKey="lumpy"    fill="#DC2626" radius={[4,4,0,0]} name="Lumpy" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-subink"><div className="w-3 h-3 rounded bg-accent-500" />Cases</div>
            <div className="flex items-center gap-1.5 text-xs text-subink"><div className="w-3 h-3 rounded bg-green-500" />Resolved</div>
            <div className="flex items-center gap-1.5 text-xs text-subink"><div className="w-3 h-3 rounded bg-red-500" />Lumpy</div>
          </div>
        </div>

        {/* Severity pie */}
        <div className="bg-paper border border-hairline rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-accent-600" />
            <h3 className="text-sm font-bold text-ink">Severity Split</h3>
          </div>
          {severity.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={severity} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {severity.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ECECF3', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {severity.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-subink">{d.name}</span>
                    </div>
                    <span className="font-bold text-ink">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-xs text-subink text-center py-8">No data</p>}
        </div>
      </div>

      {/* Result split */}
      {resultSplit.length > 0 && (
        <div className="bg-paper border border-hairline rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent-600" />
            <h3 className="text-sm font-bold text-ink">Healthy vs Lumpy Overall</h3>
          </div>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={resultSplit} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {resultSplit.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {resultSplit.map(d => (
                <div key={d.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-sm font-semibold text-ink">{d.name}</span>
                  </div>
                  <p className="text-2xl font-bold text-ink">{d.value}</p>
                  <p className="text-xs text-subink">{totalCases > 0 ? Math.round(d.value / totalCases * 100) : 0}% of all cases</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
