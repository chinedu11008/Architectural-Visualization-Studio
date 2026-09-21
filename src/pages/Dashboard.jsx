import Header from '../components/Header';

const recentProjects = [
  { name: 'Aster House', type: 'project', scene: 'Exterior study', time: '2 min ago' },
  { name: 'Aster House', type: 'project', scene: 'Warm dusk study', time: '21 min ago' },
  { name: 'Brackwater Site', type: 'project', scene: 'Early massing study', time: '2 days ago' },
];

const activityItems = [
  { label: 'Aster House · 2 min ago', detail: 'Scene preview — Aster House / study 01', icon: '⊙' },
  { label: 'Aster House.rvt · 21 min ago', detail: 'Model updated', icon: '▢' },
  { label: 'Working note / Aster House', detail: 'Notes saved', icon: '✎' },
];

export default function Dashboard({ onNavigate }) {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="bg-surface border border-line md:rounded-[6px] overflow-clip mx-auto w-full max-w-[1392px] flex flex-col min-h-screen">
        <Header onNavigate={onNavigate} currentPage="dashboard" variant="dashboard" />

        <main className="flex flex-col gap-5 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">

          {/* Welcome row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-3 sm:gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px] leading-[16px]">Project home / 06.24</p>
              <h1 className="text-ink font-bold text-[20px] sm:text-[24px] leading-[28px] sm:leading-[32px] mt-1">Good evening, Mara.</h1>
              <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">Pick up a study, check your ingredients, or step back into the light.</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-muted text-[11px] hidden sm:inline">All changes saved locally</span>
              <button
                onClick={() => onNavigate('workspace')}
                className="bg-primary text-on-primary text-[12px] sm:text-[13px] px-3 sm:px-4 py-2 sm:py-[10px] rounded-[4px] hover:bg-primary-hover transition-colors cursor-pointer whitespace-nowrap"
              >
                Continue in studio
              </button>
            </div>
          </div>

          {/* Current project grid: stacks on mobile, 2-col on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 sm:gap-6">
            {/* Project card */}
            <article className="border border-line rounded-[6px] overflow-clip flex flex-col">
              <div className="stripe-bg h-[160px] sm:h-[200px] md:h-[224px] flex items-end p-3 sm:p-4 shrink-0">
                <span className="bg-chip text-accent text-[11px] px-2 py-1 rounded-[4px]">
                  Exterior / dusk 01
                </span>
              </div>
              <div className="flex flex-col p-4 sm:p-5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-2 text-[11px]">Current project</span>
                  <span className="text-muted-2 text-[12px]">↗</span>
                </div>
                <h2 className="text-ink font-bold text-[16px] sm:text-[17px] leading-[28px] mt-1">Aster House</h2>
                <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">Exterior study</p>
                <div className="flex items-center justify-between mt-3 sm:mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-muted-2 rounded-full w-1.5 h-1.5" />
                    <span className="text-muted text-[11px]">Environment ready</span>
                  </div>
                  <span className="text-muted text-[11px]">Edited 2 min ago</span>
                </div>
              </div>
            </article>

            {/* Workspace info panel */}
            <aside className="border border-line rounded-[6px] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
              <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px]">Selected workspace</p>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-ink font-bold text-[15px] sm:text-[16px] leading-[24px]">Aster House</h2>
                  <p className="text-muted text-[12px] sm:text-[13px]">Exterior study</p>
                </div>
                <span className="border border-line text-ink-4 text-[10px] px-2 py-0.5 rounded-full">project</span>
              </div>
              <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">Aster House is ready to continue.</p>
              <div className="border-t border-line-2 pt-3 sm:pt-4 flex gap-6 sm:gap-8">
                <div>
                  <p className="text-muted-2 text-[10px] leading-[16.5px]">Scenes</p>
                  <p className="text-ink font-bold text-[13px] leading-[20px]">04 scenes</p>
                </div>
                <div>
                  <p className="text-muted-2 text-[10px] leading-[16.5px]">Last touched</p>
                  <p className="text-ink font-bold text-[13px] sm:text-[14px] leading-[20px]">2 min ago</p>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => onNavigate('workspace')}
                className="border border-line text-accent text-[12px] sm:text-[13px] px-4 py-[10px] rounded-[4px] w-full hover:border-accent transition-colors cursor-pointer mt-auto"
              >
                Open selected project →
              </button>
            </aside>
          </div>

          {/* Recent projects + activity: stacks on mobile, 2-col on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 sm:gap-6">
            <section className="border border-line rounded-[6px] p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <h2 className="text-ink font-bold text-[15px] sm:text-[16px] leading-[24px]">Recent projects &amp; scenes</h2>
                <div className="flex items-center gap-2">
                  <div className="border border-line rounded-[4px] px-2.5 py-1.5 text-[12px] text-muted-3 flex-1 sm:flex-none">
                    Search projects or scenes
                  </div>
                  <span className="border border-line rounded-[4px] px-2 py-1 text-[11px] text-muted whitespace-nowrap">Projects</span>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-line-2">
                {recentProjects.map((proj, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="stripe-bg w-10 h-7 sm:w-[52px] sm:h-[36px] rounded-[4px] shrink-0 flex items-end p-1">
                      {i === 0 && (
                        <span className="bg-chip text-accent text-[8px] px-1 rounded">01</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-[12px] sm:text-[13px] font-medium truncate">{proj.name}</p>
                      <p className="text-muted text-[11px] truncate">{proj.scene}</p>
                    </div>
                    <span className="border border-line text-ink-4 text-[10px] px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">{proj.type}</span>
                    <span className="text-muted-2 text-[11px] shrink-0">{proj.time}</span>
                  </div>
                ))}
              </div>
            </section>

            <aside className="border border-line rounded-[6px] p-4 sm:p-5 flex flex-col gap-2 sm:gap-3">
              <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px]">Workspace pulse</p>
              <div className="flex flex-col">
                {activityItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b border-line-2 last:border-0">
                    <span className="text-muted-2 text-[12px] mt-0.5 shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-ink text-[11px] font-medium">{item.label}</p>
                      <p className="text-muted text-[11px] truncate">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-2 text-[11px] mt-1">Ready to render</p>
            </aside>
          </div>

          {/* Plan stats: stacks on mobile, 2-col on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 sm:gap-6">
            <section className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
              <div>
                <p className="text-ink-4 text-[11px]">💳 Current plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-ink font-bold text-[19px] sm:text-[20px] leading-[28px]">Studio</h2>
                  <span className="border border-line text-ink-4 text-[10px] px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-muted text-[12px] sm:text-[13px]">For Mara Chen · renews July 24, 2025</p>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-muted text-[11px]">Renders</span>
                  <strong className="text-ink text-[12px] sm:text-[13px] font-normal">
                    38 <span className="text-muted-2">/ 60 renders</span>
                  </strong>
                </div>
                <div className="bg-sunken h-2 rounded-full overflow-clip">
                  <div className="bg-primary h-full w-[63%]" />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted text-[11px]">Month</span>
                  <span className="text-muted text-[11px]">22 renders remaining</span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 pt-3 border-t border-line-2 text-muted text-[12px] sm:text-[13px] whitespace-nowrap flex-wrap">
                <button onClick={() => onNavigate('subscription')} className="hover:text-accent cursor-pointer transition-colors">Manage plan</button>
                <button onClick={() => onNavigate('account')} className="hover:text-accent cursor-pointer transition-colors">Account settings</button>
              </div>
            </section>

            <aside className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-2 sm:gap-3">
              <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px]">Usage / June</p>
              <p className="text-ink font-bold text-[16px] sm:text-[17px] leading-[28px]">38 rendered studies</p>
              <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">Your most active week was the Aster House exterior pass.</p>
              <div className="flex-1" />
              <button
                onClick={() => onNavigate('workspace')}
                className="border border-line text-accent text-[13px] sm:text-[14px] px-4 py-[10px] rounded-[4px] w-full hover:border-accent transition-colors cursor-pointer mt-3 sm:mt-auto"
              >
                Open studio →
              </button>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
