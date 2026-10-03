import React from 'react';

/**
 * PaySplit Brand Logo Component
 * Features a royal blue box logo mark with crisp PaySplit typography
 */
export default function Logo({ size = 'md', showSubtitle = true, className = '' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* ── Royal Blue Box Icon Mark ── */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/25 shrink-0 border border-blue-400/40 relative overflow-hidden`}
      >
        {/* Subtle interior sheen */}
        <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 rounded-bl-xl pointer-events-none" />

        {/* Custom SVG Payment Split Mark inside the blue box */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSm ? 'w-4 h-4' : isLg ? 'w-7 h-7' : 'w-5 h-5'}
        >
          {/* Top-left payment slice */}
          <path d="M4 8h8a2 2 0 0 1 2 2v2" />
          {/* Bottom-right payment slice */}
          <path d="M20 16h-8a2 2 0 0 1-2-2v-2" />
          {/* Split diagonal divider */}
          <line x1="17" y1="5" x2="7" y2="19" strokeWidth="2.2" stroke="white" strokeDasharray="1 2" />
          {/* Instant payment nodes */}
          <circle cx="18" cy="7" r="1.5" fill="white" />
          <circle cx="6" cy="17" r="1.5" fill="white" />
        </svg>
      </div>

      {/* ── Brand Typography Lockup ── */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          {/* Pay inside a royal blue badge/box */}
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-black text-xs sm:text-sm tracking-tight shadow-xs">
            Pay
          </span>
          <span className={`font-black text-slate-900 tracking-tight ${textSizes[size]}`}>
            Split
          </span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
            2.0
          </span>
        </div>

        {showSubtitle && (
          <span className="hidden sm:inline text-[10px] text-slate-500 font-semibold tracking-normal mt-0.5 leading-tight">
            Automated Payment Splitting Platform
          </span>
        )}
      </div>
    </div>
  );
}
