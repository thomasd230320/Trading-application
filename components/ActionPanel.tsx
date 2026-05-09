'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SymbolData } from '@/lib/types';
import {
  getRecommendation,
  calculatePositionSize,
  rankRecommendations,
  maxAllowedDrawdown,
  type Recommendation,
} from '@/lib/strategy';

const SETTINGS_KEY = 'tradeview.settings.v1';

interface Settings {
  accountSize: number;
  riskPercent: number;
}

const DEFAULT_SETTINGS: Settings = { accountSize: 10000, riskPercent: 1 };

function fmtMoney(v: number) {
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${v.toFixed(4)}`;
}

function fmtUnits(units: number, isFractional: boolean) {
  if (isFractional) {
    if (units >= 1) return units.toFixed(4);
    if (units >= 0.0001) return units.toFixed(6);
    return units.toExponential(2);
  }
  return units.toString();
}

function fmtPct(v: number, decimals = 1) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}%`;
}

function ConfidenceBar({ value, color }: { value: number; color: 'emerald' | 'red' }) {
  const pct = Math.round(value * 100);
  const bg = color === 'emerald' ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-9 text-right">{pct}%</span>
    </div>
  );
}

function StrategyTable({ rec, ddCap }: { rec: Recommendation; ddCap: number }) {
  return (
    <table className="w-full text-[11px] mt-2">
      <thead>
        <tr className="text-gray-600">
          <th className="text-left font-medium py-1">Strategy</th>
          <th className="text-right font-medium">Trades</th>
          <th className="text-right font-medium">Return</th>
          <th className="text-right font-medium">Win</th>
          <th className="text-right font-medium">DD</th>
        </tr>
      </thead>
      <tbody>
        {rec.perf.map(p => {
          const isChosen = p.strategy === rec.chosenStrategy;
          const ineligible = p.trades < 5 || (Number.isFinite(ddCap) && p.maxDrawdown > ddCap) || p.score === 0;
          const rowClass = isChosen
            ? 'text-white bg-blue-500/10 font-semibold'
            : ineligible
              ? 'text-gray-600'
              : 'text-gray-400';
          return (
            <tr key={p.strategy} className={rowClass}>
              <td className="py-1">
                {p.label}
                {isChosen && <span className="ml-1 text-blue-400">●</span>}
              </td>
              <td className="text-right">{p.trades}</td>
              <td className={`text-right ${p.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'} ${ineligible ? 'opacity-50' : ''}`}>
                {p.trades === 0 ? '—' : fmtPct(p.totalReturn)}
              </td>
              <td className="text-right">{p.trades === 0 ? '—' : `${(p.winRate * 100).toFixed(0)}%`}</td>
              <td className="text-right">{p.trades === 0 ? '—' : `${p.maxDrawdown.toFixed(1)}%`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RecCard({
  rec,
  settings,
  ddCap,
}: {
  rec: Recommendation;
  settings: Settings;
  ddCap: number;
}) {
  const isFractional = rec.symbol.includes('-');
  const pos = calculatePositionSize(rec, settings.accountSize, settings.riskPercent, isFractional);

  const tone = rec.action === 'BUY'
    ? { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', verb: 'Buy' }
    : { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', verb: 'Sell' };

  const chosenPerf = rec.perf.find(p => p.strategy === rec.chosenStrategy);

  return (
    <div className={`${tone.bg} border ${tone.border} rounded-xl p-3 sm:p-4`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-base">{rec.symbol}</span>
            <span className={`text-[10px] uppercase font-semibold tracking-wider ${tone.text}`}>
              {rec.action === 'BUY' ? '↑ BUY' : '↓ SELL'}
            </span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded">
              via {rec.chosenLabel}
            </span>
          </div>
          <div className="text-gray-500 text-xs mt-0.5">{rec.reason}</div>
        </div>
      </div>

      {rec.fallback && (
        <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1 mb-2">
          ⚠ All strategies exceed your drawdown tolerance — showing the safest available.
        </div>
      )}

      <div className="mb-3">
        <ConfidenceBar value={rec.confidence} color={rec.action === 'BUY' ? 'emerald' : 'red'} />
      </div>

      {pos ? (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">{tone.verb}</span>
            <span className="text-white font-semibold">
              {fmtUnits(pos.units, isFractional)} {isFractional ? '' : 'shares'} · {fmtMoney(pos.dollarAmount)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/50 text-xs">
            <div>
              <div className="text-gray-600">Entry</div>
              <div className="text-white font-medium">{fmtMoney(rec.entry)}</div>
            </div>
            <div>
              <div className="text-gray-600">Stop</div>
              <div className="text-red-400 font-medium">{rec.stopLoss != null ? fmtMoney(rec.stopLoss) : '—'}</div>
            </div>
            <div>
              <div className="text-gray-600">Target</div>
              <div className="text-emerald-400 font-medium">{rec.takeProfit != null ? fmtMoney(rec.takeProfit) : '—'}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 flex-wrap gap-1">
            <span>Risk {fmtMoney(pos.riskAmount)} ({settings.riskPercent}%)</span>
            {rec.rewardToRisk != null && (
              <span>R:R {rec.rewardToRisk.toFixed(2)}×</span>
            )}
            <span>{pos.pctOfAccount.toFixed(1)}% of account</span>
          </div>
        </div>
      ) : rec.action === 'HOLD' ? (
        <div className="text-xs text-gray-600">
          {chosenPerf && chosenPerf.trades > 0
            ? `${rec.chosenLabel} is the highest-scoring strategy here, but it's currently neutral — no entry yet.`
            : `Not enough historical signals from ${rec.chosenLabel} to form a recommendation.`}
        </div>
      ) : (
        <div className="text-xs text-gray-600">
          Position too small for current risk settings — increase account size or risk %.
        </div>
      )}

      <details className="mt-3 group">
        <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-300 select-none list-none flex items-center gap-1">
          <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Strategy comparison
        </summary>
        <StrategyTable rec={rec} ddCap={ddCap} />
      </details>
    </div>
  );
}

interface ActionPanelProps {
  symbols: SymbolData[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function ActionPanel({ symbols, onRefresh, refreshing = false }: ActionPanelProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({
          accountSize: typeof parsed.accountSize === 'number' && parsed.accountSize > 0 ? parsed.accountSize : DEFAULT_SETTINGS.accountSize,
          riskPercent: typeof parsed.riskPercent === 'number' && parsed.riskPercent > 0 ? parsed.riskPercent : DEFAULT_SETTINGS.riskPercent,
        });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, hydrated]);

  const ddCap = maxAllowedDrawdown(settings.riskPercent);

  const lastBarKey = useMemo(
    () => symbols.map(s => `${s.symbol}:${s.ohlcv[s.ohlcv.length - 1]?.time ?? 0}`).join('|'),
    [symbols]
  );

  const recs = useMemo(
    () => symbols.map(s => getRecommendation(s, settings.riskPercent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastBarKey, settings.riskPercent]
  );

  const { buys, sells } = useMemo(() => rankRecommendations(recs), [recs]);
  const holds = useMemo(() => recs.filter(r => r.action === 'HOLD'), [recs]);

  const hasActionable = buys.length > 0 || sells.length > 0;

  const riskTier = settings.riskPercent <= 1 ? 'Conservative' : settings.riskPercent <= 3 ? 'Moderate' : 'Aggressive';
  const ddText = Number.isFinite(ddCap) ? `≤ ${ddCap}% historical drawdown` : 'no drawdown limit';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Action Plan</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {riskTier} · picks the top strategy with {ddText}
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh recommendations"
              className="ml-1 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h5M20 20v-5h-5M5.5 9A7 7 0 0118.66 7M18.5 15A7 7 0 015.34 17" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Account</span>
            <span className="text-gray-600">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              step={100}
              value={settings.accountSize}
              onChange={e => setSettings(s => ({ ...s, accountSize: Math.max(0, Number(e.target.value) || 0) }))}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-2 py-1 w-24 focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Risk</span>
            <input
              type="number"
              inputMode="decimal"
              min={0.1}
              max={10}
              step={0.1}
              value={settings.riskPercent}
              onChange={e => setSettings(s => ({ ...s, riskPercent: Math.max(0.1, Math.min(10, Number(e.target.value) || 0.1)) }))}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-2 py-1 w-14 focus:outline-none focus:border-blue-500"
            />
            <span className="text-gray-600">%</span>
          </label>
        </div>
      </div>

      {!hasActionable && (
        <div className="text-center py-6 text-sm text-gray-600">
          {holds.length > 0
            ? `Best-fit strategy is currently neutral on all ${holds.length} symbols — no entries yet.`
            : 'No symbols loaded yet.'}
        </div>
      )}

      {hasActionable && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {buys.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold mb-2">Buy candidates</div>
              <div className="space-y-2">
                {buys.slice(0, 3).map(r => (
                  <RecCard key={r.symbol} rec={r} settings={settings} ddCap={ddCap} />
                ))}
              </div>
            </div>
          )}
          {sells.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-red-400 font-semibold mb-2">Sell candidates</div>
              <div className="space-y-2">
                {sells.slice(0, 3).map(r => (
                  <RecCard key={r.symbol} rec={r} settings={settings} ddCap={ddCap} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-4 leading-relaxed">
        Educational use only — not financial advice. The chosen strategy per symbol is the one with
        the highest risk-adjusted score on the past 90 days, filtered by your risk-tier&apos;s
        drawdown ceiling. Position size = (account × risk %) ÷ stop distance.
      </p>
    </div>
  );
}
