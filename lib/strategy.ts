import type { SymbolData, Signal } from './types';
import {
  type StrategyKey,
  type StrategyPerformance,
  STRATEGY_LABELS,
  backtestAllStrategies,
} from './backtest';

export interface Recommendation {
  symbol: string;
  name: string;
  action: Signal;
  confidence: number;
  chosenStrategy: StrategyKey;
  chosenLabel: string;
  perf: StrategyPerformance[];
  fallback: boolean;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  rewardToRisk: number | null;
  reason: string;
}

export function maxAllowedDrawdown(riskPercent: number): number {
  if (riskPercent <= 1) return 10;
  if (riskPercent <= 3) return 25;
  return Infinity;
}

export function getRecommendation(s: SymbolData, riskPercent: number): Recommendation {
  const perfMap = backtestAllStrategies(s);
  const perfArr = (Object.values(perfMap) as StrategyPerformance[]).sort((a, b) => b.score - a.score);

  const ddCap = maxAllowedDrawdown(riskPercent);
  const eligible = perfArr.filter(p => p.trades >= 5 && p.maxDrawdown <= ddCap && p.score > 0);

  let chosen: StrategyPerformance;
  let fallback = false;
  if (eligible.length > 0) {
    chosen = eligible[0];
  } else {
    const ranked = [...perfArr].sort((a, b) => a.maxDrawdown - b.maxDrawdown);
    chosen = ranked[0];
    fallback = true;
  }

  const action = s.signals[chosen.strategy].signal;

  const entry = s.price;
  const bb = s.signals.bollinger;
  const bbLower = bb.latestLower || 0;
  const bbUpper = bb.latestUpper || 0;

  let stopLoss: number | null = null;
  let takeProfit: number | null = null;

  if (action === 'BUY') {
    const bbStop = bbLower > 0 && bbLower < entry ? bbLower * 0.99 : entry * 0.95;
    stopLoss = bbStop;
    takeProfit = bbUpper > entry ? bbUpper : entry * 1.1;
  } else if (action === 'SELL') {
    const bbStop = bbUpper > 0 && bbUpper > entry ? bbUpper * 1.01 : entry * 1.05;
    stopLoss = bbStop;
    takeProfit = bbLower > 0 && bbLower < entry ? bbLower : entry * 0.9;
  }

  let rewardToRisk: number | null = null;
  if (stopLoss != null && takeProfit != null) {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    rewardToRisk = risk > 0 ? reward / risk : null;
  }

  const confidence = action === 'HOLD' ? 0 : Math.max(0.1, Math.min(1, chosen.winRate));

  const reason = action === 'HOLD'
    ? `${chosen.label} currently neutral on this symbol`
    : `${chosen.label} signals ${action} (${(chosen.winRate * 100).toFixed(0)}% historical win rate)`;

  return {
    symbol: s.symbol,
    name: s.name,
    action,
    confidence,
    chosenStrategy: chosen.strategy,
    chosenLabel: chosen.label,
    perf: perfArr,
    fallback,
    entry,
    stopLoss,
    takeProfit,
    rewardToRisk,
    reason,
  };
}

export interface PositionSize {
  units: number;
  dollarAmount: number;
  riskAmount: number;
  stopDistance: number;
  pctOfAccount: number;
}

export function calculatePositionSize(
  rec: Recommendation,
  accountSize: number,
  riskPercent: number,
  isFractional: boolean
): PositionSize | null {
  if (rec.action === 'HOLD' || rec.stopLoss == null || accountSize <= 0) return null;

  const riskAmount = accountSize * (riskPercent / 100);
  const stopDistance = Math.abs(rec.entry - rec.stopLoss);
  if (stopDistance <= 0) return null;

  const rawUnits = riskAmount / stopDistance;
  const units = isFractional ? Math.floor(rawUnits * 1e6) / 1e6 : Math.floor(rawUnits);
  if (units <= 0) return null;

  const dollarAmount = units * rec.entry;
  if (dollarAmount > accountSize) {
    const cappedUnits = isFractional
      ? Math.floor((accountSize / rec.entry) * 1e6) / 1e6
      : Math.floor(accountSize / rec.entry);
    if (cappedUnits <= 0) return null;
    return {
      units: cappedUnits,
      dollarAmount: cappedUnits * rec.entry,
      riskAmount: cappedUnits * stopDistance,
      stopDistance,
      pctOfAccount: ((cappedUnits * rec.entry) / accountSize) * 100,
    };
  }

  return {
    units,
    dollarAmount,
    riskAmount: units * stopDistance,
    stopDistance,
    pctOfAccount: (dollarAmount / accountSize) * 100,
  };
}

export function rankRecommendations(recs: Recommendation[]): {
  buys: Recommendation[];
  sells: Recommendation[];
} {
  const buys = recs
    .filter(r => r.action === 'BUY')
    .sort((a, b) => b.confidence - a.confidence);
  const sells = recs
    .filter(r => r.action === 'SELL')
    .sort((a, b) => b.confidence - a.confidence);
  return { buys, sells };
}

export { STRATEGY_LABELS };
export type { StrategyKey, StrategyPerformance };
