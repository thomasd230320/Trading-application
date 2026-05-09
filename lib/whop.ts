interface WhopMembership {
  id: string;
  status: string;
  product_id?: string;
  plan_id?: string;
  user_id?: string;
  email?: string;
  valid?: boolean;
}

interface WhopListResponse {
  data?: WhopMembership[];
  pagination?: unknown;
}

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const ACCEPTED_STATUSES = new Set(['active', 'trialing', 'completed']);

export interface WhopGateResult {
  ok: boolean;
  reason?: 'not_configured' | 'no_membership' | 'inactive' | 'api_error';
  detail?: string;
}

export function isWhopConfigured(): boolean {
  return !!process.env.WHOP_API_KEY;
}

export async function checkActiveMembership(email: string): Promise<WhopGateResult> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) return { ok: true, reason: 'not_configured' };

  const productId = process.env.WHOP_PRODUCT_ID;

  const url = new URL(`${WHOP_API_BASE}/memberships`);
  url.searchParams.set('email', email);

  let payload: WhopListResponse;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, reason: 'api_error', detail: `Whop API ${res.status}` };
    }
    payload = (await res.json()) as WhopListResponse;
  } catch (err) {
    return { ok: false, reason: 'api_error', detail: err instanceof Error ? err.message : 'fetch failed' };
  }

  const memberships = payload.data ?? [];
  if (memberships.length === 0) return { ok: false, reason: 'no_membership' };

  const matches = memberships.filter(m => {
    const statusOk = ACCEPTED_STATUSES.has((m.status ?? '').toLowerCase()) || m.valid === true;
    const productOk = !productId || m.product_id === productId || m.plan_id === productId;
    return statusOk && productOk;
  });

  if (matches.length === 0) return { ok: false, reason: 'inactive' };
  return { ok: true };
}

export function whopErrorMessage(reason: WhopGateResult['reason']): string {
  switch (reason) {
    case 'no_membership':
      return 'No Whop membership found for this email. Subscribe via Whop, then sign in.';
    case 'inactive':
      return 'Your Whop subscription is not active. Renew it via Whop, then sign in.';
    case 'api_error':
      return 'Could not verify your Whop subscription right now. Try again in a moment.';
    default:
      return 'Subscription verification failed.';
  }
}
