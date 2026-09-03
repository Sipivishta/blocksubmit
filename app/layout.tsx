import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlockSubmit',
  description: 'Secure academic submissions with immutable integrity proof'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
