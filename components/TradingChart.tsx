'use client';

import dynamic from 'next/dynamic';
import type { OHLCVBar, LinePoint } from '@/lib/types';

export interface OverlaySeries {
  data: LinePoint[];
  color: string;
  label: string;
  lineWidth?: number;
  dashed?: boolean;
}

export interface SubSeries {
  data: LinePoint[];
  type: 'line' | 'histogram';
  color: string;
  label: string;
  positiveColor?: string;
  negativeColor?: string;
}

export interface TradingChartProps {
  ohlcv: OHLCVBar[];
  overlays?: OverlaySeries[];
  subSeries?: SubSeries[];
  mainHeight?: number;
  subHeight?: number;
  refLines?: { value: number; color: string; label: string }[];
}

const TradingChartInner = dynamic(() => import('./TradingChartInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-gray-900 rounded-lg animate-pulse" style={{ height: 500 }}>
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-700 text-sm">Loading chart…</div>
      </div>
    </div>
  ),
});

export default function TradingChart(props: TradingChartProps) {
  return <TradingChartInner {...props} />;
}
