'use client';
import { useState, useEffect } from 'react';
import { Stethoscope, AlertTriangle, CheckCircle, Clock, MessageSquare, TrendingUp, RefreshCw, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getStoredUser } from '@/lib/auth';
import { useNotifications } from '@/components/dashboard/shared/NotificationProvider';

export default function DoctorOverview({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);
  const user = getStoredUser();
  const { unreadCount: notificationUnread } = useNotifications();

  function load() {
    Promise.all([
      fetch('/api/dashboard/doctor').then(r => r.json()),
      user?.id ? fetch(`/api/chat?userId=${user.id}`).then(r => r.json()) : Promise.resolve({ threads: [] }),
    ]).then(([caseData, chatData]) => {
      setData(caseData);
      setChatUnread((chatData.threads || []).reduce((s: number, t: any) => s + (t.unreadCount || 0), 0));
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [user?.id]);

  if (!data && loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cases = data?.cases || [];
  const stats = data?.stats || { open: 0, high: 0, resolved: 0 };
  const recent = cases.slice(0, 5);

  // Build chart from real cases
  const byWeek: Record<string, number> = {};
  cases.forEach((c: any) => {
    const d = new Date(c.submitted);
    const key = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('default', { month: 'short' })}`;
    byWeek[key] = (byWeek[key] || 0) + 1;
  });
  const chartData = Object.entries(byWeek).slice(-6).map(([week, count]) => ({ week, count }));

  const SEV_COLOR: Record<string, string> = { High: '#DC2626', Medium: '#D97706', Low: '#2563EB' };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, Dr. {user?.name?.split(' ')[0]}</h2>
          <p className="text-xs text-subink mt-0.5">Here's your practice overview</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-hairline rounded-xl text-sm font-semibold text-subink hover:text-ink transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Cases', value: stats.open, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', tab: 'case-queue' },
          { label: 'High Severity', value: stats.high, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', tab: 'case-queue' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', tab: 'case-queue' },
          { label: 'New Messages', value: notificationUnread + chatUnread, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', tab: 'farmer-chat' },
        ].map(({ label, value, icon: Icon, color, bg, border, tab }) => (
          <button key={label} onClick={() => onTabChange?.(tab)}
            className={`${bg} border ${border} rounded-2xl p-5 text-left hover:shadow-md transition-all group`}>
            <div className="flex items-center justify-between mb-3">
              <Icon className={`w-6 h-6 ${color}`} />
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-ink">{value}</p>
            <p className="text-xs text-subink mt-1">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly cases chart */}
        <div className="lg:col-span-2 bg-paper border border-hairline rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Cases This Period</h3>
              <p className="text-xs text-subink">From real farmer scans</p>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#ECECF3" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #ECECF3', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="#6953F4" radius={[6, 6, 0, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center flex-col gap-2">
              <Stethoscope className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-subink">No cases yet — they appear when farmers scan lumpy animals</p>
            </div>
          )}
        </div>

        {/* Recent cases */}
        <div className="bg-paper border border-hairline rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">Recent Cases</h3>
            <button onClick={() => onTabChange?.('case-queue')} className="text-xs text-accent-600 hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-xs text-subink text-center py-8">No cases yet</p>
            ) : recent.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas hover:bg-accent-50 transition-colors cursor-pointer"
                onClick={() => onTabChange?.('case-queue')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                  style={{ background: `${SEV_COLOR[c.severity]}20`, color: SEV_COLOR[c.severity] }}>
                  {c.severity[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{c.farmer}</p>
                  <p className="text-[10px] text-subink">{c.cattle} · {c.confidence}%</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                  c.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                  c.status === 'Reviewed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
