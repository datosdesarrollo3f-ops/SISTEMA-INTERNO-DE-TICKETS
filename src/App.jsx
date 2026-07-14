import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import UserPortal from './components/UserPortal';
import AdminPortal from './components/AdminPortal';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'usuario' or 'admin'
  const [loading, setLoading] = useState(true);
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/login');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Check if session exists in localStorage
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole');
    
    if (savedUser && savedRole) {
      setCurrentUser(savedUser);
      setUserRole(savedRole);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/login');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Secure route guarding logic
  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      // If not logged in, force hash route to #/login
      if (currentHash !== '#/login') {
        window.location.hash = '#/login';
      }
    } else {
      // If logged in, restrict access to the matching layer path
      if (userRole === 'admin') {
        if (currentHash !== '#/admin') {
          window.location.hash = '#/admin';
        }
      } else if (userRole === 'usuario') {
        if (currentHash !== '#/portal') {
          window.location.hash = '#/portal';
        }
      }
    }
  }, [currentUser, userRole, currentHash, loading]);

  const handleLoginSuccess = (user, role) => {
    setCurrentUser(user);
    setUserRole(role);
    localStorage.setItem('currentUser', user);
    localStorage.setItem('userRole', role);
    
    // Set matching secure hash route upon login
    if (role === 'admin') {
      window.location.hash = '#/admin';
    } else {
      window.location.hash = '#/portal';
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    window.location.hash = '#/login';
  };

  if (loading) {
    return (
      <div className="portal-loading">
        <span className="spinner"></span>
        <p>Iniciando entorno seguro...</p>
      </div>
    );
  }

  // Fallback rendering during redirection redirects
  const isUnauthorized = 
    (!currentUser && currentHash !== '#/login') ||
    (currentUser && userRole === 'admin' && currentHash !== '#/admin') ||
    (currentUser && userRole === 'usuario' && currentHash !== '#/portal');

  if (isUnauthorized) {
    return (
      <div className="portal-loading">
        <span className="spinner"></span>
        <p>Redireccionando a sección autorizada...</p>
      </div>
    );
  }

  // Safe rendering
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} theme={theme} setTheme={setTheme} />;
  }

  return (
    <div className="app-layout">
      {/* Top Header Bar */}
      <div className="header-top">
        <div className="user-profile-badge">
          <span className={`role-badge ${userRole}`}>
            {userRole === 'admin' ? '🔑 Administrador' : '👤 Agente'}
          </span>
          <span className="user-display-name">{currentUser}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {theme === 'light' ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Salir del Sistema
          </button>
        </div>
      </div>

      {/* Render the appropriate portal depending on role & hash */}
      {userRole === 'admin' && currentHash === '#/admin' ? (
        <AdminPortal currentUser={currentUser} />
      ) : userRole === 'usuario' && currentHash === '#/portal' ? (
        <UserPortal />
      ) : null}
    </div>
  );
}

export default App;
