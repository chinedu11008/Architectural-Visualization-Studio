import { useEffect, useState } from 'react';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Account from './pages/Account';
import Subscription from './pages/Subscription';

const STORAGE_KEY = 'lumen-field-projects-v1';

const starterProjects = [
  {
    id: 'aster-house',
    name: 'Aster House',
    client: 'Maya + Theo Bennett',
    type: 'Residential',
    status: 'In review',
    updated: 'Today',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
    direction: 'Quiet courtyard home in board-formed concrete. Late afternoon light, native grasses, and warm interior glow.',
    feedback: [],
    snapshots: 2,
  },
  {
    id: 'brackwater',
    name: 'Brackwater House',
    client: 'Elliot Park',
    type: 'Residential',
    status: 'In progress',
    updated: 'Yesterday',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85',
    direction: 'A low timber house settled into a coastal landscape. Overcast sky, weathered cedar, and a sheltered arrival.',
    feedback: [],
    snapshots: 1,
  },
  {
    id: 'northline',
    name: 'Northline Studio',
    client: 'Northline Atelier',
    type: 'Workplace',
    status: 'Approved',
    updated: 'Sep 28',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
    direction: 'A shared studio organized around a generous worktable. Soft daylight, honest materials, and a little greenery.',
    feedback: [],
    snapshots: 4,
  },
];

function readProjects() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const projects = stored ? JSON.parse(stored) : starterProjects;
    return projects.map((project) => ({
      ...project,
      versions: Array.isArray(project.versions)
        ? project.versions
        : project.direction
          ? [{ id: `${project.id}-initial`, text: project.direction, createdAt: project.updated }]
          : [],
    }));
  } catch {
    return starterProjects;
  }
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [projects, setProjects] = useState(readProjects);
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0];

  const openProject = (id) => {
    setActiveProjectId(id);
    setPage('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createProject = ({ name, client, type }) => {
    const project = {
      id: `project-${Date.now()}`,
      name,
      client: client || 'New client',
      type,
      status: 'In progress',
      updated: 'Just now',
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85',
      referenceImage: null,
      referenceName: 'Studio sample reference',
      modelAsset: null,
      prompt: '',
      direction: '',
      feedback: [],
      versions: [],
      renders: [],
    };
    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setPage('workspace');
  };

  const updateProject = (id, changes) => {
    setProjects((current) => current.map((project) => (
      project.id === id ? { ...project, ...changes, updated: 'Just now' } : project
    )));
  };

  const navigate = (target) => {
    if (['signin', 'dashboard', 'workspace', 'account', 'subscription'].includes(target)) {
      setPage(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-page">
      {page === 'signin' && <SignIn onNavigate={navigate} />}
      {page === 'dashboard' && <Dashboard projects={projects} onNavigate={navigate} onOpenProject={openProject} onCreateProject={createProject} />}
      {page === 'workspace' && activeProject && <Workspace project={activeProject} onUpdateProject={(changes) => updateProject(activeProject.id, changes)} onNavigate={navigate} />}
      {page === 'account' && <Account onNavigate={navigate} />}
      {page === 'subscription' && <Subscription onNavigate={navigate} />}
    </div>
  );
}
