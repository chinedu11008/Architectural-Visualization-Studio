import { useState } from 'react';
import Header from '../components/Header';

export default function Account({ onNavigate }) {
  const [name, setName] = useState('Mara Chen');
  const [studio, setStudio] = useState('Northline Atelier');
  const [email, setEmail] = useState('mara@northline-atelier.com');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="bg-surface border border-line md:rounded-[6px] overflow-clip mx-auto w-full max-w-[1392px] flex flex-col min-h-screen">
        <Header onNavigate={onNavigate} currentPage="account" variant="account" />

        <main className="flex flex-col gap-5 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">

          {/* Page heading */}
          <div className="flex flex-col gap-1 max-w-[576px]">
            <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px] leading-[16px]">Account / Profile</p>
            <h1 className="text-ink font-bold text-[20px] sm:text-[23px] leading-[30px] sm:leading-[32px] mt-1">A workspace with a point of view.</h1>
            <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">
              Keep your studio identity close, and make every new scene start from the same considered defaults.
            </p>
          </div>

          {/* Two-column on lg+, single on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 sm:gap-6">

            {/* Identity section */}
            <section className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
              <p className="text-muted text-[11px]">◐ Studio identity</p>

              {/* Avatar + name */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-avatar rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                  <span className="text-on-avatar text-[13px] sm:text-[14px] leading-[20px]">MC</span>
                </div>
                <div>
                  <h2 className="text-ink font-bold text-[15px] sm:text-[16px] leading-[24px]">Mara Chen</h2>
                  <p className="text-muted text-[12px] sm:text-[13px]">Creative director · Northline Atelier</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="flex flex-col gap-3 sm:gap-4">
                {/* Responsive 2-col on sm+, stacked on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-muted text-[13px] sm:text-[14px]">Full name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-surface border border-line rounded-[4px] px-3 py-2 text-accent text-[13px] outline-none focus:border-accent transition-colors w-full"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-muted text-[13px]">Studio name</span>
                    <input
                      type="text"
                      value={studio}
                      onChange={(e) => setStudio(e.target.value)}
                      className="bg-surface border border-line rounded-[4px] px-3 py-2 text-accent text-[13px] outline-none focus:border-accent transition-colors w-full"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-muted text-[13px]">Account email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface border border-line rounded-[4px] px-3 py-2 text-accent text-[13px] outline-none focus:border-accent transition-colors w-full"
                  />
                </label>

                <div className="border-t border-line-2 pt-3 flex items-center justify-between gap-3">
                  <span className="text-muted text-[11px]">Local demo profile</span>
                  <button
                    type="submit"
                    className="bg-primary text-on-primary text-[13px] sm:text-[14px] px-3 sm:px-4 py-2 rounded-[4px] hover:bg-primary-hover transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {saved ? '✓ Saved' : '✓ Save changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* Right column: stacks below on mobile, sits aside on lg+ */}
            <div className="flex flex-col gap-4 sm:gap-5">
              {/* Workspace defaults */}
              <section className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                <p className="text-muted text-[11px]">▦ Workspace defaults</p>
                <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">
                  These choices are applied when a new scene opens in Lumen / Field.
                </p>
                <div className="flex flex-col">
                  {[
                    { label: 'Default model format', value: 'Revit .RVT' },
                    { label: 'Render quality', value: 'High — 2048px' },
                    { label: 'Scene language', value: 'Natural language' },
                    { label: 'Auto-analyze on open', value: 'Enabled' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-line-2 last:border-0">
                      <span className="text-muted text-[12px] sm:text-[13px]">{item.label}</span>
                      <span className="text-ink font-bold text-[12px] sm:text-[13px]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Notifications */}
              <section className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                <p className="text-muted text-[11px]">⚑ Notifications</p>
                <div className="flex flex-col gap-1">
                  {[
                    { label: 'Render complete', enabled: true },
                    { label: 'Weekly usage digest', enabled: true },
                    { label: 'Plan renewal reminders', enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-line-2 last:border-0">
                      <span className="text-ink-4 text-[12px] sm:text-[13px]">{item.label}</span>
                      <div className={`w-8 h-4 rounded-full cursor-pointer transition-colors ${item.enabled ? 'bg-primary' : 'bg-line'}`} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
