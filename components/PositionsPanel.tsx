'use client';

import { useMemo, useState } from 'react';
import { type Position, openPnL, closedPnL, summarize } from '@/lib/positions';

function fmtMoney(v: number, withSign = false) {
  const sign = withSign && v > 0 ? '+' : v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (abs >= 1) return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${sign}$${abs.toFixed(4)}`;
}

function fmtPrice(v: number) {
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

function fmtPct(v: number, decimals = 2) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtAge(ms: number) {
  const sec = (Date.now() - ms) / 1000;
  if (sec < 60) return `${Math.floor(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${Math.floor(min)}m`;
  const hr = min / 60;
  if (hr < 24) return `${Math.floor(hr)}h`;
  const d = hr / 24;
  return `${Math.floor(d)}d`;
}

function fmtUnits(v: number) {
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

interface Props {
  positions: Position[];
  priceMap: Record<string, number>;
  onClose: (id: string, exitPrice: number, reason: 'manual' | 'stop' | 'target') => void;
  onDelete: (id: string) => void;
}

export default function PositionsPanel({ positions, priceMap, onClose, onDelete }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const open = useMemo(() => positions.filter(p => p.status === 'open'), [positions]);
  const closed = useMemo(
    () => positions.filter(p => p.status === 'closed').sort((a, b) => (b.exitTime ?? 0) - (a.exitTime ?? 0)),
    [positions]
  );
  const summary = useMemo(() => summarize(positions, priceMap), [positions, priceMap]);

  if (positions.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
        <h2 className="text-base font-semibold text-white">Positions</h2>
        <p className="text-xs text-gray-500 mt-2">
          No positions yet. Use the <span className="text-blue-400">Take trade</span> button on an Action Plan
          recommendation to start tracking.
        </p>
      </div>
    );
  }

  const winRate = summary.closedCount > 0 ? (summary.wins / summary.closedCount) * 100 : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">Positions</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {summary.openCount} open · {summary.closedCount} closed
          </p>
        </div>
        {summary.closedCount > 0 && (
          <button
            onClick={() => setShowHistory(s => !s)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md border border-gray-700 hover:border-gray-600 transition-colors"
          >
            {showHistory ? 'Hide history' : `Show history (${summary.closedCount})`}
          </button>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <SummaryStat label="Exposure" value={fmtMoney(summary.exposure)} />
        <SummaryStat
          label="Unrealized"
          value={fmtMoney(summary.unrealized, true)}
          tone={summary.unrealized >= 0 ? 'pos' : 'neg'}
        />
        <SummaryStat
          label="Risk at stop"
          value={fmtMoney(summary.totalRiskAtStop)}
          tone="warn"
        />
        <SummaryStat
          label={`Realized ${summary.closedCount > 0 ? `· ${winRate.toFixed(0)}% win` : ''}`}
          value={fmtMoney(summary.realized, true)}
          tone={summary.realized >= 0 ? 'pos' : 'neg'}
        />
      </div>

      {/* Open positions */}
      {open.length > 0 && (
        <div className="space-y-2">
          {open.map(p => {
            const cur = priceMap[p.symbol] ?? p.entryPrice;
            const pnl = openPnL(p, cur);
            const sideTone = p.side === 'LONG'
              ? { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/5' }
              : { border: 'border-red-500/30', text: 'text-red-400', bg: 'bg-red-500/5' };
            const pnlTone = pnl.unrealized >= 0 ? 'text-emerald-400' : 'text-red-400';
            const stale = !priceMap[p.symbol];

            return (
              <div key={p.id} className={`${sideTone.bg} border ${sideTone.border} rounded-xl p-3`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-white font-bold">{p.symbol}</span>
                    <span className={`text-[10px] uppercase font-semibold tracking-wider ${sideTone.text}`}>
                      {p.side}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      via {p.strategy} · {fmtAge(p.entryTime)} ago
                    </span>
                    {stale && (
                      <span className="text-[10px] text-amber-400" title="Add this symbol to your watchlist for live updates">
                        no live price
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${pnlTone}`}>
                      {fmtMoney(pnl.unrealized, true)} <span className="text-xs">({fmtPct(pnl.unrealizedPct)})</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2 text-xs">
                  <Cell label="Entry" value={fmtPrice(p.entryPrice)} />
                  <Cell label="Current" value={fmtPrice(cur)} highlight={stale ? 'dim' : undefined} />
                  <Cell label="Stop" value={fmtPrice(p.stopLoss)} highlight={pnl.hitStop ? 'danger' : undefined} />
                  <Cell label="Target" value={p.takeProfit != null ? fmtPrice(p.takeProfit) : '—'} highlight={pnl.hitTarget ? 'good' : undefined} />
                  <Cell label="Units" value={fmtUnits(p.units)} />
                </div>

                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                  <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
                    <span>To stop: {fmtPct(pnl.toStopPct)}</span>
                    {pnl.toTargetPct != null && <span>To target: {fmtPct(pnl.toTargetPct)}</span>}
                    {pnl.hitStop && <span className="text-red-400 font-semibold">⚠ stop hit</span>}
                    {pnl.hitTarget && <span className="text-emerald-400 font-semibold">✓ target hit</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {pnl.hitStop && (
                      <button
                        onClick={() => onClose(p.id, p.stopLoss, 'stop')}
                        className="text-[11px] px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40"
                      >
                        Close at stop
                      </button>
                    )}
                    {pnl.hitTarget && p.takeProfit != null && (
                      <button
                        onClick={() => onClose(p.id, p.takeProfit!, 'target')}
                        className="text-[11px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                      >
                        Close at target
                      </button>
                    )}
                    <button
                      onClick={() => onClose(p.id, cur, 'manual')}
                      disabled={stale}
                      title={stale ? 'Add symbol to watchlist for live close price' : ''}
                      className="text-[11px] px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Close at market
                    </button>
                    <button
                      onClick={() => { if (confirm(`Discard tracked position for ${p.symbol}?`)) onDelete(p.id); }}
                      className="text-[11px] px-1.5 py-1 rounded text-gray-600 hover:text-red-400"
                      aria-label="Discard"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open.length === 0 && (
        <div className="text-xs text-gray-600 py-2">No open positions.</div>
      )}

      {/* History */}
      {showHistory && closed.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Closed</div>
          <div className="space-y-1.5">
            {closed.map(p => {
              const { realized, realizedPct } = closedPnL(p);
              const tone = realized >= 0 ? 'text-emerald-400' : 'text-red-400';
              return (
                <div key={p.id} className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{p.symbol}</span>
                    <span className={`text-[10px] uppercase ${p.side === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.side}
                    </span>
                    <span className="text-gray-600">
                      {fmtPrice(p.entryPrice)} → {p.exitPrice != null ? fmtPrice(p.exitPrice) : '—'}
                    </span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-500">{p.strategy}</span>
                    {p.exitReason && (
                      <span className={`text-[10px] uppercase ${p.exitReason === 'target' ? 'text-emerald-500' : p.exitReason === 'stop' ? 'text-red-500' : 'text-gray-500'}`}>
                        {p.exitReason}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${tone}`}>
                      {fmtMoney(realized, true)} ({fmtPct(realizedPct)})
                    </span>
                    <button
                      onClick={() => { if (confirm('Delete this trade from history?')) onDelete(p.id); }}
                      className="text-gray-700 hover:text-red-400 text-xs"
                      aria-label="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
        Paper trades only — stored locally in your browser. P&L assumes no commissions or slippage.
        Closing &quot;at market&quot; uses the most recent live price; closing at stop/target uses the level you set.
      </p>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' | 'warn' }) {
  const cls = tone === 'pos' ? 'text-emerald-400' : tone === 'neg' ? 'text-red-400' : tone === 'warn' ? 'text-amber-400' : 'text-white';
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'danger' | 'dim' }) {
  const cls = highlight === 'good' ? 'text-emerald-400' : highlight === 'danger' ? 'text-red-400' : highlight === 'dim' ? 'text-gray-500' : 'text-white';
  return (
    <div>
      <div className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</div>
      <div className={`font-medium ${cls}`}>{value}</div>
    </div>
  );
}
