import { useState } from 'react';
import UserDropdown from '../components/UserDropdown';

export default function Workspace({ onNavigate }) {
  const [inputPanelOpen, setInputPanelOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    'A quiet concrete courtyard house at blue hour, warm light spilling from deep-set windows, native grasses moving in the evening wind, cinematic architectural photography, 35mm lens.'
  );
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);

  const handleRender = () => {
    setRendering(true);
    setTimeout(() => { setRendering(false); setRendered(true); }, 2000);
  };

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="mobile-safe-top border-b border-line flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-surface shrink-0 gap-2 sm:gap-3">

        {/* Left: logo */}
        <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2.5 cursor-pointer shrink-0">
          <div className="bg-primary rounded-[4px] w-7 h-7 shrink-0" />
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-ink font-bold text-[14px] leading-[20px]">Lumen / Field</span>
            <span className="text-muted text-[10px]">Architectural visualization studio</span>
          </div>
        </button>

        {/* Center breadcrumb — collapses on small screens */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 text-[11px] min-w-0 flex-1 justify-center">
          <button onClick={() => onNavigate('dashboard')} className="text-muted hover:text-accent cursor-pointer transition-colors whitespace-nowrap">
            ☰ Project home
          </button>
          <span className="text-line">|</span>
          <span className="text-ink-2 truncate max-w-[200px] lg:max-w-none">Aster House / exterior study</span>
          <span className="text-line hidden lg:inline">|</span>
          <span className="text-muted hidden lg:inline whitespace-nowrap">Saved locally · 2 min ago</span>
        </div>

        {/* Right: toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Panel toggle — desktop only */}
          <button
            onClick={() => setInputPanelOpen(!inputPanelOpen)}
            className={`hidden md:flex border items-center justify-center rounded-[4px] w-8 h-8 text-[13px] cursor-pointer transition-colors ${
              inputPanelOpen
                ? 'border-primary bg-primary text-on-primary'
                : 'border-line text-muted hover:border-line-hover'
            }`}
            title="Toggle inputs panel"
          >
            ☰
          </button>
          <button
            className="border border-line hidden sm:flex items-center justify-center rounded-[4px] w-8 h-8 text-muted text-[13px] hover:border-line-hover cursor-pointer transition-colors"
            title="Settings"
          >
            ⚙
          </button>
          <button
            className="border border-line hidden sm:flex items-center justify-center rounded-[4px] w-8 h-8 text-muted text-[14px] hover:border-line-hover cursor-pointer transition-colors"
            title="Help"
          >
            ?
          </button>
          <UserDropdown onNavigate={onNavigate} />
        </div>
      </div>

      {/* Mobile breadcrumb strip */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-line-2 bg-page text-[11px] overflow-x-auto whitespace-nowrap">
        <button onClick={() => onNavigate('dashboard')} className="text-muted hover:text-accent cursor-pointer transition-colors shrink-0">
          ☰ Project home
        </button>
        <span className="text-line shrink-0">|</span>
        <span className="text-ink-2 shrink-0">Aster House / exterior study</span>
        <span className="text-line shrink-0">|</span>
        <span className="text-muted shrink-0">Saved locally · 2 min ago</span>
      </div>

      {/* ── Main studio area ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Input panel — sidebar on desktop, slide-over on mobile */}
        {inputPanelOpen && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/20 z-20"
              onClick={() => setInputPanelOpen(false)}
            />

            {/* Panel */}
            <div className={`
              flex flex-col shrink-0 overflow-y-auto bg-surface border-line
              md:relative md:w-[260px] md:border-r md:z-auto
              fixed bottom-0 left-0 right-0 z-30 max-h-[75vh] rounded-t-[12px] border-t
              md:max-h-none md:rounded-none md:border-t-0
            `}>
              {/* Mobile drag handle */}
              <div className="md:hidden flex justify-center pt-2.5 pb-1">
                <div className="w-8 h-1 bg-line rounded-full" />
              </div>

              {/* Panel header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div>
                  <p className="text-muted-2 text-[11px] uppercase tracking-[0.275px] leading-[16.5px]">Inputs</p>
                  <h2 className="text-ink font-bold text-[14px] leading-[20px]">Scene ingredients</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-2 text-[11px]">01 / 03</span>
                  <button
                    onClick={() => setInputPanelOpen(false)}
                    className="md:hidden text-muted-2 hover:text-ink cursor-pointer text-[16px] leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex flex-col px-4 pb-5 gap-4">
                {/* 01 BIM model */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-muted text-[10px]">01 · BIM model</span>
                    <span className="text-line text-[12px]">ⓘ</span>
                  </div>
                  <div className="border border-line rounded-[6px] flex items-center gap-3 p-3">
                    <div className="bg-sunken border border-line rounded-[4px] w-8 h-8 flex items-center justify-center shrink-0">
                      <span className="text-accent text-[12px]">▢</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-[13px] truncate">Aster House.rvt</p>
                      <p className="text-muted text-[11px]">Revit · 18.4 MB · sample</p>
                    </div>
                    <button className="text-muted-2 hover:text-ink cursor-pointer shrink-0">✕</button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 border border-line rounded-[4px] text-accent text-[10px] py-1.5 hover:border-accent cursor-pointer transition-colors">
                      📁 Replace
                    </button>
                    <button className="flex-1 border border-line rounded-[4px] text-accent text-[11px] py-1.5 hover:border-accent cursor-pointer transition-colors">
                      ▢ Use file
                    </button>
                  </div>
                </div>

                {/* 02 Atmosphere reference */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-muted text-[10px]">02 · Atmosphere reference 🖼</span>
                  </div>
                  <div className="stripe-bg h-[112px] rounded-[6px] flex items-end justify-center p-2">
                    <div className="bg-chip flex-1 flex items-center justify-between px-2 py-1 rounded-[4px]">
                      <span className="text-accent text-[11px]">courtyard_dusk.jpg</span>
                      <button className="text-muted hover:text-ink cursor-pointer">✕</button>
                    </div>
                  </div>
                  <button className="w-full border border-line rounded-[4px] text-accent text-[10px] py-1.5 mt-2 hover:border-accent cursor-pointer transition-colors">
                    🖼 Replace reference
                  </button>
                </div>

                {/* 03 Direction */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-muted text-[11px]">03 · Direction ✦</span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-surface border border-line rounded-[6px] p-3 text-ink-3 text-[13px] leading-[20px] w-full h-[120px] resize-none outline-none focus:border-accent transition-colors"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-2 text-[10px]">{prompt.length} / 600</span>
                    <span className="text-muted-2 text-[10px]">Natural language</span>
                  </div>
                  <button
                    onClick={handleRender}
                    className="w-full border border-line rounded-[6px] text-accent text-[13px] py-[10px] mt-3 hover:border-accent hover:bg-accent-soft cursor-pointer transition-colors"
                  >
                    ✦ Analyze inputs with AI
                  </button>
                </div>

                {/* AI read results */}
                <div className="flex flex-col gap-2 pt-1 border-t border-line-2">
                  <div className="flex items-center gap-1.5 pt-3">
                    <div className="bg-muted-2 rounded-full w-1.5 h-1.5" />
                    <span className="text-ink-3 text-[11px]">AI read complete</span>
                  </div>
                  <div>
                    <p className="text-muted text-[11px]">Model read</p>
                    <p className="text-ink-2 text-[11px] leading-[16px] mt-0.5">Single-story courtyard massing, deep window reveals, flat roof plane.</p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px]">Atmosphere</p>
                    <p className="text-ink-2 text-[11px] leading-[16px] mt-0.5">Warm dusk light, low sun angle, soft ambient falloff.</p>
                  </div>
                </div>

                {/* Render button */}
                <button
                  onClick={handleRender}
                  disabled={rendering}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-[6px] font-medium text-[14px] transition-all cursor-pointer ${
                    rendering ? 'bg-muted-2 text-on-primary' : 'bg-primary text-on-primary hover:bg-primary-hover'
                  }`}
                >
                  {rendering ? <><span className="animate-spin inline-block">◌</span> Rendering...</> : '✦ Generate render'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Canvas area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas toolbar */}
          <div className="border-b border-line flex items-center justify-between px-3 sm:px-4 py-2 bg-surface shrink-0">
            <span className="text-muted-2 text-[11px] truncate mr-2">Scene preview — Aster House / study 01</span>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button className="border border-line rounded-[4px] px-2 sm:px-2.5 py-1 text-muted text-[11px] hover:border-line-hover cursor-pointer">1:1</button>
              <button className="border border-line rounded-[4px] px-2 sm:px-2.5 py-1 text-muted text-[11px] hover:border-line-hover cursor-pointer">Fit</button>
              <button className="border border-line rounded-[4px] px-2 sm:px-2.5 py-1 text-muted text-[11px] hover:border-line-hover cursor-pointer">Export</button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-page p-4 sm:p-8 overflow-hidden">
            {rendered ? (
              <div className="w-full max-w-3xl aspect-[16/9] stripe-bg rounded-[6px] flex items-end p-3 sm:p-4">
                <span className="bg-chip text-accent text-[11px] px-2 py-1 rounded-[4px]">
                  Exterior / dusk 01 — Rendered
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 stripe-bg rounded-[6px] opacity-50" />
                <p className="text-muted-2 text-[12px] sm:text-[13px] max-w-[220px] sm:max-w-none">
                  {rendering ? 'Generating render...' : 'Configure inputs and generate a render'}
                </p>
                {!rendering && (
                  <button
                    onClick={() => setInputPanelOpen(true)}
                    className="bg-primary text-on-primary text-[12px] sm:text-[13px] px-4 py-2.5 sm:py-[10px] rounded-[4px] hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    ✦ Open scene inputs
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scene tabs */}
          <div className="border-t border-line flex items-center gap-1 pl-3 sm:pl-4 py-2 bg-surface overflow-x-auto shrink-0">
            {['Exterior / dusk 01', 'Exterior / morning', 'Courtyard / dusk', 'Entry / golden hour'].map((scene, i) => (
              <button
                key={i}
                className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[11px] cursor-pointer transition-colors ${
                  i === 0 ? 'bg-primary text-on-primary' : 'border border-line text-muted hover:border-line-hover'
                }`}
              >
                {scene}
              </button>
            ))}
            <button className="flex-shrink-0 border border-dashed border-line text-muted-2 text-[11px] px-2.5 sm:px-3 py-1.5 rounded-[4px] hover:border-line-hover-2 cursor-pointer transition-colors">
              + New scene
            </button>
            {/* Spacer ensures right-side padding survives overflow clipping */}
            <div className="w-3 sm:w-4 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
