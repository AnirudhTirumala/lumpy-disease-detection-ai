'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, HelpCircle, X } from 'lucide-react';
import Image from 'next/image';
import { getStoredUser } from '@/lib/auth';
import NotificationBell from '@/components/dashboard/shared/NotificationBell';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onTabChange?: (tab: string) => void;
  role?: string;
}

// Searchable items per role
const SEARCH_ITEMS: Record<string, { label: string; tab: string; icon: string }[]> = {
  user: [
    { label: 'Dashboard', tab: 'dashboard', icon: '🏠' },
    { label: 'New Scan', tab: 'new-scan', icon: '🔬' },
    { label: 'My Cattle', tab: 'my-cattle', icon: '🐄' },
    { label: 'Scan History', tab: 'my-scans', icon: '📋' },
    { label: 'Doctor Chat', tab: 'doctor-chat', icon: '💬' },
    { label: 'Outbreak Map', tab: 'outbreak-map', icon: '🗺️' },
    { label: 'Notifications', tab: 'notifications', icon: '🔔' },
    { label: 'Settings', tab: 'settings', icon: '⚙️' },
    { label: 'Reports', tab: 'reports', icon: '📄' },
  ],
  doctor: [
    { label: 'Dashboard', tab: 'dashboard', icon: '🏠' },
    { label: 'Case Queue', tab: 'case-queue', icon: '📋' },
    { label: 'Patient Records', tab: 'patients', icon: '🐄' },
    { label: 'Farmer Chat', tab: 'farmer-chat', icon: '💬' },
    { label: 'Outbreak Map', tab: 'outbreak-map', icon: '🗺️' },
    { label: 'Analytics', tab: 'analytics', icon: '📊' },
    { label: 'Notifications', tab: 'notifications', icon: '🔔' },
    { label: 'Settings', tab: 'settings', icon: '⚙️' },
  ],
  admin: [
    { label: 'Dashboard', tab: 'dashboard', icon: '🏠' },
    { label: 'User Management', tab: 'users', icon: '👥' },
    { label: 'Doctor Approvals', tab: 'users', icon: '👨‍⚕️' },
    { label: 'Analytics', tab: 'analytics', icon: '📊' },
    { label: 'Outbreak Map', tab: 'outbreak-map', icon: '🗺️' },
    { label: 'Notifications', tab: 'notifications', icon: '🔔' },
    { label: 'Settings', tab: 'settings', icon: '⚙️' },
  ],
};

export default function Topbar({ title, subtitle, onTabChange, role }: TopbarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const user = getStoredUser();
  const currentRole = role || user?.role || 'user';
  const items = SEARCH_ITEMS[currentRole] || [];

  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(tab: string) {
    onTabChange?.(tab);
    setQuery('');
    setShowResults(false);
  }

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-hairline bg-paper/90 backdrop-blur-md shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-ink leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-subink mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="flex items-center gap-2 bg-canvas border border-hairline rounded-xl px-3 py-2 w-56 focus-within:border-accent-400 transition-colors">
            <Search className="w-3.5 h-3.5 text-subink shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              className="bg-transparent text-xs text-ink placeholder:text-subink outline-none w-full"
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowResults(false); }}>
                <X className="w-3 h-3 text-subink" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute top-10 left-0 w-64 bg-paper border border-hairline rounded-2xl shadow-2xl z-50 overflow-hidden">
              {filtered.length === 0 ? (
                <p className="text-xs text-subink px-4 py-3">No results found</p>
              ) : (
                <div className="py-1">
                  {filtered.map(item => (
                    <button key={item.tab + item.label}
                      onClick={() => handleSelect(item.tab)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-canvas transition-colors text-left">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm text-ink">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real notification bell */}
        <NotificationBell />

        {/* Help */}
        <a href="mailto:cow@lumpy.ai" title="Help: cow@lumpy.ai"
          className="w-9 h-9 rounded-xl bg-canvas border border-hairline flex items-center justify-center text-subink hover:text-accent-600 hover:border-accent-300 transition-all">
          <HelpCircle className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}
