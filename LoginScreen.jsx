import React, { useState } from 'react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const userVal = username.trim();
    const passVal = password;

    // Simulate network delay to make it feel professional
    setTimeout(() => {
      const defaultUsers = {
        'usuario': { password: '123456', role: 'usuario' },
        'admin': { password: 'admin123', role: 'admin' }
      };

      const stored = localStorage.getItem('portal_users');
      let userDatabase = {};

      if (!stored) {
        localStorage.setItem('portal_users', JSON.stringify(defaultUsers));
        userDatabase = defaultUsers;
      } else {
        try {
          userDatabase = JSON.parse(stored);
        } catch (err) {
          userDatabase = defaultUsers;
        }
      }

      if (userDatabase[userVal] && userDatabase[userVal].password === passVal) {
        setErrorMsg('');
        onLoginSuccess(userVal, userDatabase[userVal].role);
      } else {
        setErrorMsg('Usuario o contraseña incorrectos.');
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div id="loginScreen" className="login-screen">
      {/* Background ambient animations */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <div className="bg-blob blob-3"></div>

      <div className="login-card-container">
        <div className="login-card">
          <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src="/logo3f.png" alt="Logo 3F" className="logo-img" style={{ width: '85px', height: '85px', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          </div>
          <h1>Sistema de Gestión de Reclamos</h1>
          <p className="login-subtitle">Municipalidad - Portal Interno de Cargas</p>

          {errorMsg && (
            <div className="error-msg show">
              <span className="error-icon">⚠️</span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-form-group">
              <label htmlFor="username">Usuario Institucional</label>
              <div className="input-icon-wrapper">
                <svg className="input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  type="text"
                  id="username"
                  placeholder="ej: juan.perez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="login-form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-icon-wrapper">
                <svg className="input-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={`login-btn ${isSubmitting ? 'loading' : ''}`} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="spinner"></span>
              ) : (
                <>🔓 Iniciar Sesión Seguro</>
              )}
            </button>
          </form>
        </div>
        <div className="login-footer">
          <p>© {new Date().getFullYear()} Municipalidad - Todos los derechos reservados.</p>
          <p className="secure-badge">🛡️ Conexión Encriptada SSL</p>
        </div>
      </div>
    </div>
  );
}
