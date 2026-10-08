import { useMemo, useState } from 'react';
import Header from '../components/Header';

const filters = ['All projects', 'In progress', 'In review', 'Approved'];

function ProjectForm({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [type, setType] = useState('Residential');

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), client: client.trim(), type });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md border border-line bg-surface p-5 sm:p-6 rounded-[6px] flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-muted text-[11px] uppercase">New workspace</p>
            <h2 className="text-ink text-[18px] font-bold mt-1">Start a project</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>
        <label className="flex flex-col gap-1 text-ink-4 text-[12px]">Project name
          <input autoFocus required maxLength={70} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cedar Ridge House" className="bg-page border border-line rounded-[4px] px-3 py-2.5 text-ink outline-none focus:border-accent" />
        </label>
        <label className="flex flex-col gap-1 text-ink-4 text-[12px]">Client or practice
          <input maxLength={70} value={client} onChange={(event) => setClient(event.target.value)} placeholder="e.g. Jamie Rivera" className="bg-page border border-line rounded-[4px] px-3 py-2.5 text-ink outline-none focus:border-accent" />
        </label>
        <label className="flex flex-col gap-1 text-ink-4 text-[12px]">Project type
          <select value={type} onChange={(event) => setType(event.target.value)} className="bg-page border border-line rounded-[4px] px-3 py-2.5 text-ink outline-none focus:border-accent">
            <option>Residential</option><option>Workplace</option><option>Hospitality</option><option>Public space</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="border border-line text-ink-3 px-4 py-2 rounded-[4px] text-[12px]">Cancel</button>
          <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-[4px] text-[12px]">Create project</button>
        </div>
      </form>
    </div>
  );
}

export default function Dashboard({ projects, onNavigate, onOpenProject, onCreateProject }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All projects');
  const [formOpen, setFormOpen] = useState(false);
  const visibleProjects = useMemo(() => projects.filter((project) => {
    const matchesFilter = filter === 'All projects' || project.status === filter;
    const search = `${project.name} ${project.client} ${project.type}`.toLowerCase();
    return matchesFilter && search.includes(query.toLowerCase());
  }), [projects, query, filter]);
  const renderCount = projects.reduce((count, project) => count + (project.renders?.length || 0), 0);
  const feedbackCount = projects.reduce((count, project) => count + project.feedback.length, 0);

  const create = (details) => {
    setFormOpen(false);
    onCreateProject(details);
  };

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="bg-surface border border-line md:rounded-[6px] overflow-clip mx-auto w-full max-w-[1392px] flex flex-col min-h-screen">
        <Header onNavigate={onNavigate} currentPage="dashboard" variant="dashboard" />
        <main className="flex flex-col gap-7 sm:gap-9 p-4 sm:p-6 lg:p-9">
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-muted-2 text-[11px] uppercase">Northline Atelier <span className="mx-2 text-line">/</span> Project desk</p>
              <h1 className="text-ink font-bold text-[25px] sm:text-[30px] leading-tight mt-2">From BIM model to client-ready render.</h1>
              <p className="text-ink-4 text-[13px] leading-6 mt-2 max-w-xl">Bring a Revit or Archicad model, a reference image, and a prompt into one visualization workspace. Keep render studies, client notes, and sign-off with the project.</p>
            </div>
            <button onClick={() => setFormOpen(true)} className="bg-primary text-on-primary text-[13px] px-4 py-2.5 rounded-[4px] hover:bg-primary-hover transition-colors whitespace-nowrap self-start lg:self-auto">＋ New project</button>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 border-y border-line-2 py-4">
            <div className="flex items-center justify-between sm:block py-2 sm:py-0 sm:px-5 first:sm:pl-0 border-b sm:border-b-0 sm:border-r border-line-2">
              <span className="text-muted text-[11px] uppercase">Total projects</span><p className="text-ink text-[21px] font-bold sm:mt-1">{projects.length}</p>
            </div>
            <div className="flex items-center justify-between sm:block py-2 sm:py-0 sm:px-5 border-b sm:border-b-0 sm:border-r border-line-2">
              <span className="text-muted text-[11px] uppercase">Render studies</span><p className="text-ink text-[21px] font-bold sm:mt-1">{renderCount}</p>
            </div>
            <div className="flex items-center justify-between sm:block py-2 sm:py-0 sm:px-5 sm:pr-0">
              <span className="text-muted text-[11px] uppercase">Feedback captured</span><p className="text-ink text-[21px] font-bold sm:mt-1">{feedbackCount}</p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-ink text-[17px] font-bold">Your projects</h2>
                <p className="text-muted text-[12px] mt-1">One shared record from first direction to final approval.</p>
              </div>
              <label className="border border-line rounded-[4px] px-3 py-2 flex items-center gap-2 w-full md:w-[260px]">
                <span className="text-muted" aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or clients" aria-label="Search projects or clients" className="bg-transparent text-ink text-[12px] outline-none w-full placeholder:text-muted-2" />
              </label>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter projects">
              {filters.map((item) => (
                <button key={item} onClick={() => setFilter(item)} className={`shrink-0 px-3 py-1.5 rounded-[4px] text-[11px] border transition-colors ${filter === item ? 'bg-primary text-on-primary border-primary' : 'border-line text-muted hover:text-ink'}`}>{item}</button>
              ))}
            </div>

            {visibleProjects.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleProjects.map((project) => (
                  <article key={project.id} className="border border-line rounded-[6px] overflow-hidden bg-page flex flex-col">
                    <button onClick={() => onOpenProject(project.id)} className="relative h-[180px] text-left overflow-hidden group" style={{ backgroundImage: `linear-gradient(0deg, rgba(8,13,17,.72), transparent 55%), url('${project.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-label={`Open ${project.name}`}>
                      <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[1px] text-white/80">Studio reference</span>
                      <span className="absolute top-3 right-3 bg-black/55 text-white text-[10px] px-2 py-1 rounded-[3px]">{project.status}</span>
                    </button>
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div className="flex justify-between gap-3 items-start">
                        <div className="min-w-0">
                          <h3 className="text-ink font-bold text-[15px] truncate">{project.name}</h3>
                          <p className="text-muted text-[11px] mt-1 truncate">{project.client} <span className="mx-1.5">·</span> {project.type}</p>
                        </div>
                        <span className="text-muted text-[10px] whitespace-nowrap">{project.updated}</span>
                      </div>
                      <p className="text-ink-4 text-[12px] leading-5 line-clamp-2 min-h-10">{project.direction || 'Add a visual direction to start the client review.'}</p>
                      <div className="flex items-center justify-between border-t border-line-2 pt-3 mt-auto">
                        <span className="text-muted text-[10px]">{project.renders?.length || 0} renders · {project.modelAsset?.name || 'No model'} · {project.feedback.length} {project.feedback.length === 1 ? 'note' : 'notes'}</span>
                        <button onClick={() => onOpenProject(project.id)} className="text-accent text-[11px]">Open project →</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-line rounded-[6px] py-14 px-5 text-center">
                <h3 className="text-ink font-bold text-[15px]">No projects match that view.</h3>
                <p className="text-muted text-[12px] mt-2">Clear your search or start a new project.</p>
                <button onClick={() => { setQuery(''); setFilter('All projects'); setFormOpen(true); }} className="text-accent text-[12px] mt-4">＋ Create a project</button>
              </div>
            )}
          </section>
          <footer className="border-t border-line-2 pt-4 flex flex-col sm:flex-row sm:justify-between gap-2 text-muted text-[10px]">
            <span>Lumen / Field · BIM visualization for architecture studios</span>
            <span>Prototype workspace · Data stays in this browser</span>
          </footer>
        </main>
      </div>
      {formOpen && <ProjectForm onClose={() => setFormOpen(false)} onCreate={create} />}
    </div>
  );
}