'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserCard from './UserCard';

const HIDE_ON = ['/login', '/signup'];

const NAV = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/rsi',
    label: 'RSI',
    sublabel: 'Relative Strength Index',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: '/macd',
    label: 'MACD',
    sublabel: 'Moving Avg Convergence',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/bollinger',
    label: 'Bollinger Bands',
    sublabel: 'Volatility Channels',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 17l6-6 4 4 8-9" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} strokeDasharray="3 3"
          d="M3 12l6-6 4 4 8-9M3 22l6-6 4 4 8-9" />
      </svg>
    ),
  },
  {
    href: '/ma-crossover',
    label: 'MA Crossover',
    sublabel: 'Golden & Death Cross',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 12h16M4 18h7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 15l3 3m0 0l3-3m-3 3V12" />
      </svg>
    ),
  },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.5 18.5l6-6 4 4L20 7" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>
      <div>
        <div className="text-white font-bold text-sm leading-tight">TradeView</div>
        <div className="text-gray-500 text-[10px]">Live Strategies</div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;

  const links = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV.map(({ href, label, sublabel, icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
              active
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
            }`}
          >
            <span className={active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}>
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{label}</div>
              {sublabel && (
                <div className="text-[10px] text-gray-600 group-hover:text-gray-500 truncate leading-tight">
                  {sublabel}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <>
      <UserCard />
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live · 5s refresh
        </div>
        <div className="text-[10px] text-gray-700 mt-1">Yahoo Finance data</div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur border-b border-gray-800 flex items-center justify-between px-4 z-40">
        <Brand />
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className="w-10 h-10 -mr-2 inline-flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 active:bg-gray-700"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 w-72 max-w-[85vw] bg-gray-900 border-r border-gray-800 flex flex-col z-50 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {links}
        {footer}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex-col z-40">
        <div className="px-5 py-5 border-b border-gray-800">
          <Brand />
        </div>
        {links}
        {footer}
      </aside>
    </>
  );
}
