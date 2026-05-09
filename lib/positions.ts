export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'open' | 'closed';
export type ExitReason = 'manual' | 'stop' | 'target';

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  strategy: string;
  entryPrice: number;
  entryTime: number;
  units: number;
  stopLoss: number;
  takeProfit: number | null;
  status: PositionStatus;
  exitPrice?: number;
  exitTime?: number;
  exitReason?: ExitReason;
}

export const POSITIONS_KEY = 'tradeview.positions.v1';

export function loadPositions(): Position[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPosition);
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {}
}

function isValidPosition(p: unknown): p is Position {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.symbol === 'string' &&
    (o.side === 'LONG' || o.side === 'SHORT') &&
    typeof o.entryPrice === 'number' &&
    typeof o.entryTime === 'number' &&
    typeof o.units === 'number' &&
    typeof o.stopLoss === 'number' &&
    (o.status === 'open' || o.status === 'closed')
  );
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function makePosition(input: Omit<Position, 'id' | 'entryTime' | 'status'>): Position {
  return { ...input, id: newId(), entryTime: Date.now(), status: 'open' };
}

export interface OpenPnL {
  unrealized: number;
  unrealizedPct: number;
  riskRemaining: number;
  toStopPct: number;
  toTargetPct: number | null;
  hitStop: boolean;
  hitTarget: boolean;
}

export function openPnL(p: Position, currentPrice: number): OpenPnL {
  const dir = p.side === 'LONG' ? 1 : -1;
  const unrealized = (currentPrice - p.entryPrice) * p.units * dir;
  const cost = p.entryPrice * p.units;
  const unrealizedPct = cost > 0 ? (unrealized / cost) * 100 : 0;
  const riskRemaining = Math.max(0, Math.abs(currentPrice - p.stopLoss) * p.units * (p.side === 'LONG' ? (currentPrice > p.stopLoss ? 1 : 0) : (currentPrice < p.stopLoss ? 1 : 0)));
  const toStopPct = ((p.stopLoss - currentPrice) / currentPrice) * 100 * dir * -1;
  const toTargetPct = p.takeProfit != null
    ? ((p.takeProfit - currentPrice) / currentPrice) * 100 * dir
    : null;
  const hitStop = p.side === 'LONG' ? currentPrice <= p.stopLoss : currentPrice >= p.stopLoss;
  const hitTarget = p.takeProfit != null
    ? p.side === 'LONG' ? currentPrice >= p.takeProfit : currentPrice <= p.takeProfit
    : false;
  return { unrealized, unrealizedPct, riskRemaining, toStopPct, toTargetPct, hitStop, hitTarget };
}

export function closedPnL(p: Position): { realized: number; realizedPct: number } {
  if (p.status !== 'closed' || p.exitPrice == null) return { realized: 0, realizedPct: 0 };
  const dir = p.side === 'LONG' ? 1 : -1;
  const realized = (p.exitPrice - p.entryPrice) * p.units * dir;
  const cost = p.entryPrice * p.units;
  const realizedPct = cost > 0 ? (realized / cost) * 100 : 0;
  return { realized, realizedPct };
}

export interface PortfolioSummary {
  openCount: number;
  exposure: number;
  unrealized: number;
  totalRiskAtStop: number;
  realized: number;
  closedCount: number;
  wins: number;
  losses: number;
}

export function summarize(positions: Position[], priceMap: Record<string, number>): PortfolioSummary {
  let exposure = 0;
  let unrealized = 0;
  let totalRiskAtStop = 0;
  let openCount = 0;
  let realized = 0;
  let closedCount = 0;
  let wins = 0;
  let losses = 0;

  for (const p of positions) {
    if (p.status === 'open') {
      openCount++;
      const cur = priceMap[p.symbol] ?? p.entryPrice;
      const dir = p.side === 'LONG' ? 1 : -1;
      exposure += cur * p.units;
      unrealized += (cur - p.entryPrice) * p.units * dir;
      totalRiskAtStop += Math.abs(p.entryPrice - p.stopLoss) * p.units;
    } else {
      closedCount++;
      const { realized: r } = closedPnL(p);
      realized += r;
      if (r > 0) wins++;
      else if (r < 0) losses++;
    }
  }

  return { openCount, exposure, unrealized, totalRiskAtStop, realized, closedCount, wins, losses };
}
