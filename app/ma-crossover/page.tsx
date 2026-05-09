'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMarketData } from '@/lib/hooks/useMarketData';
import TradingChart from '@/components/TradingChart';
import SignalBadge from '@/components/SignalBadge';
import StatCard from '@/components/StatCard';
import SignalTable from '@/components/SignalTable';
import SymbolPicker from '@/components/SymbolPicker';
import type { SymbolData } from '@/lib/types';

function MACrossoverContent() {
  const params = useSearchParams();
  const [symbol, setSymbol] = useState(params.get('symbol') ?? 'AAPL');
  const { data, loading } = useMarketData([symbol]);
  const sym: SymbolData | undefined = data?.symbols[0];
  const mac = sym?.signals.maCrossover;
  const smaSpread = mac ? ((mac.latestSMA20 - mac.latestSMA50) / mac.latestSMA50) * 100 : null;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white">MA Crossover</h1>
            <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">SMA 20/50 · EMA 12/26</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">Golden Cross (BUY) when SMA20 crosses above SMA50 · Death Cross (SELL) when it crosses below</p>
        </div>
        <SymbolPicker value={symbol} onChange={setSymbol} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Signal"
          value={mac?.signal ?? '—'}
          sub={mac?.crossoverType === 'golden' ? '🟡 Golden Cross' : mac?.crossoverType === 'death' ? '💀 Death Cross' : 'No crossover'}
          color={mac?.signal === 'BUY' ? 'green' : mac?.signal === 'SELL' ? 'red' : 'yellow'}
        />
        <StatCard
          label="SMA 20"
          value={mac ? `$${mac.latestSMA20}` : '—'}
          sub="Short-term trend"
          color={mac && mac.latestSMA20 > mac.latestSMA50 ? 'green' : 'red'}
        />
        <StatCard
          label="SMA 50"
          value={mac ? `$${mac.latestSMA50}` : '—'}
          sub="Long-term trend"
          color="blue"
        />
        <StatCard
          label="SMA Spread"
          value={smaSpread != null ? `${smaSpread >= 0 ? '+' : ''}${smaSpread.toFixed(2)}%` : '—'}
          sub="SMA20 vs SMA50"
          color={smaSpread != null ? (smaSpread >= 0 ? 'green' : 'red') : 'default'}
        />
      </div>

      {mac && mac.crossoverType !== 'none' && (
        <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${
          mac.crossoverType === 'golden'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <span className="text-2xl">{mac.crossoverType === 'golden' ? '🟡' : '💀'}</span>
          <div>
            <div className={`font-semibold text-sm ${mac.crossoverType === 'golden' ? 'text-amber-400' : 'text-gray-400'}`}>
              {mac.crossoverType === 'golden' ? 'Golden Cross Detected' : 'Death Cross Detected'}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">{mac.reason}</div>
          </div>
          <div className="ml-auto">
            <SignalBadge signal={mac.signal} size="lg" />
          </div>
        </div>
      )}

      {mac && mac.crossoverType === 'none' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <SignalBadge signal={mac.signal} size="lg" />
          <span className="text-gray-400 text-sm">{mac.reason}</span>
        </div>
      )}

      {loading && !sym && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-[460px] animate-pulse flex items-center justify-center">
          <span className="text-gray-700 text-sm">Loading chart…</span>
        </div>
      )}
      {sym && mac && (
        <TradingChart
          ohlcv={sym.ohlcv}
          mainHeight={440}
          overlays={[
            { data: mac.sma20, color: '#3B82F6', label: 'SMA 20', lineWidth: 2 },
            { data: mac.sma50, color: '#F59E0B', label: 'SMA 50', lineWidth: 2 },
            { data: mac.ema12, color: '#8B5CF6', label: 'EMA 12', lineWidth: 1, dashed: true },
            { data: mac.ema26, color: '#6B7280', label: 'EMA 26', lineWidth: 1, dashed: true },
          ]}
        />
      )}

      <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
        {[
          { color: '#3B82F6', label: 'SMA 20 (primary)' },
          { color: '#F59E0B', label: 'SMA 50 (primary)' },
          { color: '#8B5CF6', label: 'EMA 12 (secondary)' },
          { color: '#6B7280', label: 'EMA 26 (secondary)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: color }} />
            <span style={{ color }}>{label}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-3 px-4">
          <div className="text-emerald-400 font-semibold mb-1">🟡 Golden Cross · BUY</div>
          <div className="text-gray-500">SMA20 crosses above SMA50 — long-term bullish trend shift</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg py-3 px-4">
          <div className="text-red-400 font-semibold mb-1">💀 Death Cross · SELL</div>
          <div className="text-gray-500">SMA20 crosses below SMA50 — long-term bearish trend shift</div>
        </div>
      </div>

      <SignalTable symbol={symbol} strategy="ma_crossover" limit={30} title={`MA Crossover Signal History · ${symbol}`} />
    </div>
  );
}

export default function MACrossoverPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-8">Loading…</div>}>
      <MACrossoverContent />
    </Suspense>
  );
}
