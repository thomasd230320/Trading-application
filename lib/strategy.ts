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
  chosenScore: number;
  perf: StrategyPerformance[];
  fallback: boolean;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  rewardToRisk: number | null;
  reason: string;
}

export function maxAllowedDrawdown(riskPercent: number): number {
  if (riskPercent <= 25) return 12;
  if (riskPercent <= 50) return 30;
  return Infinity;
}

function chosenStance(s: SymbolData, key: StrategyKey): Signal {
  switch (key) {
    case 'rsi': {
      const v = s.signals.rsi.value;
      if (v <= 35) return 'BUY';
      if (v >= 65) return 'SELL';
      return 'HOLD';
    }
    case 'macd': {
      const m = s.signals.macd.latestMACD;
      const sig = s.signals.macd.latestSignal;
      const hist = s.signals.macd.latestHistogram;
      if (m === 0 && sig === 0) return 'HOLD';
      if (m > sig && hist >= 0) return 'BUY';
      if (m < sig && hist <= 0) return 'SELL';
      return 'HOLD';
    }
    case 'bollinger': {
      const u = s.signals.bollinger.latestUpper;
      const l = s.signals.bollinger.latestLower;
      const m = s.signals.bollinger.latestMiddle;
      const c = s.signals.bollinger.latestClose;
      if (!u || !l || !m) return 'HOLD';
      const range = u - l;
      const pctB = range > 0 ? (c - l) / range : 0.5;
      if (pctB <= 0.25) return 'BUY';
      if (pctB >= 0.75) return 'SELL';
      return 'HOLD';
    }
    case 'maCrossover': {
      const fast = s.signals.maCrossover.latestSMA20;
      const slow = s.signals.maCrossover.latestSMA50;
      if (!fast || !slow) return 'HOLD';
      const spread = ((fast - slow) / slow) * 100;
      if (spread > 0.25) return 'BUY';
      if (spread < -0.25) return 'SELL';
      return 'HOLD';
    }
  }
}

export function getRecommendation(s: SymbolData, riskPercent: number): Recommendation {
  const perfMap = backtestAllStrategies(s);
  const perfArr = (Object.values(perfMap) as StrategyPerformance[]).sort((a, b) => b.score - a.score);

  const ddCap = maxAllowedDrawdown(riskPercent);
  const eligible = perfArr.filter(p => p.trades >= 2 && p.maxDrawdown <= ddCap && p.score > 0);

  let chosen: StrategyPerformance;
  let fallback = false;
  if (eligible.length > 0) {
    chosen = eligible[0];
  } else {
    const ranked = [...perfArr].sort((a, b) => a.maxDrawdown - b.maxDrawdown);
    chosen = ranked[0];
    fallback = true;
  }

  const action = chosenStance(s, chosen.strategy);

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
    chosenScore: chosen.score,
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
  const byScore = (a: Recommendation, b: Recommendation) =>
    b.chosenScore - a.chosenScore || b.confidence - a.confidence;
  const buys = recs.filter(r => r.action === 'BUY').sort(byScore);
  const sells = recs.filter(r => r.action === 'SELL').sort(byScore);
  return { buys, sells };
}

export { STRATEGY_LABELS };
export type { StrategyKey, StrategyPerformance };
