import { RSI, MACD, BollingerBands, SMA, EMA } from 'technicalindicators';
import type {
  OHLCVBar,
  LinePoint,
  RSISignal,
  MACDSignal,
  BBSignal,
  MACrossoverSignal,
  Signal,
} from './types';

function toPoints(times: number[], values: (number | undefined)[]): LinePoint[] {
  const out: LinePoint[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== undefined && !isNaN(v)) out.push({ time: times[i], value: v });
  }
  return out;
}

export function computeRSI(bars: OHLCVBar[]): RSISignal {
  const closes = bars.map(b => b.close);
  if (closes.length < 15) {
    return { signal: 'HOLD', value: 50, series: [], reason: 'Insufficient data' };
  }

  const rsiVals = RSI.calculate({ values: closes, period: 14 });
  const latest = rsiVals[rsiVals.length - 1];
  const offset = closes.length - rsiVals.length;
  const series = toPoints(bars.slice(offset).map(b => b.time), rsiVals);

  let signal: Signal = 'HOLD';
  if (latest < 30) signal = 'BUY';
  else if (latest > 70) signal = 'SELL';

  return {
    signal,
    value: Math.round(latest * 10) / 10,
    series,
    reason: `RSI ${latest.toFixed(1)} — ${
      latest < 30 ? 'Oversold · potential reversal up' :
      latest > 70 ? 'Overbought · potential reversal down' :
      'Neutral range (30–70)'
    }`,
  };
}

export function computeMACD(bars: OHLCVBar[]): MACDSignal {
  const closes = bars.map(b => b.close);
  const empty: MACDSignal = {
    signal: 'HOLD', macdLine: [], signalLine: [], histogram: [],
    latestMACD: 0, latestSignal: 0, latestHistogram: 0, reason: 'Insufficient data',
  };
  if (closes.length < 35) return empty;

  const result = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const offset = closes.length - result.length;
  const times = bars.slice(offset).map(b => b.time);
  const macdLine = toPoints(times, result.map(r => r.MACD));
  const signalLine = toPoints(times, result.map(r => r.signal));
  const histogram = toPoints(times, result.map(r => r.histogram));

  const cur = result[result.length - 1];
  const prev = result[result.length - 2];
  const latestMACD = cur?.MACD ?? 0;
  const latestSignal = cur?.signal ?? 0;
  const latestHistogram = cur?.histogram ?? 0;

  let signal: Signal = 'HOLD';
  if (cur && prev) {
    const nowAbove = (cur.MACD ?? 0) > (cur.signal ?? 0);
    const wasAbove = (prev.MACD ?? 0) > (prev.signal ?? 0);
    if (!wasAbove && nowAbove) signal = 'BUY';
    else if (wasAbove && !nowAbove) signal = 'SELL';
  }

  return {
    signal, macdLine, signalLine, histogram,
    latestMACD: Math.round(latestMACD * 10000) / 10000,
    latestSignal: Math.round(latestSignal * 10000) / 10000,
    latestHistogram: Math.round(latestHistogram * 10000) / 10000,
    reason: `MACD ${latestMACD.toFixed(3)} / Sig ${latestSignal.toFixed(3)} — ${
      signal === 'BUY' ? 'Bullish crossover detected' :
      signal === 'SELL' ? 'Bearish crossover detected' :
      latestMACD > latestSignal ? 'MACD above signal (bullish)' : 'MACD below signal (bearish)'
    }`,
  };
}

export function computeBollinger(bars: OHLCVBar[]): BBSignal {
  const closes = bars.map(b => b.close);
  const last = closes[closes.length - 1] ?? 0;
  const empty: BBSignal = {
    signal: 'HOLD', upper: [], middle: [], lower: [],
    latestUpper: 0, latestMiddle: 0, latestLower: 0,
    latestClose: last, bandwidthPct: 0, reason: 'Insufficient data',
  };
  if (closes.length < 20) return empty;

  const result = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
  const offset = closes.length - result.length;
  const times = bars.slice(offset).map(b => b.time);

  const upper = toPoints(times, result.map(r => r.upper));
  const middle = toPoints(times, result.map(r => r.middle));
  const lower = toPoints(times, result.map(r => r.lower));

  const lat = result[result.length - 1];
  const bandwidthPct = ((lat.upper - lat.lower) / lat.middle) * 100;

  let signal: Signal = 'HOLD';
  if (last <= lat.lower) signal = 'BUY';
  else if (last >= lat.upper) signal = 'SELL';

  return {
    signal, upper, middle, lower,
    latestUpper: Math.round(lat.upper * 100) / 100,
    latestMiddle: Math.round(lat.middle * 100) / 100,
    latestLower: Math.round(lat.lower * 100) / 100,
    latestClose: Math.round(last * 100) / 100,
    bandwidthPct: Math.round(bandwidthPct * 10) / 10,
    reason: `$${last.toFixed(2)} vs BB [$${lat.lower.toFixed(2)}–$${lat.upper.toFixed(2)}] — ${
      signal === 'BUY' ? 'Price at lower band · oversold zone' :
      signal === 'SELL' ? 'Price at upper band · overbought zone' :
      `Inside bands · BW ${bandwidthPct.toFixed(1)}%`
    }`,
  };
}

export function computeMACrossover(bars: OHLCVBar[]): MACrossoverSignal {
  const closes = bars.map(b => b.close);
  const empty: MACrossoverSignal = {
    signal: 'HOLD', sma20: [], sma50: [], ema12: [], ema26: [],
    latestSMA20: 0, latestSMA50: 0, crossoverType: 'none', reason: 'Insufficient data',
  };
  if (closes.length < 50) return empty;

  const sma20Vals = SMA.calculate({ period: 20, values: closes });
  const sma50Vals = SMA.calculate({ period: 50, values: closes });
  const ema12Vals = EMA.calculate({ period: 12, values: closes });
  const ema26Vals = EMA.calculate({ period: 26, values: closes });

  const minLen = Math.min(sma20Vals.length, sma50Vals.length);
  const offset = closes.length - minLen;
  const times = bars.slice(offset).map(b => b.time);

  const s20 = sma20Vals.slice(sma20Vals.length - minLen);
  const s50 = sma50Vals.slice(sma50Vals.length - minLen);
  const e12 = ema12Vals.slice(ema12Vals.length - minLen);
  const e26 = ema26Vals.slice(ema26Vals.length - minLen);

  const latestSMA20 = s20[s20.length - 1];
  const prevSMA20 = s20[s20.length - 2];
  const latestSMA50 = s50[s50.length - 1];
  const prevSMA50 = s50[s50.length - 2];

  const nowAbove = latestSMA20 > latestSMA50;
  const wasAbove = prevSMA20 > prevSMA50;

  let signal: Signal = 'HOLD';
  let crossoverType: 'golden' | 'death' | 'none' = 'none';
  if (!wasAbove && nowAbove) { signal = 'BUY'; crossoverType = 'golden'; }
  else if (wasAbove && !nowAbove) { signal = 'SELL'; crossoverType = 'death'; }

  return {
    signal,
    sma20: toPoints(times, s20),
    sma50: toPoints(times, s50),
    ema12: toPoints(times, e12),
    ema26: toPoints(times, e26),
    latestSMA20: Math.round(latestSMA20 * 100) / 100,
    latestSMA50: Math.round(latestSMA50 * 100) / 100,
    crossoverType,
    reason: `SMA20 $${latestSMA20.toFixed(2)} vs SMA50 $${latestSMA50.toFixed(2)} — ${
      crossoverType === 'golden' ? 'Golden Cross · bullish breakout' :
      crossoverType === 'death' ? 'Death Cross · bearish breakdown' :
      nowAbove ? 'SMA20 above SMA50 (bullish trend)' : 'SMA20 below SMA50 (bearish trend)'
    }`,
  };
}
