import { useState } from 'react';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Account from './pages/Account';
import Subscription from './pages/Subscription';

export default function App() {
  const [page, setPage] = useState('signin');

  const navigate = (target) => {
    if (['signin', 'dashboard', 'workspace', 'account', 'subscription'].includes(target)) {
      setPage(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-page">
      {page === 'signin' && <SignIn onNavigate={navigate} />}
      {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
      {page === 'workspace' && <Workspace onNavigate={navigate} />}
      {page === 'account' && <Account onNavigate={navigate} />}
      {page === 'subscription' && <Subscription onNavigate={navigate} />}
    </div>
  );
}
