'use client';

import { useState, useTransition } from 'react';
import { signIn, signUp } from './actions';

interface Props {
  next: string;
  whopEnforced: boolean;
}

type Mode = 'signin' | 'signup';

export default function LoginForm({ next, whopEnforced }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const data = new FormData();
    data.set('email', email);
    data.set('password', password);
    data.set('next', next);
    startTransition(async () => {
      const action = mode === 'signin' ? signIn : signUp;
      const result = await action(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <label className="block">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Email</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
      </label>

      <label className="block">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Password</span>
        <input
          type="password"
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={mode === 'signup' ? 8 : undefined}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          className="mt-1 w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
      </label>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
      >
        {isPending
          ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
          : (mode === 'signin' ? 'Sign in' : 'Create account')}
      </button>

      <button
        type="button"
        onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); }}
        className="w-full text-xs text-gray-400 hover:text-white transition-colors"
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>

      {whopEnforced && (
        <p className="text-[11px] text-gray-500 text-center pt-2 border-t border-gray-800">
          Active Whop subscription required.
        </p>
      )}
    </form>
  );
}
