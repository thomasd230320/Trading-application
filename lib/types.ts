export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

export type Signal = 'BUY' | 'SELL' | 'HOLD';

export interface RSISignal {
  signal: Signal;
  value: number;
  series: LinePoint[];
  reason: string;
}

export interface MACDSignal {
  signal: Signal;
  macdLine: LinePoint[];
  signalLine: LinePoint[];
  histogram: LinePoint[];
  latestMACD: number;
  latestSignal: number;
  latestHistogram: number;
  reason: string;
}

export interface BBSignal {
  signal: Signal;
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
  latestUpper: number;
  latestMiddle: number;
  latestLower: number;
  latestClose: number;
  bandwidthPct: number;
  reason: string;
}

export interface MACrossoverSignal {
  signal: Signal;
  sma20: LinePoint[];
  sma50: LinePoint[];
  ema12: LinePoint[];
  ema26: LinePoint[];
  latestSMA20: number;
  latestSMA50: number;
  crossoverType: 'golden' | 'death' | 'none';
  reason: string;
}

export interface SymbolSignals {
  rsi: RSISignal;
  macd: MACDSignal;
  bollinger: BBSignal;
  maCrossover: MACrossoverSignal;
}

export interface SymbolData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  marketState: string;
  ohlcv: OHLCVBar[];
  signals: SymbolSignals;
}

export interface MarketDataResponse {
  timestamp: number;
  symbols: SymbolData[];
  error?: string;
}

export interface SignalHistoryEntry {
  id: number;
  symbol: string;
  strategy: string;
  signal: string;
  value: number | null;
  reason: string | null;
  price: number | null;
  created_at: string;
}

export interface SignalHistoryResponse {
  entries: SignalHistoryEntry[];
}
