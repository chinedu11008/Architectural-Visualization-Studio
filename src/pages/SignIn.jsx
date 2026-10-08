export default function SignIn({ onNavigate }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4 sm:p-6">
      <div className="border border-line rounded-[6px] overflow-clip w-full max-w-[1390px] bg-surface">
        <div className="flex min-h-[600px] lg:min-h-[720px]">
          {/* Hero art — hidden on mobile, shows md+ */}
          <div className="hidden md:block flex-1 stripe-bg min-h-full" />

          {/* Sign-in content */}
          <div className="flex flex-col gap-6 sm:gap-8 items-start justify-center p-6 sm:p-10 lg:p-16 w-full md:w-auto md:min-w-[420px] lg:min-w-[480px]">
            {/* Brand logo */}
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-[4px] w-7 h-7 shrink-0" />
              <div className="flex flex-col">
                <span className="text-ink font-bold text-[14px] leading-[20px]">Lumen / Field</span>
                <span className="text-muted text-[10px] leading-[14px]">Architectural visualization studio</span>
              </div>
            </div>

            {/* Heading block */}
            <div className="flex flex-col gap-1.5">
              <p className="text-muted text-[11px] leading-[16px]">A studio for architectural atmosphere</p>
              <p className="text-ink font-bold text-[20px] sm:text-[23px] leading-[30px] sm:leading-[32px]">
                From Idea to Render<br className="hidden sm:block" /> In Minutes.
              </p>
            </div>

            {/* Sign-in card */}
            <div className="border border-line rounded-[6px] p-5 sm:p-6 flex flex-col gap-4 w-full max-w-[384px]">
              <div>
                <p className="text-muted text-[11px] leading-[16px]">Welcome back</p>
                <h2 className="text-ink font-bold text-[17px] leading-[28px]">Return to your Studio</h2>
              </div>

              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => { e.preventDefault(); onNavigate('dashboard'); }}
              >
                <label className="flex flex-col gap-1">
                  <span className="text-ink-4 text-[14px] leading-[20px]">Email</span>
                  <input
                    type="email"
                    placeholder="you@studio.com"
                    className="bg-surface border border-line rounded-[4px] px-3 py-[9px] text-[13px] text-ink placeholder:text-muted-3 outline-none focus:border-accent transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-ink-4 text-[13px] leading-[20px]">Password</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="bg-surface border border-line rounded-[4px] px-3 py-[9px] text-[13px] text-ink placeholder:text-muted-3 outline-none focus:border-accent transition-colors"
                  />
                </label>
                <button
                  type="submit"
                  className="bg-primary text-on-primary text-[13px] leading-[20px] py-[10px] rounded-[4px] w-full hover:bg-primary-hover transition-colors cursor-pointer"
                >
                  Enter workspace
                </button>
              </form>

              <div className="border-t border-line-2 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-muted text-[11px]">Local demo · no account required</span>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-ink-3 text-[11px] hover:text-accent transition-colors cursor-pointer text-left sm:text-right"
                >
                  Browse project home →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
