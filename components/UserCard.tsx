'use client';

import { useEffect, useState } from 'react';
import { createClient, isAuthConfigured } from '@/lib/auth/client';
import { signOut } from '@/app/login/actions';

export default function UserCard() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthConfigured()) return;
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setEmail(session?.user?.email ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!email) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-gray-600 uppercase tracking-wider">Signed in</div>
        <div className="text-xs text-gray-300 truncate" title={email}>{email}</div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded border border-gray-800 hover:border-red-500/40 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
