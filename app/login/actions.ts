'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, isAuthConfigured } from '@/lib/auth/server';
import { checkActiveMembership, whopErrorMessage } from '@/lib/whop';

export interface AuthResult {
  error?: string;
  notice?: string;
}

function safeNext(next: string | null): string {
  if (!next) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

const NOT_CONFIGURED: AuthResult = {
  error: 'Login is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your env vars and redeploy.',
};

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next') as string | null);

  if (!isAuthConfigured()) return NOT_CONFIGURED;
  if (!email || !password) return { error: 'Email and password are required.' };

  const gate = await checkActiveMembership(email);
  if (!gate.ok) return { error: whopErrorMessage(gate.reason) };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next') as string | null);

  if (!isAuthConfigured()) return NOT_CONFIGURED;
  if (!email || !password) return { error: 'Email and password are required.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };

  const gate = await checkActiveMembership(email);
  if (!gate.ok) return { error: whopErrorMessage(gate.reason) };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (!data.session) {
    return { notice: 'Account created. Check your email to confirm, then sign in.' };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOut() {
  if (isAuthConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}
