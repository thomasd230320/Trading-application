import type { SymbolData, Signal } from './types';

const STRATEGY_LABEL = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'BB',
  maCrossover: 'MA×',
} as const;

export interface Recommendation {
  symbol: string;
  name: string;
  action: Signal;
  confidence: number;
  buyCount: number;
  sellCount: number;
  agreeingStrategies: string[];
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  rewardToRisk: number | null;
  reason: string;
}

export function getRecommendation(s: SymbolData): Recommendation {
  const sigs = s.signals;
  const all = [
    { name: STRATEGY_LABEL.rsi, sig: sigs.rsi.signal },
    { name: STRATEGY_LABEL.macd, sig: sigs.macd.signal },
    { name: STRATEGY_LABEL.bollinger, sig: sigs.bollinger.signal },
    { name: STRATEGY_LABEL.maCrossover, sig: sigs.maCrossover.signal },
  ];
  const buys = all.filter(x => x.sig === 'BUY');
  const sells = all.filter(x => x.sig === 'SELL');

  let action: Signal = 'HOLD';
  let agreeingStrategies: string[] = [];
  if (buys.length >= 2 && buys.length > sells.length) {
    action = 'BUY';
    agreeingStrategies = buys.map(b => b.name);
  } else if (sells.length >= 2 && sells.length > buys.length) {
    action = 'SELL';
    agreeingStrategies = sells.map(b => b.name);
  } else if (buys.length === 1 && sells.length === 0) {
    action = 'BUY';
    agreeingStrategies = buys.map(b => b.name);
  } else if (sells.length === 1 && buys.length === 0) {
    action = 'SELL';
    agreeingStrategies = sells.map(b => b.name);
  }

  const confidence = Math.max(buys.length, sells.length) / 4;

  const entry = s.price;
  const bbLower = sigs.bollinger.latestLower || 0;
  const bbUpper = sigs.bollinger.latestUpper || 0;

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

  const reason = agreeingStrategies.length
    ? `${agreeingStrategies.join(' + ')} signal ${action}`
    : 'No consensus across strategies';

  return {
    symbol: s.symbol,
    name: s.name,
    action,
    confidence,
    buyCount: buys.length,
    sellCount: sells.length,
    agreeingStrategies,
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
    .sort((a, b) => b.confidence - a.confidence || b.buyCount - a.buyCount);
  const sells = recs
    .filter(r => r.action === 'SELL')
    .sort((a, b) => b.confidence - a.confidence || b.sellCount - a.sellCount);
  return { buys, sells };
}
