import type { SymbolData, OHLCVBar, LinePoint } from './types';

export type StrategyKey = 'rsi' | 'macd' | 'bollinger' | 'maCrossover';

export const STRATEGY_LABELS: Record<StrategyKey, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'Bollinger',
  maCrossover: 'MA Crossover',
};

export interface StrategyPerformance {
  strategy: StrategyKey;
  label: string;
  trades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  avgReturnPerTrade: number;
  score: number;
}

interface Trade {
  entryIdx: number;
  exitIdx: number;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

function indexByTime(points: LinePoint[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of points) m.set(p.time, p.value);
  return m;
}

type SignalEvent = 'BUY' | 'SELL' | null;

function rsiEvents(bars: OHLCVBar[], series: LinePoint[]): SignalEvent[] {
  const byTime = indexByTime(series);
  const events: SignalEvent[] = new Array(bars.length).fill(null);
  let prev: number | undefined;
  for (let i = 0; i < bars.length; i++) {
    const cur = byTime.get(bars[i].time);
    if (cur == null) { prev = undefined; continue; }
    if (prev != null) {
      if (prev >= 30 && cur < 30) events[i] = 'BUY';
      else if (prev <= 70 && cur > 70) events[i] = 'SELL';
    }
    prev = cur;
  }
  return events;
}

function macdEvents(bars: OHLCVBar[], macdLine: LinePoint[], signalLine: LinePoint[]): SignalEvent[] {
  const macdMap = indexByTime(macdLine);
  const sigMap = indexByTime(signalLine);
  const events: SignalEvent[] = new Array(bars.length).fill(null);
  let prevMacd: number | undefined;
  let prevSig: number | undefined;
  for (let i = 0; i < bars.length; i++) {
    const m = macdMap.get(bars[i].time);
    const s = sigMap.get(bars[i].time);
    if (m == null || s == null) { prevMacd = undefined; prevSig = undefined; continue; }
    if (prevMacd != null && prevSig != null) {
      const wasAbove = prevMacd > prevSig;
      const nowAbove = m > s;
      if (!wasAbove && nowAbove) events[i] = 'BUY';
      else if (wasAbove && !nowAbove) events[i] = 'SELL';
    }
    prevMacd = m;
    prevSig = s;
  }
  return events;
}

function bollingerEvents(bars: OHLCVBar[], upper: LinePoint[], lower: LinePoint[]): SignalEvent[] {
  const upMap = indexByTime(upper);
  const loMap = indexByTime(lower);
  const events: SignalEvent[] = new Array(bars.length).fill(null);
  let prevState: 'inside' | 'low' | 'high' = 'inside';
  for (let i = 0; i < bars.length; i++) {
    const u = upMap.get(bars[i].time);
    const l = loMap.get(bars[i].time);
    if (u == null || l == null) { prevState = 'inside'; continue; }
    const c = bars[i].close;
    let state: 'inside' | 'low' | 'high' = 'inside';
    if (c <= l) state = 'low';
    else if (c >= u) state = 'high';
    if (state === 'low' && prevState !== 'low') events[i] = 'BUY';
    else if (state === 'high' && prevState !== 'high') events[i] = 'SELL';
    prevState = state;
  }
  return events;
}

function maCrossoverEvents(bars: OHLCVBar[], sma20: LinePoint[], sma50: LinePoint[]): SignalEvent[] {
  const fastMap = indexByTime(sma20);
  const slowMap = indexByTime(sma50);
  const events: SignalEvent[] = new Array(bars.length).fill(null);
  let prevFast: number | undefined;
  let prevSlow: number | undefined;
  for (let i = 0; i < bars.length; i++) {
    const f = fastMap.get(bars[i].time);
    const s = slowMap.get(bars[i].time);
    if (f == null || s == null) { prevFast = undefined; prevSlow = undefined; continue; }
    if (prevFast != null && prevSlow != null) {
      const wasAbove = prevFast > prevSlow;
      const nowAbove = f > s;
      if (!wasAbove && nowAbove) events[i] = 'BUY';
      else if (wasAbove && !nowAbove) events[i] = 'SELL';
    }
    prevFast = f;
    prevSlow = s;
  }
  return events;
}

function simulate(bars: OHLCVBar[], events: SignalEvent[]): Trade[] {
  const trades: Trade[] = [];
  let entryIdx: number | null = null;
  for (let i = 0; i < bars.length; i++) {
    const e = events[i];
    if (entryIdx == null && e === 'BUY') {
      entryIdx = i;
    } else if (entryIdx != null && e === 'SELL') {
      const entryPrice = bars[entryIdx].close;
      const exitPrice = bars[i].close;
      trades.push({
        entryIdx,
        exitIdx: i,
        entryPrice,
        exitPrice,
        returnPct: ((exitPrice - entryPrice) / entryPrice) * 100,
      });
      entryIdx = null;
    }
  }
  if (entryIdx != null && bars.length > entryIdx) {
    const entryPrice = bars[entryIdx].close;
    const exitPrice = bars[bars.length - 1].close;
    trades.push({
      entryIdx,
      exitIdx: bars.length - 1,
      entryPrice,
      exitPrice,
      returnPct: ((exitPrice - entryPrice) / entryPrice) * 100,
    });
  }
  return trades;
}

function summarize(strategy: StrategyKey, trades: Trade[]): StrategyPerformance {
  const label = STRATEGY_LABELS[strategy];
  if (trades.length === 0) {
    return {
      strategy,
      label,
      trades: 0,
      winRate: 0,
      totalReturn: 0,
      maxDrawdown: 0,
      avgReturnPerTrade: 0,
      score: 0,
    };
  }

  const wins = trades.filter(t => t.returnPct > 0).length;
  const winRate = wins / trades.length;

  let equity = 1;
  let peak = 1;
  let maxDD = 0;
  for (const t of trades) {
    equity *= 1 + t.returnPct / 100;
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  const totalReturn = (equity - 1) * 100;
  const maxDrawdown = maxDD * 100;
  const avgReturnPerTrade = trades.reduce((a, t) => a + t.returnPct, 0) / trades.length;

  const ddFloor = Math.max(maxDrawdown, 0.01);
  const baseScore = (totalReturn * winRate) / ddFloor;
  const score = trades.length < 2 ? 0 : Math.max(0, baseScore);

  return {
    strategy,
    label,
    trades: trades.length,
    winRate,
    totalReturn,
    maxDrawdown,
    avgReturnPerTrade,
    score,
  };
}

export function backtestStrategy(s: SymbolData, key: StrategyKey): StrategyPerformance {
  const bars = s.ohlcv;
  let events: SignalEvent[] = [];
  switch (key) {
    case 'rsi':
      events = rsiEvents(bars, s.signals.rsi.series);
      break;
    case 'macd':
      events = macdEvents(bars, s.signals.macd.macdLine, s.signals.macd.signalLine);
      break;
    case 'bollinger':
      events = bollingerEvents(bars, s.signals.bollinger.upper, s.signals.bollinger.lower);
      break;
    case 'maCrossover':
      events = maCrossoverEvents(bars, s.signals.maCrossover.sma20, s.signals.maCrossover.sma50);
      break;
  }
  return summarize(key, simulate(bars, events));
}

export function backtestAllStrategies(s: SymbolData): Record<StrategyKey, StrategyPerformance> {
  return {
    rsi: backtestStrategy(s, 'rsi'),
    macd: backtestStrategy(s, 'macd'),
    bollinger: backtestStrategy(s, 'bollinger'),
    maCrossover: backtestStrategy(s, 'maCrossover'),
  };
}
