import YahooFinance from 'yahoo-finance2';
import type { OHLCVBar } from './types';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

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

interface ChartQuote {
  date: Date | string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export async function fetchHistorical(symbol: string, days = 90): Promise<OHLCVBar[]> {
  const key = `${symbol}:${days}`;
  const cached = histCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < HIST_TTL) return cached.data;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await yf.chart(symbol, {
    period1: startDate,
    period2: new Date(),
    interval: '1d',
  });

  const quotes = (result?.quotes ?? []) as ChartQuote[];

  const bars: OHLCVBar[] = quotes
    .filter(r => r.open != null && r.close != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      time: Math.floor(new Date(r.date).getTime() / 1000),
      open: r.open as number,
      high: r.high as number,
      low: r.low as number,
      close: r.close as number,
      volume: r.volume ?? 0,
    }));

  histCache.set(key, { data: bars, fetchedAt: Date.now() });
  return bars;
}
