'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MarketDataResponse } from '@/lib/types';

const DEFAULT_POLL_INTERVAL = 5000;

export function useMarketData(symbols: string[], pollInterval: number = DEFAULT_POLL_INTERVAL) {
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const symbolKey = symbols.join(',');

  const fetchData = useCallback(async (opts: { bust?: boolean } = {}) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    if (opts.bust && mountedRef.current) setRefreshing(true);
    try {
      const url = `/api/market-data?symbols=${symbolKey}${opts.bust ? `&bust=${Date.now()}` : ''}`;
      const res = await fetch(url, { signal: abortRef.current.signal, cache: 'no-store' });
      const json: MarketDataResponse = await res.json().catch(() => ({ timestamp: Date.now(), symbols: [] }));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (mountedRef.current) {
        setData(json);
        setLoading(false);
        setError(json.error ?? null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
        setLoading(false);
      }
    } finally {
      if (mountedRef.current && opts.bust) setRefreshing(false);
    }
  }, [symbolKey]);

  const refresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchData({ bust: true });
    intervalRef.current = setInterval(fetchData, pollInterval);
  }, [fetchData, pollInterval]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    intervalRef.current = setInterval(fetchData, pollInterval);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData, pollInterval]);

  return { data, loading, refreshing, error, refresh };
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
