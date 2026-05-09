import _yahooFinance from 'yahoo-finance2';
import type { OHLCVBar } from './types';

// yahoo-finance2 exports an instance but its .d.ts types it as a constructor.
// Cast to a simple interface to avoid the 'this' context type error.
interface YF {
  quote(symbol: string): Promise<unknown>;
  historical(symbol: string, opts: {
    period1: Date;
    period2: Date;
    interval: '1d' | '1wk' | '1mo';
  }): Promise<unknown[]>;
}
const yf = _yahooFinance as unknown as YF;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

type AnyData = Record<string, unknown>;

const quoteCache = new Map<string, CacheEntry<AnyData>>();
const histCache = new Map<string, CacheEntry<OHLCVBar[]>>();

const QUOTE_TTL = 4500;
const HIST_TTL = 60_000;

export async function fetchQuote(symbol: string): Promise<AnyData> {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < QUOTE_TTL) return cached.data;

  const data = (await yf.quote(symbol)) as AnyData;
  quoteCache.set(symbol, { data, fetchedAt: Date.now() });
  return data;
}

export async function fetchHistorical(symbol: string, days = 90): Promise<OHLCVBar[]> {
  const key = `${symbol}:${days}`;
  const cached = histCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < HIST_TTL) return cached.data;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const raw = (await yf.historical(symbol, {
    period1: startDate,
    period2: new Date(),
    interval: '1d',
  })) as AnyData[];

  const bars: OHLCVBar[] = raw
    .filter(r => r.open != null && r.close != null)
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())
    .map(r => ({
      time: Math.floor(new Date(r.date as string).getTime() / 1000),
      open: r.open as number,
      high: r.high as number,
      low: r.low as number,
      close: r.close as number,
      volume: (r.volume as number) ?? 0,
    }));

  histCache.set(key, { data: bars, fetchedAt: Date.now() });
  return bars;
}
