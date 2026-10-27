import { useEffect, useState } from 'react';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Account from './pages/Account';
import Subscription from './pages/Subscription';
import { deleteLocalAssetsForProject } from './lib/local-assets';

const STORAGE_KEY = 'lumen-field-projects-v1';
const PROJECT_COVERS = {
  'aster-house': '/project-covers/aster-house.svg',
  brackwater: '/project-covers/brackwater.svg',
  northline: '/project-covers/northline.svg',
};

function routeFromHash() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const page = ['signin', 'dashboard', 'workspace', 'account', 'subscription'].includes(parts[0]) ? parts[0] : 'dashboard';
  if (page !== 'workspace') return { page };
  try {
    return { page, projectId: decodeURIComponent(parts[1] || '') };
  } catch {
    return { page: 'dashboard' };
  }
}

function hashForRoute(route) {
  return route.page === 'workspace'
    ? '#/workspace/' + encodeURIComponent(route.projectId || '')
    : '#/' + route.page;
}

const starterProjects = [
  {
    id: 'aster-house',
    name: 'Aster House',
    client: 'Maya + Theo Bennett',
    status: 'In review',
    updated: 'Today',
    image: '/project-covers/aster-house.svg',
    direction: 'Quiet courtyard home in board-formed concrete. Late afternoon light, native grasses, and warm interior glow.',
    feedback: [],
    snapshots: 2,
  },
  {
    id: 'brackwater',
    name: 'Brackwater House',
    client: 'Elliot Park',
    status: 'In progress',
    updated: 'Yesterday',
    image: '/project-covers/brackwater.svg',
    direction: 'A low timber house settled into a coastal landscape. Overcast sky, weathered cedar, and a sheltered arrival.',
    feedback: [],
    snapshots: 1,
  },
  {
    id: 'northline',
    name: 'Northline Studio',
    client: 'Northline Atelier',
    status: 'Approved',
    updated: 'Sep 28',
    image: '/project-covers/northline.svg',
    direction: 'A shared studio organized around a generous worktable. Soft daylight, honest materials, and a little greenery.',
    feedback: [],
    snapshots: 4,
  },
];

function readProjects() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const projects = stored ? JSON.parse(stored) : starterProjects;
    return projects.map((storedProject) => {
      const project = { ...storedProject };
      delete project.type;
      return {
        ...project,
        image: project.image?.startsWith('https://images.unsplash.com/')
          ? (PROJECT_COVERS[project.id] || PROJECT_COVERS.brackwater)
          : (project.image || PROJECT_COVERS[project.id] || PROJECT_COVERS.brackwater),
        feedback: Array.isArray(project.feedback) ? project.feedback : [],
        renders: Array.isArray(project.renders) ? project.renders : [],
        versions: Array.isArray(project.versions)
          ? project.versions
          : project.direction
            ? [{ id: `${project.id}-initial`, text: project.direction, createdAt: project.updated }]
            : [],
      };
    });
  } catch {
    return starterProjects.map((project) => ({
      ...project,
      feedback: Array.isArray(project.feedback) ? project.feedback : [],
      renders: Array.isArray(project.renders) ? project.renders : [],
      versions: project.direction
        ? [{ id: `${project.id}-initial`, text: project.direction, createdAt: project.updated }]
        : [],
    }));
  }
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [projects, setProjects] = useState(readProjects);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', syncRoute);
    if (!window.location.hash) window.location.hash = hashForRoute(route);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    const nextHash = hashForRoute(route);
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  }, [route]);

  useEffect(() => {
    if (route.page === 'workspace' && !projects.some((project) => project.id === route.projectId)) {
      setRoute({ page: 'dashboard' });
    }
  }, [projects, route]);

  const activeProject = projects.find((project) => project.id === route.projectId);
  const page = route.page === 'workspace' && !activeProject ? 'dashboard' : route.page;

  const openProject = (id) => {
    setRoute({ page: 'workspace', projectId: id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createProject = ({ name, client }) => {
    const project = {
      id: `project-${Date.now()}`,
      name,
      client: client || 'New client',
      status: 'In progress',
      updated: 'Just now',
      image: '/project-covers/brackwater.svg',
      referenceAsset: null,
      referenceName: 'Studio sample reference',
      modelAsset: null,
      prompt: '',
      direction: '',
      feedback: [],
      versions: [],
      renders: [],
      sceneContext: { environment: 'auto', ground: 'grass', upAxis: 'auto', overrides: {} },
    };
    setProjects((current) => [project, ...current]);
    setRoute({ page: 'workspace', projectId: project.id });
  };

  const updateProject = (id, changes) => {
    setProjects((current) => current.map((project) => (
      project.id === id ? { ...project, ...changes, updated: 'Just now' } : project
    )));
  };

  const deleteProject = async (id) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    const hasRemoteAssets = [project.modelAsset, project.sourceModelAsset, project.referenceAsset, ...(project.renders || [])]
      .some((asset) => asset && !asset.localOnly);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`API request failed (${response.status})`);
    } catch (error) {
      if (hasRemoteAssets) {
        throw new Error(`Could not delete the project's server files. Check that the local API is running and try again. ${error.message}`);
      }
    }

    await deleteLocalAssetsForProject(id);
    setProjects((current) => current.filter((item) => item.id !== id));
    if (route.page === 'workspace' && route.projectId === id) setRoute({ page: 'dashboard' });
  };

  const navigate = (target) => {
    if (['signin', 'dashboard', 'workspace', 'account', 'subscription'].includes(target)) {
      setRoute(target === 'workspace'
        ? { page: target, projectId: route.projectId }
        : { page: target });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-page">
      {page === 'signin' && <SignIn onNavigate={navigate} />}
      {page === 'dashboard' && <Dashboard projects={projects} onNavigate={navigate} onOpenProject={openProject} onCreateProject={createProject} onDeleteProject={deleteProject} />}
      {page === 'workspace' && activeProject && <Workspace project={activeProject} onUpdateProject={(changes) => updateProject(activeProject.id, changes)} onNavigate={navigate} />}
      {page === 'account' && <Account onNavigate={navigate} />}
      {page === 'subscription' && <Subscription onNavigate={navigate} />}
    </div>
  );
}
