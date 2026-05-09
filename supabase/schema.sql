-- Run this in your Supabase SQL Editor
-- Dashboard: https://app.supabase.com → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS signal_history (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol    text    NOT NULL,
  strategy  text    NOT NULL,  -- 'rsi' | 'macd' | 'bollinger' | 'ma_crossover'
  signal    text    NOT NULL,  -- 'BUY' | 'SELL'
  value     numeric,
  reason    text,
  price     numeric,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signal_history_symbol   ON signal_history(symbol);
CREATE INDEX IF NOT EXISTS idx_signal_history_strategy ON signal_history(strategy);
CREATE INDEX IF NOT EXISTS idx_signal_history_created  ON signal_history(created_at DESC);

-- Enable RLS
ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public dashboard)
CREATE POLICY "public_read" ON signal_history
  FOR SELECT USING (true);

-- Allow service role to insert (API server uses service key, never anon)
CREATE POLICY "service_insert" ON signal_history
  FOR INSERT WITH CHECK (true);
