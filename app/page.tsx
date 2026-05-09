'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useMarketData } from '@/lib/hooks/useMarketData';
import StockCard from '@/components/StockCard';
import TickerSelector from '@/components/TickerSelector';
import SignalTable from '@/components/SignalTable';
import SignalBadge from '@/components/SignalBadge';
import ActionPanel from '@/components/ActionPanel';
import PositionsPanel from '@/components/PositionsPanel';
import type { SymbolData } from '@/lib/types';
import type { Recommendation } from '@/lib/strategy';
import {
  type Position,
  loadPositions,
  savePositions,
  makePosition,
} from '@/lib/positions';

const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'BTC-USD', 'ETH-USD', 'SOL-USD'];
const WATCHLIST_KEY = 'tradeview.watchlist.v1';

function TickerBar({ symbols }: { symbols: SymbolData[] }) {
  if (!symbols.length) return null;
  const items = [...symbols, ...symbols];
  return (
    <div className="ticker-wrap bg-gray-900 border border-gray-800 rounded-xl py-2 px-4">
      <div className="ticker-track items-center gap-8">
        {items.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm whitespace-nowrap shrink-0">
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
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string') && parsed.length > 0) {
          setSymbols(parsed);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols)); } catch {}
  }, [symbols, hydrated]);

  const { data, loading, refreshing, error, refresh } = useMarketData(symbols);

  const [positions, setPositions] = useState<Position[]>([]);
  useEffect(() => { setPositions(loadPositions()); }, []);
  useEffect(() => { if (hydrated) savePositions(positions); }, [positions, hydrated]);

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    data?.symbols.forEach(s => { m[s.symbol] = s.price; });
    return m;
  }, [data]);

  const openSymbols = useMemo(
    () => new Set(positions.filter(p => p.status === 'open').map(p => p.symbol)),
    [positions]
  );

  function handleTakeTrade(rec: Recommendation, units: number) {
    if (rec.action === 'HOLD' || rec.stopLoss == null) return;
    const pos = makePosition({
      symbol: rec.symbol,
      side: rec.action === 'BUY' ? 'LONG' : 'SHORT',
      strategy: rec.chosenLabel,
      entryPrice: rec.entry,
      units,
      stopLoss: rec.stopLoss,
      takeProfit: rec.takeProfit,
    });
    setPositions(prev => [pos, ...prev]);
  }

  function handleClose(id: string, exitPrice: number, reason: 'manual' | 'stop' | 'target') {
    setPositions(prev => prev.map(p => p.id === id
      ? { ...p, status: 'closed', exitPrice, exitTime: Date.now(), exitReason: reason }
      : p
    ));
  }

  function handleDelete(id: string) {
    setPositions(prev => prev.filter(p => p.id !== id));
  }

  const totalBuy = data?.symbols.reduce((acc, s) => {
    const sigs = Object.values(s.signals);
    return acc + sigs.filter(sig => sig.signal === 'BUY').length;
  }, 0) ?? 0;

  const totalSell = data?.symbols.reduce((acc, s) => {
    const sigs = Object.values(s.signals);
    return acc + sigs.filter(sig => sig.signal === 'SELL').length;
  }, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Live signals · 5s refresh</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <span className="text-gray-500 hidden sm:inline">Signals:</span>
            <SignalBadge signal="BUY" size="xs" /> <span className="text-gray-400">{totalBuy}</span>
            <SignalBadge signal="SELL" size="xs" /> <span className="text-gray-400">{totalSell}</span>
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

      {/* Action plan */}
      {data && data.symbols.length > 0 && (
        <ActionPanel
          symbols={data.symbols}
          onRefresh={refresh}
          refreshing={refreshing}
          onTakeTrade={handleTakeTrade}
          openSymbols={openSymbols}
        />
      )}

      {/* Positions */}
      {hydrated && (
        <PositionsPanel
          positions={positions}
          priceMap={priceMap}
          onClose={handleClose}
          onDelete={handleDelete}
        />
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
