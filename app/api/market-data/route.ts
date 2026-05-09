import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote, fetchHistorical } from '@/lib/yahoo-finance';
import { computeRSI, computeMACD, computeBollinger, computeMACrossover } from '@/lib/indicators';
import { logSignalIfChanged } from '@/lib/supabase';
import type { SymbolData, MarketDataResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SYMBOL_PATTERN = /^[A-Z0-9]{1,10}(?:[.-][A-Z0-9]{1,10})?$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols') ?? 'AAPL,BTC-USD';
  const bust = searchParams.has('bust');
  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => SYMBOL_PATTERN.test(s))
    .slice(0, 30);

  if (!symbols.length) {
    return NextResponse.json({ error: 'No valid symbols' }, { status: 400 });
  }

  const results = await Promise.allSettled(
    symbols.map(async (symbol): Promise<SymbolData> => {
      const [quote, bars] = await Promise.all([
        fetchQuote(symbol, bust),
        fetchHistorical(symbol, 90, bust),
      ]);

      const rsi = computeRSI(bars);
      const macd = computeMACD(bars);
      const bollinger = computeBollinger(bars);
      const maCrossover = computeMACrossover(bars);
      const price = (quote.regularMarketPrice as number) ?? 0;

      Promise.all([
        logSignalIfChanged(symbol, 'rsi', rsi.signal, rsi.value, rsi.reason, price),
        logSignalIfChanged(symbol, 'macd', macd.signal, macd.latestMACD, macd.reason, price),
        logSignalIfChanged(symbol, 'bollinger', bollinger.signal, bollinger.latestClose, bollinger.reason, price),
        logSignalIfChanged(symbol, 'ma_crossover', maCrossover.signal, maCrossover.latestSMA20, maCrossover.reason, price),
      ]).catch(() => {});

      return {
        symbol,
        name: (quote.shortName ?? quote.longName ?? symbol) as string,
        price,
        change: (quote.regularMarketChange as number) ?? 0,
        changePercent: (quote.regularMarketChangePercent as number) ?? 0,
        volume: (quote.regularMarketVolume as number) ?? 0,
        marketCap: quote.marketCap as number | undefined,
        marketState: (quote.marketState as string) ?? 'CLOSED',
        ohlcv: bars,
        signals: { rsi, macd, bollinger, maCrossover },
      };
    })
  );

  const symbolData: SymbolData[] = results
    .filter((r): r is PromiseFulfilledResult<SymbolData> => r.status === 'fulfilled')
    .map(r => r.value);

  const failures = results
    .map((r, i) => (r.status === 'rejected' ? { symbol: symbols[i], reason: String((r as PromiseRejectedResult).reason?.message ?? r.reason) } : null))
    .filter((x): x is { symbol: string; reason: string } => x !== null);

  if (!symbolData.length) {
    const detail = failures[0]?.reason ?? 'Unknown error';
    return NextResponse.json(
      { error: `Upstream data unavailable: ${detail}`, timestamp: Date.now(), symbols: [] },
      { status: 502 }
    );
  }

  const response: MarketDataResponse = {
    timestamp: Date.now(),
    symbols: symbolData,
    ...(failures.length ? { error: `Failed: ${failures.map(f => f.symbol).join(', ')}` } : {}),
  };
  return NextResponse.json(response);
}
