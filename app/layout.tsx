'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-emerald-800 text-white p-4 flex flex-col">
            <h1 className="text-2xl font-bold mb-8 px-4">🌾 Farm Log</h1>
            
            <nav className="flex-1 space-y-1">
              {menuItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-emerald-700 transition-colors ${
                    pathname === item.href ? 'bg-emerald-700' : ''
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}