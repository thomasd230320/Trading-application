'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MarketDataResponse } from '@/lib/types';

const POLL_INTERVAL = 5000;

export function useMarketData(symbols: string[]) {
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const symbolKey = symbols.join(',');

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`/api/market-data?symbols=${symbolKey}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MarketDataResponse = await res.json();
      if (mountedRef.current) { setData(json); setLoading(false); setError(null); }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
        setLoading(false);
      }
    }
  }, [symbolKey]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  return { data, loading, error };
}

export function useSignalHistory(symbol?: string, strategy?: string, limit = 20) {
  const [entries, setEntries] = useState<import('@/lib/types').SignalHistoryEntry[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const params = new URLSearchParams({ limit: String(limit) });
    if (symbol) params.set('symbol', symbol);
    if (strategy) params.set('strategy', strategy);

    fetch(`/api/signals/history?${params}`)
      .then(r => r.json())
      .then(d => { if (mountedRef.current) setEntries(d.entries ?? []); })
      .catch(() => {});

    return () => { mountedRef.current = false; };
  }, [symbol, strategy, limit]);

  return entries;
}
