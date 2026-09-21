import { useState, useRef, useEffect } from 'react';

function IconAccount() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="var(--c-text-medium)" strokeWidth="1.25"/>
      <path d="M1.5 14c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="var(--c-text-medium)" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function IconSubscription() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="var(--c-text-medium)" strokeWidth="1.25"/>
      <path d="M1 6.5h14" stroke="var(--c-text-medium)" strokeWidth="1.25"/>
      <rect x="3" y="9" width="3" height="1.5" rx="0.5" fill="var(--c-text-medium)"/>
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="var(--c-text-medium)" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M10.5 5L14 8l-3.5 3" stroke="var(--c-text-medium)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 8H6" stroke="var(--c-text-medium)" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

export default function UserDropdown({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const go = (page) => {
    setOpen(false);
    onNavigate(page);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="border border-line flex gap-2 items-center pl-1 pr-3 py-1 rounded-full cursor-pointer hover:border-line-hover transition-colors"
      >
        <div className="bg-avatar flex items-center justify-center rounded-full w-6 h-6 shrink-0">
          <span className="text-on-avatar text-[10px] leading-none select-none">MC</span>
        </div>
        <span className="text-accent text-[12px] leading-[16px]">Mara Chen</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--c-text-light)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] bg-surface border border-line rounded-[6px] shadow-[0_4px_16px_var(--c-shadow)] w-[220px] z-50 overflow-clip">
          {/* User identity row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-line-2">
            <div className="bg-avatar flex items-center justify-center rounded-full w-8 h-8 shrink-0">
              <span className="text-on-avatar text-[11px] leading-none select-none">MC</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-ink font-medium text-[13px] leading-[18px] truncate">Mara Chen</span>
              <span className="text-muted text-[11px] leading-[15px] truncate">marachen@info.com</span>
            </div>
            <span className="ml-auto shrink-0 text-[10px] text-on-badge bg-badge px-2 py-0.5 rounded-[4px] font-medium">Pro</span>
          </div>

          {/* Nav items */}
          <div className="py-1">
            <button
              onClick={() => go('account')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-hover cursor-pointer transition-colors group"
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                <IconAccount />
              </span>
              <span className="text-ink-3 text-[13px] leading-[20px]">Account</span>
            </button>

            <button
              onClick={() => go('subscription')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-hover cursor-pointer transition-colors group"
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                <IconSubscription />
              </span>
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-ink-3 text-[13px] leading-[20px]">Subscription</span>
                <span className="text-[10px] text-muted border border-line px-1.5 py-0.5 rounded-full leading-none">Studio</span>
              </div>
            </button>
          </div>

          {/* Separator + logout */}
          <div className="border-t border-line-2 py-1">
            <button
              onClick={() => go('signin')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-hover cursor-pointer transition-colors group"
            >
              <span className="flex items-center justify-center w-5 h-5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                <IconLogout />
              </span>
              <span className="text-ink-3 text-[13px] leading-[20px]">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
