interface WhopMembership {
  id: string;
  status?: string;
  // Whop v2 returns these as plain string IDs
  product?: string;
  plan?: string;
  // Newer Whop APIs / alternative shapes
  product_id?: string;
  plan_id?: string;
  access_pass_id?: string;
  user_id?: string;
  user?: string;
  email?: string;
  valid?: boolean;
}

function membershipProductIds(m: WhopMembership): string[] {
  return [m.product, m.product_id, m.access_pass_id, m.plan, m.plan_id].filter(
    (x): x is string => typeof x === 'string' && x.length > 0
  );
}

interface WhopListResponse {
  data?: WhopMembership[];
  pagination?: unknown;
}

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const ACCEPTED_STATUSES = new Set([
  'active',
  'trialing',
  'completed',
  'paid',
]);

export interface WhopGateResult {
  ok: boolean;
  reason?: 'not_configured' | 'no_membership' | 'inactive' | 'api_error';
  detail?: string;
}

export function isWhopConfigured(): boolean {
  return !!process.env.WHOP_API_KEY;
}

export function isWhopDebug(): boolean {
  const v = process.env.WHOP_DEBUG;
  return v === '1' || v === 'true' || v === 'TRUE';
}

export async function checkActiveMembership(email: string): Promise<WhopGateResult> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) return { ok: true, reason: 'not_configured' };

  const productId = process.env.WHOP_PRODUCT_ID?.trim() || undefined;
  const debug = isWhopDebug();
  const lowerEmail = email.toLowerCase();

  const url = new URL(`${WHOP_API_BASE}/memberships`);
  url.searchParams.set('email', email);
  url.searchParams.set('per_page', '50');

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
      const body = await res.text().catch(() => '');
      console.error(`[whop] API ${res.status}: ${body.slice(0, 300)}`);
      return {
        ok: false,
        reason: 'api_error',
        detail: `Whop API ${res.status}${debug && body ? `: ${body.slice(0, 200)}` : ''}`,
      };
    }
    payload = (await res.json()) as WhopListResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    console.error('[whop] fetch failed:', msg);
    return { ok: false, reason: 'api_error', detail: msg };
  }

  const all = payload.data ?? [];
  console.log(`[whop] ${email}: API returned ${all.length} memberships`);

  // Trust the email param if Whop respected it; otherwise filter ourselves.
  const forEmail = all.filter(m => !m.email || m.email.trim().toLowerCase() === lowerEmail);

  if (forEmail.length === 0) {
    return {
      ok: false,
      reason: 'no_membership',
      detail: debug ? `API returned ${all.length} memberships, 0 matched email` : undefined,
    };
  }

  const matches = forEmail.filter(m => {
    const statusOk = ACCEPTED_STATUSES.has((m.status ?? '').toLowerCase()) || m.valid === true;
    const ids = membershipProductIds(m);
    const productOk = !productId || ids.includes(productId);
    if (!statusOk || !productOk) {
      console.log(
        `[whop] skipped membership ${m.id}: status=${m.status} valid=${m.valid} ids=[${ids.join(',')}]`
      );
    }
    return statusOk && productOk;
  });

  if (matches.length === 0) {
    const summary = forEmail
      .map(m => `status=${m.status} valid=${m.valid} ids=[${membershipProductIds(m).join(',')}]`)
      .join('; ');
    return {
      ok: false,
      reason: 'inactive',
      detail: debug ? `${forEmail.length} membership(s) for email; none matched. ${summary}` : undefined,
    };
  }

  return { ok: true };
}

export function whopErrorMessage(reason: WhopGateResult['reason'], detail?: string): string {
  const base = (() => {
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
  })();
  return detail ? `${base} (${detail})` : base;
}
