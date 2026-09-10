'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFarmOptional } from './FarmProvider';

const menuItems = [
  { href: '/', label: 'Dashboard', shortLabel: 'Home', icon: '🏠' },
  { href: '/fields', label: 'Fields', shortLabel: 'Fields', icon: '🌾' },
  { href: '/equipment', label: 'Equipment', shortLabel: 'Equip', icon: '🚜' },
  { href: '/maintenance', label: 'Maintenance', shortLabel: 'Maint', icon: '🔧' },
  { href: '/operations', label: 'Operations', shortLabel: 'Ops', icon: '📋' },
  { href: '/spray', label: 'Spray Logs', shortLabel: 'Spray', icon: '🧪' },
  { href: '/chemicals', label: 'Chemicals', shortLabel: 'Chems', icon: '🧪' },
  { href: '/premixes', label: 'Premixes', shortLabel: 'Premix', icon: '🧪' },
  { href: '/irrigation', label: 'Irrigation', shortLabel: 'Water', icon: '💧' },
  { href: '/crop-summary', label: 'Crop Summary', shortLabel: 'Crops', icon: '📊' },
  { href: '/tasks', label: 'Tasks', shortLabel: 'Tasks', icon: '✅' },
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
    <nav
      className={
        compact
          ? 'flex gap-0.5 overflow-x-auto overscroll-x-contain px-1.5 py-1.5 scrollbar-none'
          : 'flex-1 space-y-1'
      }
    >
      {menuItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={item.label}
            className={
              compact
                ? `flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] leading-tight min-w-[3.25rem] min-h-[3rem] transition-colors ${
                    active ? 'bg-emerald-700 text-white' : 'text-emerald-100 hover:bg-emerald-700/70'
                  }`
                : `w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 min-h-[44px] hover:bg-emerald-700 transition-colors ${
                    active ? 'bg-emerald-700' : ''
                  }`
            }
          >
            <span className={compact ? 'text-lg leading-none' : 'text-base leading-none'} aria-hidden>
              {item.icon}
            </span>
            <span className={compact ? 'text-center whitespace-nowrap' : ''}>
              {compact ? item.shortLabel : item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFooter({ onNavigate }: { onNavigate?: () => void }) {
  const farm = useFarmOptional();
  const router = useRouter();

  if (!farm?.userEmail) {
    return (
      <div className="mt-4 px-2 space-y-2 border-t border-emerald-700/50 pt-4">
        <Link
          href="/login"
          onClick={onNavigate}
          className="block text-sm text-emerald-100 hover:text-white min-h-[44px] flex items-center px-2"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 px-2 space-y-2 border-t border-emerald-700/50 pt-4">
      {farm.farms.length > 1 ? (
        <label className="block text-xs text-emerald-200 px-2">
          Active farm
          <select
            className="mt-1 w-full rounded-lg bg-emerald-900/40 border border-emerald-600 text-white text-sm p-2 min-h-[44px]"
            value={farm.activeFarmId ?? ''}
            onChange={(e) => farm.setActiveFarmId(e.target.value)}
          >
            {farm.farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-emerald-200 px-2 truncate" title={farm.activeFarm?.name}>
          {farm.activeFarm?.name ?? 'No farm'}
        </p>
      )}
      <p className="text-xs text-emerald-100/80 px-2 truncate" title={farm.userEmail}>
        {farm.userEmail}
      </p>
      <button
        type="button"
        className="w-full text-left px-2 py-2 rounded-lg text-sm text-emerald-100 hover:bg-emerald-700 min-h-[44px]"
        onClick={async () => {
          onNavigate?.();
          await farm.signOut();
          router.push('/login');
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthRoute = pathname === '/login' || pathname === '/signup';

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

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const currentLabel = menuItems.find((i) => i.href === pathname)?.label ?? 'Farm Log';

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-gray-50 text-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col bg-emerald-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-8 px-4">🌾 Farm Log</h1>
        <NavLinks pathname={pathname} />
        <AccountFooter />
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
          <p className="text-xs text-emerald-200">JLM Farm Logs</p>
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
            <AccountFooter onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content — extra bottom padding so fixed mobile nav does not cover content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom quick nav (horizontally scrollable) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-emerald-900/30 bg-emerald-800 text-white shadow-[0_-4px_12px_rgba(0,0,0,0.12)] safe-bottom"
        aria-label="Primary"
      >
        <NavLinks pathname={pathname} compact />
      </nav>
    </div>
  );
}
