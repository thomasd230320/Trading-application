'use client';

import SignalBadge from './SignalBadge';
import type { SignalHistoryEntry } from '@/lib/types';
import { useSignalHistory } from '@/lib/hooks/useMarketData';

const STRATEGY_LABEL: Record<string, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'Bollinger',
  ma_crossover: 'MA Cross',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  symbol?: string;
  strategy?: string;
  limit?: number;
  title?: string;
}

export default function SignalTable({ symbol, strategy, limit = 20, title = 'Signal History' }: Props) {
  const entries = useSignalHistory(symbol, strategy, limit);

  if (!entries.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <div className="text-gray-600 text-sm">
          {title} — No signals logged yet. Signals appear here when strategy conditions trigger.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Time</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Symbol</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Strategy</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Signal</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">Price</th>
              <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium hidden xl:table-cell">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{timeAgo(e.created_at)}</td>
                <td className="px-4 py-2.5 text-white font-medium">{e.symbol}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{STRATEGY_LABEL[e.strategy] ?? e.strategy}</td>
                <td className="px-4 py-2.5">
                  <SignalBadge signal={e.signal as 'BUY' | 'SELL' | 'HOLD'} size="xs" />
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">
                  {e.price != null ? `$${e.price.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs hidden xl:table-cell max-w-xs truncate">
                  {e.reason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
