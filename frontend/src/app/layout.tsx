import type { Metadata } from 'next';
import '@/styles/globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'Sigma Lead Intelligence',
  description: 'AI-powered lead discovery and outreach platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
