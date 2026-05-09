'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { TradingChartProps } from './TradingChart';

const CHART_OPTS = {
  layout: { background: { color: '#111827' }, textColor: '#6B7280' },
  grid: { vertLines: { color: '#1F2937' }, horzLines: { color: '#1F2937' } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: '#374151' },
  timeScale: { borderColor: '#374151', timeVisible: true, secondsVisible: false },
};

export default function TradingChartInner({
  ohlcv,
  overlays = [],
  subSeries = [],
  mainHeight = 380,
  subHeight = 160,
  refLines = [],
}: TradingChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const subChartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const overlayRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const subSeriesRefs = useRef<Array<ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>>([]);

  // Mount: create charts once
  useEffect(() => {
    if (!mainRef.current) return;

    const main = createChart(mainRef.current, {
      ...CHART_OPTS,
      width: mainRef.current.clientWidth,
      height: mainHeight,
    });

    const candle = main.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    } as Partial<CandlestickSeriesOptions>);
    candleRef.current = candle;

    overlayRefs.current = overlays.map(o => {
      const s = main.addLineSeries({
        color: o.color,
        lineWidth: (o.lineWidth ?? 1) as 1 | 2 | 3 | 4,
        lineStyle: o.dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: o.label,
      });
      return s;
    });

    mainChartRef.current = main;

    // Sub chart
    if (subSeries.length && subRef.current) {
      const sub = createChart(subRef.current, {
        ...CHART_OPTS,
        width: subRef.current.clientWidth,
        height: subHeight,
      });

      subSeriesRefs.current = subSeries.map(s => {
        if (s.type === 'histogram') {
          const hs = sub.addHistogramSeries({
            color: s.color,
            priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
          });
          return hs;
        }
        const ls = sub.addLineSeries({
          color: s.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
          title: s.label,
        });
        // Add reference lines (e.g., RSI 30/70)
        refLines.forEach(rl => {
          ls.createPriceLine({ price: rl.value, color: rl.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: rl.label });
        });
        return ls;
      });

      // Sync timescales
      main.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) sub.timeScale().setVisibleLogicalRange(range);
      });
      sub.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) main.timeScale().setVisibleLogicalRange(range);
      });

      subChartRef.current = sub;

      const subRo = new ResizeObserver(() => {
        if (subRef.current) sub.applyOptions({ width: subRef.current.clientWidth });
      });
      subRo.observe(subRef.current);
    }

    const ro = new ResizeObserver(() => {
      if (mainRef.current) main.applyOptions({ width: mainRef.current.clientWidth });
    });
    ro.observe(mainRef.current);

    return () => {
      ro.disconnect();
      main.remove();
      mainChartRef.current = null;
      subChartRef.current?.remove();
      subChartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers: cast number times to UTCTimestamp (branded type)
  function asCandles(bars: typeof ohlcv) {
    return bars.map(b => ({ ...b, time: b.time as UTCTimestamp }));
  }
  function asLine(pts: { time: number; value: number }[]) {
    return pts.map(p => ({ time: p.time as UTCTimestamp, value: p.value }));
  }

  // Data updates (runs every 5s)
  useEffect(() => {
    if (candleRef.current && ohlcv.length) {
      candleRef.current.setData(asCandles(ohlcv));
      mainChartRef.current?.timeScale().fitContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ohlcv]);

  useEffect(() => {
    overlays.forEach((o, i) => {
      if (overlayRefs.current[i] && o.data.length) {
        overlayRefs.current[i].setData(asLine(o.data));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays]);

  useEffect(() => {
    subSeries.forEach((s, i) => {
      const ref = subSeriesRefs.current[i];
      if (ref && s.data.length) {
        if (s.type === 'histogram' && s.positiveColor && s.negativeColor) {
          const colored = s.data.map(p => ({
            time: p.time as UTCTimestamp,
            value: p.value,
            color: p.value >= 0 ? s.positiveColor! : s.negativeColor!,
          }));
          (ref as ISeriesApi<'Histogram'>).setData(colored);
        } else {
          (ref as ISeriesApi<'Line'>).setData(asLine(s.data));
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSeries]);

  const hasSubChart = subSeries.length > 0;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-800">
      <div ref={mainRef} className="w-full" />
      {hasSubChart && (
        <>
          <div className="border-t border-gray-800" />
          <div ref={subRef} className="w-full" />
        </>
      )}
    </div>
  );
}
