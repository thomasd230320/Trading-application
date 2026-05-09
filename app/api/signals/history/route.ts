import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const strategy = searchParams.get('strategy');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ entries: [] });

  let query = supabase
    .from('signal_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (symbol) query = query.eq('symbol', symbol.toUpperCase());
  if (strategy) query = query.eq('strategy', strategy);

  const { data } = await query;
  return NextResponse.json({ entries: data ?? [] });
}
