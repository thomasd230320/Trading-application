import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'TradeView — Live Day Trading Strategies',
  description: 'Real-time RSI, MACD, Bollinger Bands, and MA Crossover signals from Yahoo Finance.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#030712',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#030712] text-gray-100 antialiased">
        <Navbar />
        <main className="md:ml-56 min-h-screen pt-16 px-4 pb-6 md:pt-6 md:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
