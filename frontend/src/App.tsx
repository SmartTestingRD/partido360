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
import Militancia from './pages/Militancia';

// Layout wrapper to share the sidebar across pages
const Layout = ({ children, currentPath, navigate }: { children: React.ReactNode, currentPath: string, navigate: (path: string) => void }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const roleDisplay = user?.rol_nombre || 'Sin rol';

  const [candidatoInfo, setCandidatoInfo] = useState<string>('');
  useEffect(() => {
    const token = localStorage.getItem('token');
    const uStr = localStorage.getItem('user');
    if (!token || !uStr) return;
    const u = JSON.parse(uStr);
    const rolNormLayout = (u.rol_nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[-_\s]/g, '');
    if (rolNormLayout !== 'ADMIN') {
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
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark flex-shrink-0 transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-border-light dark:border-border-dark ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
          <div className={`flex items-center font-bold text-xl text-primary ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
            <span className="material-symbols-outlined text-3xl flex-shrink-0">how_to_vote</span>
            {!sidebarCollapsed && <span>Partido360</span>}
          </div>
          {/* Botón cerrar sidebar en mobile */}
          {!sidebarCollapsed && (
            <button
              className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {/* Dashboard */}
          <button onClick={() => navTo('dashboard')} title={sidebarCollapsed ? 'Dashboard' : undefined}
            className={`w-full flex items-center py-2.5 rounded-lg transition-colors group ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${currentPath === 'dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors flex-shrink-0 ${currentPath === 'dashboard' ? '' : 'text-gray-400 group-hover:text-primary'}`}>dashboard</span>
            {!sidebarCollapsed && <span className={currentPath === 'dashboard' ? '' : 'font-medium'}>Dashboard</span>}
          </button>
          {/* Líderes */}
          <button onClick={() => navTo('lideres')} title={sidebarCollapsed ? 'Líderes' : undefined}
            className={`w-full flex items-center py-2.5 rounded-lg transition-colors group ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${currentPath === 'lideres' || currentPath.startsWith('lideres/') ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors flex-shrink-0 ${currentPath === 'lideres' || currentPath.startsWith('lideres/') ? '' : 'text-gray-400 group-hover:text-primary'}`}>supervisor_account</span>
            {!sidebarCollapsed && <span className={currentPath === 'lideres' || currentPath.startsWith('lideres/') ? '' : 'font-medium'}>Líderes</span>}
          </button>
          {/* Captación */}
          <button onClick={() => navTo('captacion')} title={sidebarCollapsed ? 'Captación' : undefined}
            className={`w-full flex items-center py-2.5 rounded-lg transition-colors group ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${currentPath === 'captacion' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors flex-shrink-0 ${currentPath === 'captacion' ? '' : 'text-gray-400 group-hover:text-primary'}`}>person_add</span>
            {!sidebarCollapsed && <span className={currentPath === 'captacion' ? '' : 'font-medium'}>Captación</span>}
          </button>
          {/* Personas */}
          <button onClick={() => navTo('personas')} title={sidebarCollapsed ? 'Personas' : undefined}
            className={`w-full flex items-center py-2.5 rounded-lg transition-colors group ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${currentPath === 'personas' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors flex-shrink-0 ${currentPath === 'personas' ? '' : 'text-gray-400 group-hover:text-primary'}`}>groups</span>
            {!sidebarCollapsed && <span className={currentPath === 'personas' ? '' : 'font-medium'}>Personas</span>}
          </button>
          {/* Militancia */}
          <button onClick={() => navTo('militancia')} title={sidebarCollapsed ? 'Militancia' : undefined}
            className={`w-full flex items-center py-2.5 rounded-lg transition-colors group ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${currentPath === 'militancia' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <span className={`material-symbols-outlined transition-colors flex-shrink-0 ${currentPath === 'militancia' ? '' : 'text-gray-400 group-hover:text-primary'}`}>diversity_3</span>
            {!sidebarCollapsed && <span className={currentPath === 'militancia' ? '' : 'font-medium'}>Militancia</span>}
          </button>

          <div className={`pt-4 mt-4 border-t border-border-light dark:border-border-dark`}>
            {!sidebarCollapsed && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Configuración</p>}
            {/* Ajustes */}
            <button onClick={() => navTo('ajustes')} title={sidebarCollapsed ? 'Ajustes' : undefined}
              className={`w-full flex items-center py-2.5 rounded-lg transition-colors group ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${currentPath === 'ajustes' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <span className={`material-symbols-outlined transition-colors flex-shrink-0 ${currentPath === 'ajustes' ? '' : 'text-gray-400 group-hover:text-primary'}`}>settings</span>
              {!sidebarCollapsed && <span className={currentPath === 'ajustes' ? '' : 'font-medium'}>Ajustes</span>}
            </button>
          </div>
        </nav>

        {/* Toggle collapse button (desktop only) */}
        <div className="hidden md:block px-2 pb-1">
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className={`w-full flex items-center py-2.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
            {!sidebarCollapsed && <span className="text-sm">Colapsar</span>}
          </button>
        </div>

        {/* User profile */}
        <div className={`p-4 border-t border-border-light dark:border-border-dark group ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          {sidebarCollapsed ? (
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => navTo('ajustes')}
              title={`${nombreCompleto} — ${roleDisplay}`}
            >
              {initials}
            </div>
          ) : (
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
          )}
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
  const [currentPath, setCurrentPath] = useState('');

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
          const rol = (u.rol_nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[-_\s]/g, '');
          if (rol === 'ADMIN' || rol === 'COORDINADOR') return 'dashboard';
          if (rol.includes('LIDER')) return 'dashboard';
        } catch {}
        return 'dashboard';
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

  // Guard: wait for auth check before rendering anything
  if (currentPath === '') return null;

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
    const userParsed = JSON.parse(userStr || '{}');
    const rol = (userParsed.rol_nombre || '').toString().trim();

    const mostrarLiderDashboard = rol === 'Sub-Líder' || rol === 'Sub-Lider' || rol === 'SUB_LIDER' || rol === 'SUBLIDER';
    const mostrarDashboardAdmin = !mostrarLiderDashboard;

    switch (currentPath) {
      case 'dashboard':
        return mostrarDashboardAdmin ? <Dashboard /> : <LiderDashboard />;
      case 'captacion':
        return <RegistrarPersona />;
      case 'lideres':
        return <Lideres />;
      case 'personas':
        return <Personas />;
      case 'militancia':
        return <Militancia />;
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
