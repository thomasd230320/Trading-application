import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'TradeView — Live Day Trading Strategies',
  description: 'Real-time RSI, MACD, Bollinger Bands, and MA Crossover signals from Yahoo Finance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#030712] text-gray-100 antialiased">
        <Navbar />
        <main className="ml-56 min-h-screen p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
