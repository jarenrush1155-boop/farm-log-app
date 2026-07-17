'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/fields', label: 'Fields', icon: '🌾' },
  { href: '/equipment', label: 'Equipment', icon: '🚜' },
  { href: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { href: '/operations', label: 'Operations', icon: '📋' },
  { href: '/spray', label: 'Spray Logs', icon: '🧪' },
  { href: '/chemicals', label: 'Chemicals', icon: '🧪' },
  { href: '/premixes', label: 'Premixes', icon: '🧪' },
  { href: '/irrigation', label: 'Irrigation', icon: '💧' },
  { href: '/crop-summary', label: 'Crop Summary', icon: '📊' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
];

function NavLinks({
  pathname,
  onNavigate,
  compact = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <nav className={compact ? 'flex gap-1 overflow-x-auto px-2 py-2' : 'flex-1 space-y-1'}>
      {menuItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              compact
                ? `flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-xs min-w-[4.25rem] min-h-[3.25rem] transition-colors ${
                    active ? 'bg-emerald-700 text-white' : 'text-emerald-100 hover:bg-emerald-700/70'
                  }`
                : `w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 min-h-[44px] hover:bg-emerald-700 transition-colors ${
                    active ? 'bg-emerald-700' : ''
                  }`
            }
          >
            <span className="text-base leading-none" aria-hidden>
              {item.icon}
            </span>
            <span className={compact ? 'leading-tight text-center' : ''}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const currentLabel = menuItems.find((i) => i.href === pathname)?.label ?? 'Farm Log';

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-gray-50 text-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col bg-emerald-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-8 px-4">🌾 Farm Log</h1>
        <NavLinks pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 bg-emerald-800 text-white px-4 py-3 safe-top shadow-md">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-emerald-700"
          aria-label="Open menu"
        >
          <span className="text-2xl leading-none">☰</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-emerald-200">Farm Log</p>
          <p className="font-semibold truncate">{currentLabel}</p>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(18rem,85vw)] flex-col bg-emerald-800 text-white p-4 shadow-xl safe-top safe-bottom">
            <div className="flex items-center justify-between mb-6 px-2">
              <h1 className="text-xl font-bold">🌾 Farm Log</h1>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-emerald-700 text-2xl"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom quick nav (scrollable icons) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-emerald-900/30 bg-emerald-800 text-white shadow-[0_-4px_12px_rgba(0,0,0,0.12)] safe-bottom"
        aria-label="Primary"
      >
        <NavLinks pathname={pathname} compact />
      </nav>
    </div>
  );
}
