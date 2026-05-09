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

function getRSIColor(v: number): 'green' | 'red' | 'yellow' {
  if (v < 30) return 'green';
  if (v > 70) return 'red';
  return 'yellow';
}

function RSIContent() {
  const params = useSearchParams();
  const [symbol, setSymbol] = useState(params.get('symbol') ?? 'AAPL');
  const { data, loading } = useMarketData([symbol]);
  const sym: SymbolData | undefined = data?.symbols[0];
  const rsi = sym?.signals.rsi;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">RSI Strategy</h1>
            <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">Period 14</span>
          </div>
          <p className="text-gray-500 text-sm">Relative Strength Index — oversold &lt;30 (BUY), overbought &gt;70 (SELL)</p>
        </div>
        <SymbolPicker value={symbol} onChange={setSymbol} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="RSI Value"
          value={rsi ? rsi.value : '—'}
          sub="14-period"
          color={rsi ? getRSIColor(rsi.value) : 'default'}
        />
        <StatCard
          label="Signal"
          value={rsi?.signal ?? '—'}
          sub={rsi?.reason?.slice(0, 40)}
          color={rsi?.signal === 'BUY' ? 'green' : rsi?.signal === 'SELL' ? 'red' : 'yellow'}
        />
        <StatCard
          label="Price"
          value={sym ? `$${sym.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          sub={sym ? `${sym.changePercent >= 0 ? '+' : ''}${sym.changePercent.toFixed(2)}%` : undefined}
          color={sym ? (sym.changePercent >= 0 ? 'green' : 'red') : 'default'}
        />
        <StatCard label="Symbol" value={symbol} sub={sym?.name ?? 'Loading…'} color="blue" />
      </div>

      {rsi && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <SignalBadge signal={rsi.signal} size="lg" />
          <span className="text-gray-400 text-sm">{rsi.reason}</span>
        </div>
      )}

      {loading && !sym && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-[540px] animate-pulse flex items-center justify-center">
          <span className="text-gray-700 text-sm">Loading chart…</span>
        </div>
      )}
      {sym && rsi && (
        <TradingChart
          ohlcv={sym.ohlcv}
          mainHeight={360}
          subHeight={150}
          subSeries={[{ data: rsi.series, type: 'line', color: '#3B82F6', label: 'RSI' }]}
          refLines={[
            { value: 70, color: '#EF4444', label: 'OB 70' },
            { value: 30, color: '#10B981', label: 'OS 30' },
          ]}
        />
      )}

      <div className="grid grid-cols-3 gap-3 text-xs text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-3 px-4">
          <div className="text-emerald-400 font-semibold mb-1">Oversold · BUY</div>
          <div className="text-gray-500">RSI below 30 — potential reversal upward</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg py-3 px-4">
          <div className="text-amber-400 font-semibold mb-1">Neutral · HOLD</div>
          <div className="text-gray-500">RSI 30–70 — no strong signal</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg py-3 px-4">
          <div className="text-red-400 font-semibold mb-1">Overbought · SELL</div>
          <div className="text-gray-500">RSI above 70 — potential reversal downward</div>
        </div>
      </div>

      <SignalTable symbol={symbol} strategy="rsi" limit={30} title={`RSI Signal History · ${symbol}`} />
    </div>
  );
}

export default function RSIPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-8">Loading…</div>}>
      <RSIContent />
    </Suspense>
  );
}
