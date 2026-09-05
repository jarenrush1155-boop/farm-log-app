import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '../components/AppShell';
import ToastProvider from '../components/ToastProvider';

export const metadata: Metadata = {
  title: {
    default: 'JLM Farm Logs',
    template: '%s · JLM Farm Logs',
  },
  description: 'Farm field, equipment, spray, and irrigation logs',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#065f46',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
