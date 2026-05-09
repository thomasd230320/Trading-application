'use client';

import { useState, KeyboardEvent } from 'react';

const SUGGESTIONS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'NFLX',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'DOGE-USD', 'XRP-USD', 'SPY', 'QQQ', 'COIN', 'PLTR'];

interface Props {
  symbols: string[];
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export default function TickerSelector({ symbols, onAdd, onRemove }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = SUGGESTIONS.filter(
    s => s.includes(input.toUpperCase()) && !symbols.includes(s)
  ).slice(0, 6);

  function add(symbol: string) {
    const s = symbol.trim().toUpperCase();
    if (s && !symbols.includes(s) && symbols.length < 15) {
      onAdd(s);
      setInput('');
      setShowSuggestions(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') add(input);
    if (e.key === 'Escape') setShowSuggestions(false);
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full">
      {/* Current symbols */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {symbols.map(s => (
          <div
            key={s}
            className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg pl-2.5 pr-1 py-1"
          >
            <span className="text-sm text-white font-medium">{s}</span>
            <button
              onClick={() => onRemove(s)}
              className="text-gray-500 hover:text-red-400 active:text-red-300 transition-colors w-6 h-6 inline-flex items-center justify-center text-xs leading-none"
              aria-label={`Remove ${s}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      {symbols.length < 15 && (
        <div className="relative">
          <input
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setShowSuggestions(true); }}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="+ Add symbol"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="bg-gray-800 border border-gray-700 text-white text-base sm:text-sm rounded-lg px-3 py-2 sm:py-1.5 w-32 sm:w-36 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute top-full mt-1 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 w-40 overflow-hidden">
              {filtered.map(s => (
                <button
                  key={s}
                  onMouseDown={() => add(s)}
                  className="w-full text-left px-3 py-2.5 sm:py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
