import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Camera,
  ArrowRight,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  Clock3,
  FileBox,
  FileCheck2,
  FolderOpen,
  ImageIcon,
  ImagePlus,
  Info,
  LayoutDashboard,
  Layers3,
  Lightbulb,
  ListFilter,
  LoaderCircle,
  Menu,
  MousePointer2,
  Orbit,
  PanelRight,
  RotateCcw,
  Save,
  Search,
  SearchX,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

/** Tailwind `md` (768px), as in the Figma Make prototype: inputs are a sidebar at/above it and a bottom sheet below it. */
const MD_UP = '(min-width: 768px)';

const sampleModel = {
  name: 'Aster House.rvt',
  size: '18.4 MB',
  format: 'Revit',
  sample: true,
};

const sampleReference =
  'data:image/svg+xml,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="450" viewBox="0 0 760 450">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#203643"/><stop offset=".52" stop-color="#9d765d"/><stop offset="1" stop-color="#e0b16d"/></linearGradient></defs>
    <rect width="760" height="450" fill="url(#g)"/><circle cx="575" cy="116" r="58" fill="#f0d59e" opacity=".64"/>
    <path d="M0 350L180 205l96 82 120-144 104 112 110-80 150 126v149H0z" fill="#24343c" opacity=".92"/>
    <path d="M110 345V225h335v120M170 345V260h94v85M312 345V242h74v103" fill="none" stroke="#d7ad71" stroke-width="8"/>
    <path d="M0 382h760" stroke="#f2d4a0" opacity=".55"/><path d="M35 414h690" stroke="#aec2bc" opacity=".33"/>
  </svg>`);

function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? 'on' : ''}`}
      onClick={onClick}
      aria-label={`${label}: ${on ? 'on' : 'off'}`}
      data-testid={`toggle-${label.toLowerCase().replaceAll(' ', '-')}`}
    >
      <span />
    </button>
  );
}

function Home() {
  const [model, setModel] = useState(sampleModel);
  const [reference, setReference] = useState(sampleReference);
  const [prompt, setPrompt] = useState(
    'A quiet concrete courtyard house at blue hour, warm light spilling from deep-set windows, native grasses moving in the evening wind, cinematic architectural photography, 35mm lens.',
  );
  const [isDragging, setIsDragging] = useState(false);
  const [renderState, setRenderState] = useState('complete');
  const [progress, setProgress] = useState(100);
  const [cameraMode, setCameraMode] = useState('Perspective');
  const [activeTool, setActiveTool] = useState('orbit');
  const [showGrid, setShowGrid] = useState(true);
  const [showSun, setShowSun] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [time, setTime] = useState(19.35);
  const [zoom, setZoom] = useState(1);
  const [quality, setQuality] = useState('Cinematic');
  const [material, setMaterial] = useState('sand');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showPerformance, setShowPerformance] = useState(true);
  const [saved, setSaved] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(() => window.matchMedia(MD_UP).matches);
  const modelInputRef = useRef(null);
  const referenceInputRef = useRef(null);
  useEffect(() => {
    if (renderState !== 'rendering') return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 9, 100);
        if (next === 100) {
          window.setTimeout(() => setRenderState('complete'), 420);
        }
        return next;
      });
    }, 260);
    return () => window.clearInterval(timer);
  }, [renderState]);
  // Inputs panel: open sidebar from md up, closed bottom sheet below it. Resets when the viewport crosses md.
  useEffect(() => {
    const mql = window.matchMedia(MD_UP);
    const sync = () => setInputsOpen(mql.matches);
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!inputsOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !window.matchMedia(MD_UP).matches) setInputsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputsOpen]);
  const readModel = (file) => {
    if (!file) return;
    const format = file.name.toLowerCase().endsWith('.rvt') ? 'Revit' : 'ArchiCAD';
    const size =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setModel({ name: file.name, size, format });
    setRenderState('ready');
    setProgress(0);
  };
  const readReference = (file) => {
    if (!file) return;
    setReference(URL.createObjectURL(file));
  };
  const generate = () => {
    if (!model || !prompt.trim()) return;
    setSettingsOpen(false);
    setSaved(false);
    setProgress(8);
    setRenderState('rendering');
  };
  const resetCamera = () => {
    setCameraMode('Perspective');
    setActiveTool('orbit');
    setTime(19.35);
    setZoom(1);
  };
  const formatTime = (value) => {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };
  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <Link href="/dashboard" className="brand-lockup" data-testid="link-dashboard-home">
          <div className="brand-mark" aria-hidden="true" />
          <div className="brand-copy">
            <div className="brand-name">Lumen / Field</div>
            <div className="brand-sub">Architectural visualization studio</div>
          </div>
        </Link>
        <div className="topbar-center">
          <Link href="/dashboard" className="studio-home-link" data-testid="link-open-dashboard">
            <LayoutDashboard size={13} /> Project home
          </Link>
          <span className="project-divider" />
          <span className="project-title" data-testid="text-project-name">
            Aster House / exterior study
          </span>
          <span className="project-divider topbar-secondary" />
          <span className="small-meta topbar-secondary">Saved locally · 2 min ago</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={`icon-button panel-toggle ${inputsOpen ? 'active' : ''}`}
            onClick={() => setInputsOpen((value) => !value)}
            aria-label="Toggle input panel"
            aria-pressed={inputsOpen}
            aria-controls="input-panel"
            data-testid="button-toggle-input-panel"
          >
            <Menu size={16} />
          </button>
          <button
            type="button"
            className="icon-button topbar-utility"
            onClick={() => setSettingsOpen((value) => !value)}
            aria-label="Open settings"
            data-testid="button-open-settings"
          >
            <Settings2 size={16} />
          </button>
          <button
            type="button"
            className="icon-button topbar-utility"
            onClick={() => setHelpOpen((value) => !value)}
            aria-label="Help"
            data-testid="button-help"
          >
            <CircleHelp size={16} />
          </button>
          <div className="profile-chip">
            <span className="avatar">MC</span>
            <span>Mara Chen</span>
          </div>
        </div>
      </header>

      <main className={`studio-body ${inputsOpen ? '' : 'inputs-closed'}`}>
        {inputsOpen && (
          <div
            className="sheet-backdrop"
            onClick={() => setInputsOpen(false)}
            aria-hidden="true"
            data-testid="backdrop-input-sheet"
          />
        )}
        <aside
          id="input-panel"
          className={`left-panel ${inputsOpen ? 'is-open' : ''}`}
          aria-label="Scene inputs"
        >
          <div className="sheet-handle" aria-hidden="true">
            <span />
          </div>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Inputs</div>
              <h2>Scene ingredients</h2>
            </div>
            <div className="panel-heading-side">
              <span className="small-meta">01 / 03</span>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setInputsOpen(false)}
                aria-label="Close inputs"
                data-testid="button-close-input-panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="input-grid">
            <div>
              <div className="section-label">
                <span>01 · BIM model</span>
                <Info size={12} />
              </div>
              {!model ? (
                <div
                  className={`drop-zone ${isDragging ? 'is-dragging' : ''}`}
                  onClick={() => modelInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    readModel(event.dataTransfer.files[0]);
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid="dropzone-bim-model"
                >
                  <div>
                    <UploadCloud className="drop-icon" size={21} strokeWidth={1.5} />
                    <div className="drop-title">
                      {isDragging ? 'Release to inspect' : 'Drop a model here'}
                    </div>
                    <div className="drop-helper">
                      .RVT or .PLN · up to 500 MB
                      <br />
                      Geometry stays in your workspace
                    </div>
                  </div>
                </div>
              ) : (
                <div className="fade-in">
                  <div className="model-card" data-testid="card-model-file">
                    <div className="file-icon">
                      <FileBox size={16} />
                    </div>
                    <div className="file-copy">
                      <div className="file-name" data-testid="text-model-file-name">
                        {model.name}
                      </div>
                      <div className="file-size">
                        {model.format} · {model.size}
                        {model.sample ? ' · sample' : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => {
                        setModel(null);
                        setRenderState('ready');
                        setProgress(0);
                      }}
                      aria-label="Remove model"
                      data-testid="button-remove-model"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="model-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => modelInputRef.current?.click()}
                      data-testid="button-replace-model"
                    >
                      <FolderOpen size={13} /> Replace
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setModel({ ...model, sample: !model.sample })}
                      data-testid="button-toggle-model-sample"
                    >
                      <Box size={13} /> {model.sample ? 'Use file' : 'Mark sample'}
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={modelInputRef}
                className="file-input"
                type="file"
                accept=".rvt,.pln,.ifc"
                onChange={(event) => readModel(event.target.files?.[0])}
                data-testid="input-model-file"
              />
            </div>

            <div>
              <div className="section-label">
                <span>02 · Atmosphere reference</span>
                <ImagePlus size={12} />
              </div>
              {reference ? (
                <div className="reference-card fade-in" data-testid="card-reference-image">
                  <img src={reference} alt="Warm dusk architectural reference" />
                  <div className="reference-wash" />
                  <div className="reference-label">
                    <span>courtyard_dusk.jpg</span>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => setReference(null)}
                      aria-label="Remove reference"
                      data-testid="button-remove-reference"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="reference-empty"
                  onClick={() => referenceInputRef.current?.click()}
                  data-testid="button-add-reference"
                >
                  <ImagePlus size={15} /> Add a visual reference
                </button>
              )}
              <input
                ref={referenceInputRef}
                className="file-input"
                type="file"
                accept="image/*"
                onChange={(event) => readReference(event.target.files?.[0])}
                data-testid="input-reference-file"
              />
              {reference && (
                <button
                  type="button"
                  className="secondary-button"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={() => referenceInputRef.current?.click()}
                  data-testid="button-replace-reference"
                >
                  <ImagePlus size={13} /> Replace reference
                </button>
              )}
            </div>

            <div className="prompt-wide">
              <div className="section-label">
                <span>03 · Direction</span>
                <Sparkles size={12} />
              </div>
              <textarea
                className="prompt-box"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the atmosphere, light, and materiality…"
                data-testid="textarea-scene-prompt"
              />
              <div className="prompt-foot">
                <span>{prompt.length} / 600</span>
                <span>Natural language</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={generate}
                  disabled={!model || !prompt.trim() || renderState === 'rendering'}
                  data-testid="button-generate-scene"
                >
                  {renderState === 'rendering' ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  {renderState === 'rendering'
                    ? `Rendering ${progress}%`
                    : renderState === 'complete'
                      ? 'Regenerate scene'
                      : 'Generate environment'}
                </button>
              </div>
              <div className="render-status" data-testid="status-render">
                <span className={`status-dot ${renderState === 'rendering' ? 'warm' : ''}`} />
                {renderState === 'rendering'
                  ? 'Synthesizing geometry + atmosphere'
                  : renderState === 'complete'
                    ? 'Environment ready to explore'
                    : 'Add a model to begin'}
              </div>
              {renderState === 'rendering' && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-toolbar">
            <div className="toolbar-left">
              <div className="scene-selector">
                <span className="scene-dot" />{' '}
                <span data-testid="text-scene-title">Exterior / dusk 01</span>{' '}
                <ChevronDown size={13} />
              </div>
              <div className="toolbar-divider" />
              <button
                type="button"
                className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
                onClick={() => setActiveTool('select')}
                data-testid="button-tool-select"
              >
                <MousePointer2 size={13} /> Select
              </button>
              <button
                type="button"
                className={`tool-button ${activeTool === 'orbit' ? 'active' : ''}`}
                onClick={() => setActiveTool('orbit')}
                data-testid="button-tool-orbit"
              >
                <Orbit size={13} /> Orbit
              </button>
            </div>
            <div className="toolbar-right">
              <button
                type="button"
                className="tool-button"
                onClick={() => setSaved(true)}
                data-testid="button-save-view"
              >
                <Save size={13} /> <span>{saved ? 'Saved' : 'Save view'}</span>
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={() => setSettingsOpen((value) => !value)}
                data-testid="button-workspace-settings"
              >
                <SlidersHorizontal size={13} /> <span>Settings</span>
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ width: 'auto', height: 30, padding: '0 11px', fontSize: 10 }}
                onClick={generate}
                disabled={!model || renderState === 'rendering'}
                data-testid="button-render-top"
              >
                <Camera size={13} /> Render
              </button>
            </div>
          </div>

          {settingsOpen && (
            <div className="settings-popover fade-in" data-testid="panel-settings">
              <h3>Workspace settings</h3>
              <div className="toggle-row">
                <span>Auto-save views</span>
                <Toggle
                  label="Auto-save views"
                  on={saved}
                  onClick={() => setSaved((value) => !value)}
                />
              </div>
              <div className="toggle-row">
                <span>Show performance</span>
                <Toggle
                  label="Show performance"
                  on={showPerformance}
                  onClick={() => setShowPerformance((value) => !value)}
                />
              </div>
              <small>
                Changes are stored in this browser only. No model data leaves the studio.
              </small>
            </div>
          )}
          {helpOpen && (
            <div className="settings-popover help-popover fade-in" data-testid="panel-help">
              <h3>Studio shortcuts</h3>
              <div className="saved-note">
                <strong>Orbit</strong>Drag in the viewport to inspect the camera pass.
              </div>
              <div className="saved-note" style={{ marginTop: 7 }}>
                <strong>Focus</strong>Use the view pills to jump between review angles.
              </div>
              <small>Need a hand? This first pass is intentionally local and lightweight.</small>
            </div>
          )}

          <div
            className={`viewport ${showGrid ? '' : 'grid-hidden'} ${showSun ? '' : 'sun-hidden'}`}
            data-testid="viewport-environment"
          >
            <div
              className={`scene-art material-${material}`}
              style={{ transform: `scale(${zoom})` }}
              aria-label="Code-generated architectural environment"
            >
              <div className="moon" />
              <div className="mountain" />
              <div className="mountain two" />
              <div className="horizon" />
              <div className="house">
                <div className="house-roof" />
                <div className="house-wall" />
                <div className="house-wing" />
                <div className="window one" />
                <div className="window two" />
                <div className="window three" />
                <div className="window four" />
              </div>
              {showAnnotations && (
                <div className="scene-label" data-testid="text-scene-annotation">
                  North facade · 01 / 04
                </div>
              )}
              {!showAnnotations && <div className="scene-label">Aster house · study view</div>}
            </div>
            <div className="viewport-tools">
              <button
                type="button"
                className={`viewport-tool ${activeTool === 'select' ? 'active' : ''}`}
                onClick={() => setActiveTool('select')}
                aria-label="Select tool"
                data-testid="button-viewport-select"
              >
                <Target size={15} />
              </button>
              <button
                type="button"
                className={`viewport-tool ${activeTool === 'orbit' ? 'active' : ''}`}
                onClick={() => setActiveTool('orbit')}
                aria-label="Orbit camera"
                data-testid="button-viewport-orbit"
              >
                <Orbit size={15} />
              </button>
              <button
                type="button"
                className="viewport-tool"
                onClick={() => setZoom((value) => Math.min(1.35, Number((value + 0.1).toFixed(2))))}
                aria-label="Zoom in"
                data-testid="button-zoom-in"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                className="viewport-tool"
                onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))}
                aria-label="Zoom out"
                data-testid="button-zoom-out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="viewport-tool"
                onClick={resetCamera}
                aria-label="Reset camera"
                data-testid="button-reset-camera"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className="viewport-tool"
                onClick={() => setShowAnnotations((value) => !value)}
                aria-label="Toggle annotations"
                data-testid="button-toggle-annotations"
              >
                <Info size={14} />
              </button>
            </div>
            {!inputsOpen && (
              <button
                type="button"
                className="primary-button open-inputs-button"
                onClick={() => setInputsOpen(true)}
                data-testid="button-open-input-sheet"
              >
                <Sparkles size={14} /> Open scene inputs
              </button>
            )}
            {renderState === 'rendering' && (
              <div className="render-banner fade-in" data-testid="panel-render-progress">
                <h3>Building your environment</h3>
                <p>Mapping BIM intent into light, material, and distance.</p>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="prompt-foot">
                  <span>
                    {progress < 35
                      ? 'Reading geometry'
                      : progress < 72
                        ? 'Composing atmosphere'
                        : 'Finishing camera pass'}
                  </span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
            {!model && renderState !== 'rendering' && (
              <div className="render-banner fade-in" data-testid="panel-empty-environment">
                <h3>Waiting for a BIM model</h3>
                <p>Upload a Revit or ArchiCAD file on the left to map a scene.</p>
              </div>
            )}
          </div>
          <div className="viewport-footer">
            <div className="camera-readout">
              <span>
                <Compass size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                <strong>{cameraMode}</strong>
              </span>
              <span>
                <strong>FOV</strong> 54°
              </span>
              <span>
                <strong>ALT</strong> 1.8m
              </span>
              <span>
                <strong>TIME</strong> {formatTime(time)}
              </span>
            </div>
            <div className="view-pills">
              {['Perspective', 'Isometric', 'Section'].map((view) => (
                <button
                  type="button"
                  key={view}
                  className={`view-pill ${cameraMode === view ? 'active' : ''}`}
                  onClick={() => setCameraMode(view)}
                  data-testid={`button-camera-${view.toLowerCase()}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Inspector</div>
              <h2>Scene controls</h2>
            </div>
            <PanelRight size={14} color="#7e8995" />
          </div>
          <div className="inspector-block">
            <div className="inspector-title">
              <Camera size={14} /> Camera
            </div>
            <div className="control-row">
              <span>Lens</span>
              <span className="control-value">35 mm</span>
            </div>
            <input
              className="range-input"
              type="range"
              min="18"
              max="85"
              defaultValue="35"
              aria-label="Camera lens"
              data-testid="input-camera-lens"
            />
            <div className="control-row">
              <span>Elevation</span>
              <span className="control-value">1.8 m</span>
            </div>
            <input
              className="range-input"
              type="range"
              min="0"
              max="10"
              step=".1"
              defaultValue="1.8"
              aria-label="Camera elevation"
              data-testid="input-camera-elevation"
            />
          </div>
          <div className="inspector-block">
            <div className="inspector-title">
              <Sun size={14} /> Atmosphere
            </div>
            <div className="control-row">
              <span>Daylight</span>
              <span className="control-value">{formatTime(time)}</span>
            </div>
            <input
              className="range-input"
              type="range"
              min="5"
              max="23.9"
              step=".05"
              value={time}
              onChange={(event) => setTime(Number(event.target.value))}
              aria-label="Daylight time"
              data-testid="input-daylight-time"
            />
            <div className="toggle-row">
              <span>Sun shadows</span>
              <Toggle
                label="Sun shadows"
                on={showSun}
                onClick={() => setShowSun((value) => !value)}
              />
            </div>
            <div className="toggle-row">
              <span>Construction grid</span>
              <Toggle
                label="Construction grid"
                on={showGrid}
                onClick={() => setShowGrid((value) => !value)}
              />
            </div>
          </div>
          <div className="inspector-block">
            <div className="inspector-title">
              <Layers3 size={14} /> Material bias
            </div>
            <div className="swatches" role="group" aria-label="Material bias">
              {['sand', 'olive', 'coral', 'lilac', 'slate'].map((swatch) => (
                <button
                  type="button"
                  key={swatch}
                  className={`swatch ${swatch} ${material === swatch ? 'selected' : ''}`}
                  onClick={() => setMaterial(swatch)}
                  aria-label={`${swatch} material`}
                  data-testid={`button-material-${swatch}`}
                />
              ))}
            </div>
            <div className="control-row" style={{ marginTop: 17 }}>
              <span>Render quality</span>
            </div>
            <select
              className="select-control"
              value={quality}
              onChange={(event) => setQuality(event.target.value)}
              aria-label="Render quality"
              data-testid="select-render-quality"
            >
              <option>Cinematic</option>
              <option>Balanced</option>
              <option>Draft / fast</option>
            </select>
          </div>
          <div className="inspector-block">
            <div className="inspector-title">
              <Lightbulb size={14} /> Working note
            </div>
            <div className="saved-note" data-testid="text-working-note">
              <strong>Material read</strong>Keep the cedar soffit warm, but let the concrete carry
              the cool ambient sky.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

const dashboardProjects = [
  {
    id: 'aster-house',
    title: 'Aster House',
    kind: 'project',
    description: 'Exterior study',
    updated: '2 min ago',
    scenes: '04 scenes',
    model: 'Aster House.rvt',
    reference: 'courtyard_dusk.jpg',
    accent: 'ochre',
    current: true,
  },
  {
    id: 'cedar-courtyard',
    title: 'Cedar Courtyard',
    kind: 'project',
    description: 'Material and shadow tests',
    updated: 'Yesterday',
    scenes: '07 scenes',
    model: 'cedar-courtyard.pln',
    reference: '2 references',
    accent: 'sage',
  },
  {
    id: 'north-facade',
    title: 'North facade / 02',
    kind: 'scene',
    description: 'Overcast material pass',
    updated: '3 days ago',
    scenes: 'Scene only',
    model: 'Aster House.rvt',
    reference: 'No reference',
    accent: 'steel',
  },
  {
    id: 'marsh-pavilion',
    title: 'Marsh Pavilion',
    kind: 'project',
    description: 'Early massing study',
    updated: 'May 18',
    scenes: '03 scenes',
    model: 'Model needed',
    reference: 'marsh-light.png',
    accent: 'rose',
  },
];

function Dashboard() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('aster-house');
  const [selectionMessage, setSelectionMessage] = useState('Aster House is ready to continue.');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = dashboardProjects.filter((project) => {
    const matchesFilter =
      filter === 'all' || project.kind === (filter === 'projects' ? 'project' : 'scene');
    const matchesQuery =
      !normalizedQuery ||
      `${project.title} ${project.description}`.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });
  const selected =
    dashboardProjects.find((project) => project.id === selectedProject) ?? dashboardProjects[0];
  const chooseProject = (project) => {
    setSelectedProject(project.id);
    setSelectionMessage(`${project.title} selected. Continue in the studio when you are ready.`);
  };
  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <Link href="/dashboard" className="dashboard-brand" data-testid="link-dashboard-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <span className="brand-name">Lumen / Field</span>
            <span className="brand-sub">Architectural visualization studio</span>
          </span>
        </Link>
        <nav className="dashboard-nav" aria-label="Primary navigation">
          <Link
            href="/dashboard"
            className="dashboard-nav-link active"
            data-testid="link-dashboard-nav-home"
          >
            <LayoutDashboard size={14} /> Home
          </Link>
          <Link href="/" className="dashboard-nav-link" data-testid="link-dashboard-nav-studio">
            <Compass size={14} /> Studio
          </Link>
        </nav>
        <div className="dashboard-user">
          <span className="dashboard-status">
            <span className="status-dot" /> Local workspace
          </span>
          <span className="avatar">MC</span>
          <span className="dashboard-user-name">Mara Chen</span>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <div className="dashboard-kicker">
              <span className="kicker-line" /> Project home / 06.24
            </div>
            <h1>
              Good evening, <em>Mara.</em>
            </h1>
            <p>Pick up a study, check your ingredients, or step back into the light.</p>
          </div>
          <div className="dashboard-welcome-actions">
            <span className="dashboard-sync">
              <CheckCircle2 size={14} /> All changes saved locally
            </span>
            <Link
              href="/"
              className="primary-button dashboard-continue"
              data-testid="link-continue-studio"
            >
              Continue in studio <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        <section className="dashboard-feature-grid" aria-label="Current project">
          <button
            type="button"
            className={`featured-project ${selected.id === 'aster-house' ? 'selected' : ''}`}
            onClick={() => chooseProject(dashboardProjects[0])}
            data-testid="card-featured-aster-house"
          >
            <div className="featured-project-image" aria-hidden="true">
              <div className="dashboard-moon" />
              <div className="dashboard-ridge ridge-one" />
              <div className="dashboard-ridge ridge-two" />
              <div className="dashboard-house">
                <span className="dashboard-house-roof" />
                <span className="dashboard-house-body" />
                <span className="dashboard-house-window window-a" />
                <span className="dashboard-house-window window-b" />
                <span className="dashboard-house-window window-c" />
              </div>
              <span className="featured-image-label">Exterior / dusk 01</span>
            </div>
            <div className="featured-project-copy">
              <div className="project-card-topline">
                <span className="eyebrow">Current project</span>
                <ArrowUpRight size={15} />
              </div>
              <h2>Aster House</h2>
              <p>Exterior study</p>
              <div className="featured-meta">
                <span>
                  <span className="status-dot" /> Environment ready
                </span>
                <span>Edited 2 min ago</span>
              </div>
            </div>
          </button>

          <div className="selected-project-panel">
            <div className="eyebrow">Selected workspace</div>
            <div className="selected-project-title">
              <div>
                <h2 data-testid="text-selected-project">{selected.title}</h2>
                <span>{selected.description}</span>
              </div>
              <span className={`project-kind ${selected.kind}`}>{selected.kind}</span>
            </div>
            <p className="selection-message" data-testid="status-project-selection">
              {selectionMessage}
            </p>
            <div className="selected-project-stats">
              <div>
                <span className="stat-label">Scenes</span>
                <strong>{selected.scenes}</strong>
              </div>
              <div>
                <span className="stat-label">Last touched</span>
                <strong>{selected.updated}</strong>
              </div>
            </div>
            <Link
              href="/"
              className="secondary-button selected-project-action"
              data-testid="link-open-selected-project"
            >
              Open selected project <ChevronRight size={14} />
            </Link>
          </div>
        </section>

        <section className="readiness-strip" aria-label="Workspace readiness">
          <div className="readiness-heading">
            <div className="eyebrow">Workspace pulse</div>
            <h2>Ready to render</h2>
          </div>
          <div className="readiness-item">
            <span className="readiness-icon ready">
              <FileCheck2 size={16} />
            </span>
            <div>
              <span className="stat-label">BIM model</span>
              <strong>Aster House.rvt</strong>
              <small>18.4 MB · Revit</small>
            </div>
          </div>
          <div className="readiness-item">
            <span className="readiness-icon ready">
              <ImageIcon size={16} />
            </span>
            <div>
              <span className="stat-label">Reference</span>
              <strong>courtyard_dusk.jpg</strong>
              <small>Warm dusk study</small>
            </div>
          </div>
          <div className="readiness-item readiness-action">
            <span className="readiness-icon warm">
              <Sparkles size={16} />
            </span>
            <div>
              <span className="stat-label">Next pass</span>
              <strong>Exterior / dusk 01</strong>
              <small>Camera is saved locally</small>
            </div>
            <Link href="/" aria-label="Open next pass in studio" data-testid="link-open-next-pass">
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>

        <section className="dashboard-lower-grid">
          <div className="recent-projects-section">
            <div className="section-heading-row">
              <div>
                <div className="eyebrow">Your workspace</div>
                <h2>Recent projects &amp; scenes</h2>
              </div>
              <span className="small-meta">
                {visibleProjects.length} of {dashboardProjects.length}
              </span>
            </div>
            <div className="project-toolbar">
              <label className="dashboard-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects or scenes"
                  aria-label="Search projects or scenes"
                  data-testid="input-dashboard-search"
                />
                {query && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => setQuery('')}
                    aria-label="Clear project search"
                    data-testid="button-clear-dashboard-search"
                  >
                    <X size={13} />
                  </button>
                )}
              </label>
              <div className="filter-tabs" role="tablist" aria-label="Filter projects">
                {['all', 'projects', 'scenes'].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={filter === item ? 'active' : ''}
                    onClick={() => setFilter(item)}
                    role="tab"
                    aria-selected={filter === item}
                    data-testid={`button-filter-${item}`}
                  >
                    {item === 'all' ? 'All' : item === 'projects' ? 'Projects' : 'Scenes'}
                  </button>
                ))}
                <ListFilter size={14} aria-hidden="true" />
              </div>
            </div>
            {visibleProjects.length > 0 ? (
              <div className="project-list">
                {visibleProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    className={`project-list-item ${selectedProject === project.id ? 'selected' : ''}`}
                    onClick={() => chooseProject(project)}
                    data-testid={`card-recent-project-${project.id}`}
                  >
                    <span
                      className={`project-thumbnail thumb-${project.accent}`}
                      aria-hidden="true"
                    >
                      <span className="thumbnail-shape" />
                      <span className="thumbnail-light" />
                    </span>
                    <span className="project-list-copy">
                      <strong>{project.title}</strong>
                      <span>{project.description}</span>
                    </span>
                    <span className="project-list-kind">{project.kind}</span>
                    <span className="project-list-updated">
                      <Clock3 size={13} /> {project.updated}
                    </span>
                    <ChevronRight className="project-list-arrow" size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty" data-testid="empty-dashboard-projects">
                <SearchX size={21} />
                <strong>No studies found</strong>
                <span>Try a different name or clear the filter.</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                  data-testid="button-reset-dashboard-filter"
                >
                  Show all studies
                </button>
              </div>
            )}
          </div>

          <aside className="activity-section">
            <div className="section-heading-row">
              <div>
                <div className="eyebrow">Trace / local</div>
                <h2>Recent activity</h2>
              </div>
              <Activity size={15} />
            </div>
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-marker warm" />
                <div>
                  <strong>Rendered exterior / dusk 01</strong>
                  <span>Aster House · 2 min ago</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-marker sage" />
                <div>
                  <strong>Saved camera view</strong>
                  <span>Perspective · 8 min ago</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-marker steel" />
                <div>
                  <strong>Reference image inspected</strong>
                  <span>courtyard_dusk.jpg · 14 min ago</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-marker rose" />
                <div>
                  <strong>Model added to workspace</strong>
                  <span>Aster House.rvt · 21 min ago</span>
                </div>
              </div>
            </div>
            <div className="activity-note">
              <span className="eyebrow">Field note</span>
              <p>“Let the concrete carry the cool ambient sky.”</p>
              <span className="small-meta">Working note / Aster House</span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;
