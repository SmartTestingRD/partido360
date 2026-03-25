import { useState, useEffect } from 'react';
import axios from 'axios';
import RegistrarPersona from './pages/RegistrarPersona';
import Lideres from './pages/Lideres';
import Personas from './pages/Personas';
import LiderDetalle from './pages/LiderDetalle';
import PersonaDetalle from './pages/PersonaDetalle';
import Ajustes from './pages/Ajustes';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import LiderDashboard from './pages/LiderDashboard';

// Layout wrapper to share the sidebar across pages
const Layout = ({ children, currentPath, navigate }: { children: React.ReactNode, currentPath: string, navigate: (path: string) => void }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navTo = (path: string) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const userStr = localStorage.getItem('user');
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) { }
  }

  const nombreCompleto = user?.nombre_completo || 'Usuario';
  const rawRole = user?.rol_nombre || 'Invitado';
  let roleDisplay = rawRole;
  if (rawRole === 'ADMIN') roleDisplay = 'Administrador';
  else if (rawRole === 'COORDINADOR') roleDisplay = 'Coordinador';
  else if (rawRole === 'SUB_LIDER') roleDisplay = 'Sub-Líder';
  else if (rawRole === 'SUB-LIDER' || rawRole === 'Sub-Lider') roleDisplay = 'Sub-Líder';

  const [candidatoInfo, setCandidatoInfo] = useState<string>('');
  useEffect(() => {
    const token = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    if (!token || !uStr) return;
    const u = JSON.parse(uStr);
    if (u.rol_nombre !== 'ADMIN') {
      axios.get('http://localhost:3001/api/candidatos', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data.data && res.data.data.length > 0) {
          setCandidatoInfo(res.data.data[0].nombre);
        }
      }).catch(() => {});
    }
  }, []);

  // Get initials
  const nameParts = nombreCompleto.split(' ');
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : nombreCompleto.substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans text-text-light dark:text-text-dark antialiased transition-colors duration-200 w-full">

      {/* Overlay oscuro para mobile cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark flex-shrink-0 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <span className="material-symbols-outlined text-3xl">how_to_vote</span>
            <span>Partido360</span>
          </div>
          {/* Botón cerrar sidebar en mobile */}
          <button
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button onClick={() => navTo('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${currentPath === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors ${currentPath === 'dashboard' ? '' : 'text-gray-400 group-hover:text-primary'}`}>dashboard</span>
            <span className={currentPath === 'dashboard' ? '' : 'font-medium'}>Dashboard</span>
          </button>
          <button onClick={() => navTo('lideres')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${currentPath === 'lideres' || currentPath.startsWith('lideres/') ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors ${currentPath === 'lideres' || currentPath.startsWith('lideres/') ? '' : 'text-gray-400 group-hover:text-primary'}`}>supervisor_account</span>
            <span className={currentPath === 'lideres' || currentPath.startsWith('lideres/') ? '' : 'font-medium'}>Líderes</span>
          </button>
          <button onClick={() => navTo('captacion')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${currentPath === 'captacion' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors ${currentPath === 'captacion' ? '' : 'text-gray-400 group-hover:text-primary'}`}>person_add</span>
            <span className={currentPath === 'captacion' ? '' : 'font-medium'}>Captación</span>
          </button>
          <button onClick={() => navTo('personas')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${currentPath === 'personas' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors ${currentPath === 'personas' ? '' : 'text-gray-400 group-hover:text-primary'}`}>groups</span>
            <span className={currentPath === 'personas' ? '' : 'font-medium'}>Personas</span>
          </button>
          <button onClick={() => navTo('militancia')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${currentPath === 'militancia' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors ${currentPath === 'militancia' ? '' : 'text-gray-400 group-hover:text-primary'}`}>diversity_3</span>
            <span className={currentPath === 'militancia' ? '' : 'font-medium'}>Militancia</span>
          </button>

          <div className="pt-4 mt-4 border-t border-border-light dark:border-border-dark">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Configuración</p>
            <button onClick={() => navTo('ajustes')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${currentPath === 'ajustes' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <span className={`material-symbols-outlined transition-colors ${currentPath === 'ajustes' ? '' : 'text-gray-400 group-hover:text-primary'}`}>settings</span>
              <span className={currentPath === 'ajustes' ? '' : 'font-medium'}>Ajustes</span>
            </button>
          </div>
        </nav>
        <div className="p-4 border-t border-border-light dark:border-border-dark group">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background-light dark:hover:ring-offset-background-dark transition-all"
              onClick={() => navTo('ajustes')}
              title="Ir a Perfil"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navTo('ajustes')}>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">{nombreCompleto}</p>
              <p className="text-xs text-gray-500 truncate">{roleDisplay}</p>
              {candidatoInfo && (
                <p className="text-xs text-primary font-semibold truncate flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">how_to_vote</span>
                  {candidatoInfo}
                </p>
              )}
            </div>
            <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('login'); }} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-50 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark shadow-sm h-16 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2 font-bold text-lg text-primary">
              <span className="material-symbols-outlined text-2xl">how_to_vote</span>
              <span onClick={() => navTo('dashboard')} className="cursor-pointer">Partido360</span>
            </div>
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navTo('ajustes')}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate max-w-[120px]">{nombreCompleto}</p>
              <p className="text-xs text-gray-500 leading-tight">{roleDisplay}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm hover:ring-2 hover:ring-primary transition-all">
              {initials}
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
};

function App() {
  // Simple Hash Router Simulation
  const [currentPath, setCurrentPath] = useState('lideres');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const token = localStorage.getItem('token');

      // Check for public routes
      const isPublicRoute = hash === 'login' || hash === 'forgot-password' || hash.startsWith('reset-password');

      if (!token && !isPublicRoute) {
        window.location.hash = 'login';
        setCurrentPath('login');
        return;
      }

      // Helper: default landing page per role
      const getDefaultPath = () => {
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          const rol = (u.rol_nombre || '').toUpperCase().replace(/[-_\s]/g, '');
          if (rol === 'SUBLIDER' || rol === 'LIDER') return 'dashboard';
        } catch {}
        return 'personas';
      };

      // If logged in and trying to go to login, redirect to role default
      if (token && isPublicRoute && hash === 'login') {
        const defaultPath = getDefaultPath();
        window.location.hash = defaultPath;
        setCurrentPath(defaultPath);
        return;
      }

      if (['login', 'lideres', 'captacion', 'personas', 'dashboard', 'militancia', 'ajustes', 'forgot-password'].includes(hash) || hash.startsWith('lideres/') || hash.startsWith('personas/') || hash.startsWith('reset-password')) {
        setCurrentPath(hash);
      } else if (hash === '') {
        if (token) {
          const defaultPath = getDefaultPath();
          window.location.hash = defaultPath;
          setCurrentPath(defaultPath);
        } else {
          setCurrentPath('login');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // initial load
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  if (currentPath === 'login') {
    return <Login />;
  }

  if (currentPath === 'forgot-password') {
    return <ForgotPassword />;
  }

  if (currentPath.startsWith('reset-password')) {
    return <ResetPassword />;
  }

  const renderContent = () => {
    if (currentPath.startsWith('lideres/')) {
      return <LiderDetalle id={currentPath.split('/')[1]} onBack={() => navigate('lideres')} />;
    }
    if (currentPath.startsWith('personas/')) {
      return <PersonaDetalle id={currentPath.split('/')[1]} onBack={() => window.history.back()} />;
    }

    const userStr = localStorage.getItem('user');
    let user = null;
    if (userStr) {
      try { user = JSON.parse(userStr); } catch (e) { }
    }
    const isLider = user?.rol_nombre === 'SUB_LIDER';

    switch (currentPath) {
      case 'dashboard':
        return isLider ? <LiderDashboard /> : <Dashboard />;
      case 'captacion':
        return <RegistrarPersona />;
      case 'lideres':
        return <Lideres />;
      case 'personas':
        return <Personas />;
      case 'militancia':
        return <div className="p-8 text-center"><p className="text-xl text-gray-500">Militancia General (En Desarrollo)</p></div>;
      case 'ajustes':
        return <Ajustes />;
      default:
        return <div className="p-8 text-center"><p className="text-xl text-gray-500">Página no encontrada</p></div>;
    }
  };

  return (
    <Layout currentPath={currentPath} navigate={navigate}>
      {renderContent()}
    </Layout>
  );
}

export default App;
