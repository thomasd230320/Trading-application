'use client';

import { useState, useEffect, useRef } from 'react';
import { useMarketData } from '@/lib/hooks/useMarketData';
import StockCard from '@/components/StockCard';
import TickerSelector from '@/components/TickerSelector';
import SignalTable from '@/components/SignalTable';
import SignalBadge from '@/components/SignalBadge';
import type { SymbolData } from '@/lib/types';

const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'BTC-USD', 'ETH-USD', 'SOL-USD'];

function TickerBar({ symbols }: { symbols: SymbolData[] }) {
  if (!symbols.length) return null;
  const items = [...symbols, ...symbols];
  return (
    <div className="ticker-wrap bg-gray-900 border border-gray-800 rounded-xl mb-6 py-2 px-4">
      <div className="ticker-inner flex items-center gap-8">
        {items.map((s, i) => (
          <span key={i} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="text-gray-400 font-medium">{s.symbol}</span>
            <span className="text-white font-bold">
              ${s.price < 1 ? s.price.toFixed(4) : s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {s.changePercent >= 0 ? '▲' : '▼'}{Math.abs(s.changePercent).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function UpdatePulse({ timestamp }: { timestamp?: number }) {
  const [secs, setSecs] = useState(0);
  const lastRef = useRef(timestamp);

  useEffect(() => {
    if (timestamp !== lastRef.current) { setSecs(0); lastRef.current = timestamp; }
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [timestamp]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Updated {secs < 2 ? 'just now' : `${secs}s ago`}
    </div>
  );
}

export default function DashboardPage() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const { data, loading, error } = useMarketData(symbols);

  const totalBuy = data?.symbols.reduce((acc, s) => {
    const sigs = Object.values(s.signals);
    return acc + sigs.filter(sig => sig.signal === 'BUY').length;
  }, 0) ?? 0;

  const totalSell = data?.symbols.reduce((acc, s) => {
    const sigs = Object.values(s.signals);
    return acc + sigs.filter(sig => sig.signal === 'SELL').length;
  }, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live signals across all strategies · 5s refresh</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Signals:</span>
            <SignalBadge signal="BUY" size="sm" /> <span className="text-gray-400">{totalBuy}</span>
            <SignalBadge signal="SELL" size="sm" /> <span className="text-gray-400">{totalSell}</span>
          </div>
          <UpdatePulse timestamp={data?.timestamp} />
        </div>
      </div>

      {/* Ticker tape */}
      {data && <TickerBar symbols={data.symbols} />}

      {/* Watchlist editor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Watchlist</span>
          <TickerSelector
            symbols={symbols}
            onAdd={s => setSymbols(prev => [...prev, s])}
            onRemove={s => setSymbols(prev => prev.filter(x => x !== s))}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          ⚠ {error} — retrying every 5s
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-5 w-16 bg-gray-800 rounded" />
                  <div className="h-3 w-28 bg-gray-800 rounded" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-5 w-20 bg-gray-800 rounded" />
                  <div className="h-3 w-12 bg-gray-800 rounded ml-auto" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-12 bg-gray-800 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards grid */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.symbols.map(s => <StockCard key={s.symbol} data={s} />)}
        </div>
      )}

      {/* Signal history */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Recent Signals</h2>
        <SignalTable limit={20} title="All Strategies · All Symbols" />
      </div>
    </div>
  );
}
