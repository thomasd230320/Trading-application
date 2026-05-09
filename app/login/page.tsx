import LoginForm from './LoginForm';
import { isWhopConfigured } from '@/lib/whop';

interface PageProps {
  searchParams: { next?: string };
}

export default function LoginPage({ searchParams }: PageProps) {
  const next = searchParams.next ?? '/';
  const whopEnforced = isWhopConfigured();

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 bg-[#030712]">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3.5 18.5l6-6 4 4L20 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Sign in to TradeView</h1>
            <p className="text-[11px] text-gray-500">
              {whopEnforced
                ? 'Members-only · email tied to your Whop subscription'
                : 'Email + password'}
            </p>
          </div>
        </div>
        <LoginForm next={next} whopEnforced={whopEnforced} />
      </div>
    </div>
  );
}
