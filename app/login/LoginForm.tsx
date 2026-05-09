'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, signUp, type AuthResult } from './actions';

interface Props {
  next: string;
  whopEnforced: boolean;
}

type Mode = 'signin' | 'signup';

const initialState: AuthResult = {};

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  const label = mode === 'signin'
    ? (pending ? 'Signing in…' : 'Sign in')
    : (pending ? 'Creating account…' : 'Create account');
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
    >
      {label}
    </button>
  );
}

export default function LoginForm({ next, whopEnforced }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [signInState, signInAction] = useFormState(signIn, initialState);
  const [signUpState, signUpAction] = useFormState(signUp, initialState);

  const state = mode === 'signin' ? signInState : signUpState;
  const action = mode === 'signin' ? signInAction : signUpAction;

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Email</span>
        <input
          type="email"
          name="email"
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
          required
          minLength={mode === 'signup' ? 8 : undefined}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          className="mt-1 w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
      </label>

      {state.error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}
      {state.notice && (
        <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          {state.notice}
        </div>
      )}

      <SubmitButton mode={mode} />

      <button
        type="button"
        onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}
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
