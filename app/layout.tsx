import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'BlockSubmit | Cryptographic Academic Integrity Platform',
  description: 'Secure academic submissions with immutable blockchain proof and cryptographic verification.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-ink-900 bg-ink-50 selection:bg-brand-500 selection:text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
