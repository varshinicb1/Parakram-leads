import type { Metadata } from 'next';
import '@/styles/globals.css';
import ClientLayout from '@/components/ClientLayout';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Parakram Lead Intelligence',
  description: 'AI-powered lead discovery and outreach platform by Parakram',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
