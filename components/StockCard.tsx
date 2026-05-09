import Link from 'next/link';
import SignalBadge from './SignalBadge';
import type { SymbolData } from '@/lib/types';

function fmt(n: number, decimals = 2) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

const STRATEGY_LINKS: Record<string, string> = {
  rsi: '/rsi',
  macd: '/macd',
  bollinger: '/bollinger',
  maCrossover: '/ma-crossover',
};

const STRATEGY_LABELS: Record<string, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'BB',
  maCrossover: 'MA×',
};

export default function StockCard({ data }: { data: SymbolData }) {
  const isUp = data.changePercent >= 0;
  const isCrypto = data.symbol.includes('-');

  const strategies = [
    { key: 'rsi', signal: data.signals.rsi.signal, sub: `${data.signals.rsi.value}` },
    { key: 'macd', signal: data.signals.macd.signal, sub: data.signals.macd.latestHistogram > 0 ? '+hist' : '-hist' },
    { key: 'bollinger', signal: data.signals.bollinger.signal, sub: `BW ${data.signals.bollinger.bandwidthPct}%` },
    { key: 'maCrossover', signal: data.signals.maCrossover.signal, sub: data.signals.maCrossover.crossoverType === 'golden' ? 'Golden' : data.signals.maCrossover.crossoverType === 'death' ? 'Death' : 'None' },
  ] as const;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all hover:shadow-lg hover:shadow-black/20 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">{data.symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              data.marketState === 'REGULAR'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-700 text-gray-500'
            }`}>
              {data.marketState === 'REGULAR' ? 'OPEN' : data.marketState === 'PRE' ? 'PRE' : 'CLOSED'}
            </span>
          </div>
          <div className="text-gray-500 text-xs truncate max-w-[160px] mt-0.5">{data.name}</div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-white font-semibold text-lg leading-tight">
            ${data.price < 1 ? data.price.toFixed(4) : data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Volume / Market cap */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-600">
        <span>Vol {fmt(data.volume)}</span>
        {data.marketCap && <span>MCap {fmt(data.marketCap)}</span>}
      </div>

      {/* Signals grid */}
      <div className="grid grid-cols-2 gap-2">
        {strategies.map(({ key, signal, sub }) => (
          <Link
            key={key}
            href={`${STRATEGY_LINKS[key]}?symbol=${data.symbol}`}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700/50 hover:border-gray-600 rounded-lg p-2 transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 font-medium">{STRATEGY_LABELS[key]}</span>
              <SignalBadge signal={signal} size="xs" />
            </div>
            <div className="text-[10px] text-gray-600 truncate">{sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
