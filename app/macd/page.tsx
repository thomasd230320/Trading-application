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

function MACDContent() {
  const params = useSearchParams();
  const [symbol, setSymbol] = useState(params.get('symbol') ?? 'AAPL');
  const { data, loading } = useMarketData([symbol]);
  const sym: SymbolData | undefined = data?.symbols[0];
  const macd = sym?.signals.macd;
  const histPositive = (macd?.latestHistogram ?? 0) >= 0;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white">MACD Strategy</h1>
            <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">12 / 26 / 9</span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">Moving Average Convergence Divergence — crossover of MACD and Signal lines</p>
        </div>
        <SymbolPicker value={symbol} onChange={setSymbol} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Signal"
          value={macd?.signal ?? '—'}
          sub={macd?.reason?.slice(0, 40)}
          color={macd?.signal === 'BUY' ? 'green' : macd?.signal === 'SELL' ? 'red' : 'yellow'}
        />
        <StatCard
          label="MACD Line"
          value={macd ? macd.latestMACD.toFixed(4) : '—'}
          sub="Fast(12) − Slow(26) EMA"
          color={macd && macd.latestMACD > macd.latestSignal ? 'green' : 'red'}
        />
        <StatCard
          label="Signal Line"
          value={macd ? macd.latestSignal.toFixed(4) : '—'}
          sub="9-period EMA of MACD"
          color="blue"
        />
        <StatCard
          label="Histogram"
          value={macd ? (macd.latestHistogram >= 0 ? '+' : '') + macd.latestHistogram.toFixed(4) : '—'}
          sub={histPositive ? 'Bullish momentum' : 'Bearish momentum'}
          color={histPositive ? 'green' : 'red'}
        />
      </div>

      {macd && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <SignalBadge signal={macd.signal} size="lg" />
          <span className="text-gray-400 text-sm">{macd.reason}</span>
        </div>
      )}

      {loading && !sym && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-[560px] animate-pulse flex items-center justify-center">
          <span className="text-gray-700 text-sm">Loading chart…</span>
        </div>
      )}
      {sym && macd && (
        <TradingChart
          ohlcv={sym.ohlcv}
          mainHeight={340}
          subHeight={170}
          subSeries={[
            { data: macd.macdLine, type: 'line', color: '#3B82F6', label: 'MACD' },
            { data: macd.signalLine, type: 'line', color: '#F59E0B', label: 'Signal' },
            {
              data: macd.histogram,
              type: 'histogram',
              color: '#10B981',
              label: 'Histogram',
              positiveColor: '#10B981',
              negativeColor: '#EF4444',
            },
          ]}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-3 px-4">
          <div className="text-emerald-400 font-semibold mb-1">Bullish Crossover · BUY</div>
          <div className="text-gray-500">MACD crosses above Signal — bullish momentum building</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg py-3 px-4">
          <div className="text-amber-400 font-semibold mb-1">No Crossover · HOLD</div>
          <div className="text-gray-500">Watch histogram direction for momentum clues</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg py-3 px-4">
          <div className="text-red-400 font-semibold mb-1">Bearish Crossover · SELL</div>
          <div className="text-gray-500">MACD crosses below Signal — bearish momentum building</div>
        </div>
      </div>

      <SignalTable symbol={symbol} strategy="macd" limit={30} title={`MACD Signal History · ${symbol}`} />
    </div>
  );
}

export default function MACDPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-8">Loading…</div>}>
      <MACDContent />
    </Suspense>
  );
}
