import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

const prevSignals = new Map<string, string>();

export async function logSignalIfChanged(
  symbol: string,
  strategy: string,
  signal: string,
  value: number | null,
  reason: string,
  price: number
) {
  if (signal === 'HOLD') return;
  const key = `${symbol}:${strategy}`;
  if (prevSignals.get(key) === signal) return;
  prevSignals.set(key, signal);

  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.from('signal_history').insert({ symbol, strategy, signal, value, reason, price });
}
