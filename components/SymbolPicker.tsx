'use client';

interface Props {
  value: string;
  onChange: (symbol: string) => void;
  options?: string[];
}

const DEFAULT_OPTIONS = [
  'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'NFLX', 'COIN', 'PLTR',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'DOGE-USD',
];

export default function SymbolPicker({ value, onChange, options = DEFAULT_OPTIONS }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 text-white text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 cursor-pointer"
    >
      {options.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
