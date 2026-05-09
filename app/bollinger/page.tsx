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

function BollingerContent() {
  const params = useSearchParams();
  const [symbol, setSymbol] = useState(params.get('symbol') ?? 'AAPL');
  const { data, loading } = useMarketData([symbol]);
  const sym: SymbolData | undefined = data?.symbols[0];
  const bb = sym?.signals.bollinger;

  const pctB = bb
    ? ((bb.latestClose - bb.latestLower) / (bb.latestUpper - bb.latestLower)) * 100
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">Bollinger Bands</h1>
            <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">20-period · 2σ</span>
          </div>
          <p className="text-gray-500 text-sm">Volatility channels — signals when price touches or breaches the bands</p>
        </div>
        <SymbolPicker value={symbol} onChange={setSymbol} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Signal"
          value={bb?.signal ?? '—'}
          sub={bb?.reason?.slice(0, 40)}
          color={bb?.signal === 'BUY' ? 'green' : bb?.signal === 'SELL' ? 'red' : 'yellow'}
        />
        <StatCard
          label="%B Position"
          value={pctB != null ? `${pctB.toFixed(1)}%` : '—'}
          sub="0% = lower · 100% = upper"
          color={pctB != null ? (pctB < 20 ? 'green' : pctB > 80 ? 'red' : 'yellow') : 'default'}
        />
        <StatCard
          label="Bandwidth"
          value={bb ? `${bb.bandwidthPct}%` : '—'}
          sub="(Upper − Lower) / Middle"
          color="blue"
        />
        <StatCard
          label="vs Middle Band"
          value={bb ? `$${bb.latestMiddle}` : '—'}
          sub={bb ? `Close $${bb.latestClose}` : undefined}
          color={bb && bb.latestClose > bb.latestMiddle ? 'green' : 'red'}
        />
      </div>

      {bb && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-gray-900 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Upper Band</div>
            <div className="text-red-400 font-semibold">${bb.latestUpper}</div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Middle Band (SMA20)</div>
            <div className="text-white font-semibold">${bb.latestMiddle}</div>
          </div>
          <div className="bg-gray-900 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Lower Band</div>
            <div className="text-emerald-400 font-semibold">${bb.latestLower}</div>
          </div>
        </div>
      )}

      {bb && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <SignalBadge signal={bb.signal} size="lg" />
          <span className="text-gray-400 text-sm">{bb.reason}</span>
        </div>
      )}

      {loading && !sym && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-[460px] animate-pulse flex items-center justify-center">
          <span className="text-gray-700 text-sm">Loading chart…</span>
        </div>
      )}
      {sym && bb && (
        <TradingChart
          ohlcv={sym.ohlcv}
          mainHeight={440}
          overlays={[
            { data: bb.upper, color: '#EF4444', label: 'Upper', lineWidth: 1, dashed: true },
            { data: bb.middle, color: '#6B7280', label: 'Middle', lineWidth: 1 },
            { data: bb.lower, color: '#10B981', label: 'Lower', lineWidth: 1, dashed: true },
          ]}
        />
      )}

      <div className="grid grid-cols-3 gap-3 text-xs text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-3 px-4">
          <div className="text-emerald-400 font-semibold mb-1">Price at Lower Band · BUY</div>
          <div className="text-gray-500">Potential mean reversion bounce upward</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg py-3 px-4">
          <div className="text-amber-400 font-semibold mb-1">Price Inside Bands · HOLD</div>
          <div className="text-gray-500">Within normal volatility range</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg py-3 px-4">
          <div className="text-red-400 font-semibold mb-1">Price at Upper Band · SELL</div>
          <div className="text-gray-500">Potential mean reversion pull downward</div>
        </div>
      </div>

      <SignalTable symbol={symbol} strategy="bollinger" limit={30} title={`Bollinger Band Signal History · ${symbol}`} />
    </div>
  );
}

export default function BollingerPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-8">Loading…</div>}>
      <BollingerContent />
    </Suspense>
  );
}
