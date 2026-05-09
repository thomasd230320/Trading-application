import type { Signal } from '@/lib/types';

interface Props {
  signal: Signal;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const COLORS: Record<Signal, string> = {
  BUY: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  SELL: 'bg-red-500/20 text-red-400 border border-red-500/40',
  HOLD: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
};

const SIZES = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded gap-0.5',
  sm: 'text-xs px-2 py-0.5 rounded gap-1',
  md: 'text-sm px-2.5 py-1 rounded-md gap-1',
  lg: 'text-base px-3 py-1.5 rounded-lg gap-1.5 font-semibold',
};

const ICONS: Record<Signal, string> = { BUY: '↑', SELL: '↓', HOLD: '→' };

export default function SignalBadge({ signal, size = 'md', showIcon = true }: Props) {
  return (
    <span className={`inline-flex items-center font-medium tracking-wide ${COLORS[signal]} ${SIZES[size]}`}>
      {showIcon && <span>{ICONS[signal]}</span>}
      {signal}
    </span>
  );
}
