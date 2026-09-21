import UserDropdown from './UserDropdown';

export default function Header({ onNavigate, currentPage, variant = 'dashboard' }) {
  const navItems =
    variant === 'dashboard'
      ? [{ label: 'Home', page: 'dashboard' }]
      : [
          { label: 'Profile', page: 'account' },
          { label: 'Subscription', page: 'subscription' },
        ];

  return (
    <header className="border-b border-line bg-surface shrink-0 mobile-safe-top">
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 w-full">
        {/* Brand */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer min-w-0"
        >
          <div className="bg-primary rounded-[4px] w-7 h-7 shrink-0" />
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-ink font-bold text-[14px] leading-[20px] whitespace-nowrap">Lumen / Field</span>
            <span className="text-muted text-[10px] leading-[14px] whitespace-nowrap">Architectural visualization studio</span>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5">
          {navItems.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={`text-[14px] pb-1 cursor-pointer transition-colors ${
                currentPage === page
                  ? 'text-ink font-medium border-b-2 border-primary'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* User dropdown */}
        <UserDropdown onNavigate={onNavigate} />
      </div>
    </header>
  );
}
