'use client';

import './globals.css';
import AppShell from '../components/AppShell';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#065f46" />
      </head>
      <body className="bg-gray-50 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
