import React, { useState, useEffect } from 'react';

const SUPABASE_URL = "https://mcabmoabfythqrbeywct.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYWJtb2FiZnl0aHFyYmV5d2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzIxMjEsImV4cCI6MjA5OTU0ODEyMX0.mOsE8dGseQ493mwfxiIU8_ET1uN4BeYBJ7z4TXh9ik4";

const mapSupabaseToTicket = (r) => ({
  "ID PEDIDO": r.id_pedido || '',
  "ESTADO APROBACION": r.estado_aprobacion || '',
  "AREA": r.area || '',
  "TIPO DE DEPENDENCIA": r.tipo_dependencia || '',
  "INSTITUCIÓN": r.institucion || '',
  "DIRECCIÓN": r.direccion || '',
  "VÍA DE INGRESO": r.via_ingreso || '',
  "FECHA CARGA AL SISTEMA": r.fecha_carga || '',
  "FECHA RESOLUCIÓN": r.fecha_resolucion || '',
  "DÍAS SIN RESPUESTA": r.dias_sin_respuesta,
  "TIPO DE PEDIDO": r.tipo_pedido || '',
  "DETALLE": r.detalle || '',
  "NOMBRE Y APELLIDO SOLICITANTE": r.nombre_solicitante || '',
  "CARGO SOLICITANTE": r.cargo_solicitante || '',
  "ACCIONES": r.acciones || '',
  "ESTADO DEL RECLAMO": r.estado_reclamo || ''
});

export default function AdminPortal({ currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState('');
  
  // Tab states
  const [activeTab, setActiveTab] = useState('tickets');
  
  // User Management state
  const [userList, setUserList] = useState({});
  const [usernameForm, setUsernameForm] = useState('');
  const [passwordForm, setPasswordForm] = useState('');
  const [roleForm, setRoleForm] = useState('usuario');
  const [editingUsername, setEditingUsername] = useState(null);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');
  
  // Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTicketsFromSupabase = async (isManual = false) => {
    if (isManual) setIsSyncing(true);
    try {
      const url = `${SUPABASE_URL}/rest/v1/reclamos?select=*`;
      const res = await fetch(url, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapSupabaseToTicket);
          setTickets(mapped);
          const now = new Date();
          const formattedTime = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          setLastUpdated(`Nube (Supabase) - ${formattedTime}`);
        }
      }
    } catch (err) {
      console.warn("[Supabase] Error al cargar tickets desde la nube:", err);
    } finally {
      setLoadingTickets(false);
      if (isManual) setIsSyncing(false);
    }
  };

  const handleRunBotLocal = async () => {
    setBotStatusMessage('⏳ Conectando con el servidor local en tu PC...');
    setBotRunning(true);
    
    try {
      const res = await fetch('http://127.0.0.1:5000/ejecutar-bot', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setBotStatusMessage('🚀 Bot iniciado en tu PC. Descargando tickets de Jira...');
        
        const interval = setInterval(async () => {
          try {
            const pollRes = await fetch('http://127.0.0.1:5000/');
            const pollData = await pollRes.json();
            
            if (!pollData.bot_ejecutando) {
              clearInterval(interval);
              setBotRunning(false);
              if (pollData.ultimo_resultado === 'Éxito') {
                setBotStatusMessage('✅ ¡Bot finalizado con éxito! Sincronizando datos...');
                fetchTicketsFromSupabase(true);
              } else {
                setBotStatusMessage(`⚠️ El bot finalizó: ${pollData.ultimo_resultado}`);
              }
              setTimeout(() => setBotStatusMessage(''), 8000);
            }
          } catch (e) {
            clearInterval(interval);
            setBotRunning(false);
            setBotStatusMessage('⚠️ Conexión perdida con el servidor local.');
          }
        }, 3000);
      } else {
        setBotRunning(false);
        setBotStatusMessage(`⚠️ ${data.message || 'El servidor local está ocupado.'}`);
      }
    } catch (err) {
      setBotRunning(false);
      setBotStatusMessage('❌ Servidor local no detectado en tu PC (http://localhost:5000). Asegúrate de tener "Iniciar Servidor Local.bat" abierto.');
    }
  };

  useEffect(() => {
    // 1. Cargar datos locales de inmediato si existen (para respuesta instantánea)
    if (window.baseTicketeraData && window.baseTicketeraData.length > 0) {
      setTickets(window.baseTicketeraData);
      setLoadingTickets(false);
    }
    if (window.baseTicketeraLastUpdated) {
      setLastUpdated(window.baseTicketeraLastUpdated);
    }

    // 2. Traer en tiempo real la versión más reciente desde Supabase Nube
    fetchTicketsFromSupabase();

    // Load users from localStorage
    const defaultUsers = {
      'usuario': { password: '123456', role: 'usuario' },
      'admin': { password: 'admin123', role: 'admin' }
    };
    const stored = localStorage.getItem('portal_users');
    if (!stored) {
      localStorage.setItem('portal_users', JSON.stringify(defaultUsers));
      setUserList(defaultUsers);
    } else {
      try {
        setUserList(JSON.parse(stored));
      } catch (err) {
        setUserList(defaultUsers);
      }
    }
  }, []);

  // Compute stats
  const totalTickets = tickets.length;
  const approvedTickets = tickets.filter(t => t['ESTADO APROBACION'] === 'APROBADO').length;
  const pendingTickets = tickets.filter(t => t['ESTADO APROBACION'] === 'PENDIENTE A APROBAR').length;

  // Get unique claim statuses for filter dropdown
  const uniqueClaimStatuses = [...new Set(tickets.map(t => t['ESTADO DEL RECLAMO']).filter(Boolean))].sort();

  // Helper for Jira workflow status badge classes
  const getStatusBadgeClass = (status) => {
    if (!status) return 'badge-status';
    const statusLow = status.toLowerCase();
    
    // Completed / Done (Green)
    if (statusLow.includes('completado') || statusLow.includes('resuelto') || statusLow.includes('cerrado') || statusLow.includes('finalizado') || statusLow.includes('aprobado') || statusLow.includes('listo')) {
      return 'badge-status badge-approved-status';
    }
    
    // In Progress / Reviewing (Blue)
    if (statusLow.includes('en curso') || statusLow.includes('en progreso') || statusLow.includes('relevar') || statusLow.includes('planificado') || statusLow.includes('relevado')) {
      return 'badge-status badge-in-progress-status';
    }
    
    // To Do / Pending Approval (Yellow/Grey)
    return 'badge-status badge-pending-status';
  };

  // Filtered Tickets logic
  const filteredTickets = tickets.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    const matchesText = !query || 
      (t['ID PEDIDO'] && t['ID PEDIDO'].toLowerCase().includes(query)) ||
      (t['NOMBRE Y APELLIDO SOLICITANTE'] && t['NOMBRE Y APELLIDO SOLICITANTE'].toLowerCase().includes(query)) ||
      (t['DETALLE'] && t['DETALLE'].toLowerCase().includes(query)) ||
      (t['TIPO DE PEDIDO'] && t['TIPO DE PEDIDO'].toLowerCase().includes(query));

    const matchesAppStatus = !statusFilter || t['ESTADO APROBACION'] === statusFilter;
    const matchesClaimStatus = !claimStatusFilter || t['ESTADO DEL RECLAMO'] === claimStatusFilter;

    return matchesText && matchesAppStatus && matchesClaimStatus;
  });

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  // User Management Handlers
  const handleSaveUser = (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    const uName = usernameForm.trim().toLowerCase();
    const uPass = passwordForm.trim();
    
    if (!uName || !uPass) {
      setUserError('El usuario y la contraseña no pueden estar vacíos.');
      return;
    }

    const updated = { ...userList };
    
    if (editingUsername) {
      // Editing user
      if (editingUsername !== uName && updated[uName]) {
        setUserError('Ya existe un usuario con ese nombre.');
        return;
      }
      
      // If renamed, delete old key
      if (editingUsername !== uName) {
        delete updated[editingUsername];
      }
      
      updated[uName] = { password: uPass, role: roleForm };
      setUserSuccess('Usuario actualizado con éxito.');
    } else {
      // Creating user
      if (updated[uName]) {
        setUserError('El usuario ya existe.');
        return;
      }
      updated[uName] = { password: uPass, role: roleForm };
      setUserSuccess('Usuario creado con éxito.');
    }

    // Save and clear form
    setUserList(updated);
    localStorage.setItem('portal_users', JSON.stringify(updated));
    
    setUsernameForm('');
    setPasswordForm('');
    setRoleForm('usuario');
    setEditingUsername(null);
  };

  const handleEditUser = (uname) => {
    setUserError('');
    setUserSuccess('');
    setEditingUsername(uname);
    setUsernameForm(uname);
    setPasswordForm(userList[uname].password);
    setRoleForm(userList[uname].role);
  };

  const handleDeleteUser = (uname) => {
    setUserError('');
    setUserSuccess('');
    
    if (uname === currentUser) {
      setUserError('No puedes eliminar el usuario con el que estás conectado actualmente.');
      return;
    }

    const updated = { ...userList };
    delete updated[uname];
    
    setUserList(updated);
    localStorage.setItem('portal_users', JSON.stringify(updated));
    setUserSuccess('Usuario eliminado con éxito.');
    
    // Clear editing state if the deleted user was being edited
    if (editingUsername === uname) {
      setEditingUsername(null);
      setUsernameForm('');
      setPasswordForm('');
      setRoleForm('usuario');
    }
  };

  const handleCancelEdit = () => {
    setEditingUsername(null);
    setUsernameForm('');
    setPasswordForm('');
    setRoleForm('usuario');
    setUserError('');
    setUserSuccess('');
  };

  return (
    <div className="container">
      <header>
        <h1>🏛️ Dashboard de Administración</h1>
        <p>Monitoreo y consulta en tiempo real de la base de tickets de Jira</p>
      </header>

      {/* Tab Menu Selector */}
      <div className="tab-menu">
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          🎫 Reclamos Jira
        </button>
        <button 
          className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          👥 Gestión de Usuarios
        </button>
      </div>

      {activeTab === 'tickets' ? (
        tickets.length === 0 ? (
          <div className="no-data-warning" style={{ margin: '0 auto', maxWidth: '650px' }}>
            <span style={{ fontSize: '40px' }}>⚠️</span>
            <h2>Base de datos no encontrada</h2>
            <p style={{ color: '#a0aec0', fontSize: '14px', lineHeight: '1.6' }}>
              No se han podido cargar los datos de <strong>base_ticketera.js</strong>.<br />
              Por favor, asegúrate de que el bot de Python se haya ejecutado correctamente para generar el archivo de base de datos local en la carpeta del sistema.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h4>Total Reclamos</h4>
                  <div className="stat-number">{totalTickets}</div>
                </div>
              </div>
              <div className="stat-card approved">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h4>Aprobados (Historial)</h4>
                  <div className="stat-number">{approvedTickets}</div>
                </div>
              </div>
              <div className="stat-card pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <h4>Pendientes de Aprobación</h4>
                  <div className="stat-number">{pendingTickets}</div>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
              <div className="search-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar por ID, solicitante, tipo de pedido o detalle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Aprobación (Todos)</option>
                <option value="APROBADO">APROBADO</option>
                <option value="PENDIENTE A APROBAR">PENDIENTE A APROBAR</option>
              </select>

              <select
                className="filter-select"
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
              >
                <option value="">Estado Reclamo (Todos)</option>
                {uniqueClaimStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Table Container */}
            <div className="table-card">
              <div className="table-header-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3>Listado de Solicitudes</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {lastUpdated && <span className="update-time">Actualizado: {lastUpdated}</span>}
                  
                  <button 
                    onClick={handleRunBotLocal} 
                    disabled={botRunning}
                    title="Ejecutar el bot de Jira en tu PC local"
                    style={{
                      background: botRunning ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      border: botRunning ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      color: botRunning ? '#facc15' : '#34d399',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      cursor: botRunning ? 'wait' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {botRunning ? '⚡ Descargando Tickets...' : '🤖 Descargar Tickets Jira'}
                  </button>

                  <button 
                    onClick={() => fetchTicketsFromSupabase(true)} 
                    disabled={isSyncing}
                    title="Actualizar datos desde la nube de Supabase"
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#818cf8',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      cursor: isSyncing ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSyncing ? '⏳ Sincronizando...' : '🔄 Sincronizar Nube'}
                  </button>
                </div>
              </div>

              {botStatusMessage && (
                <div style={{
                  margin: '12px 0 5px 0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  background: botStatusMessage.includes('❌') || botStatusMessage.includes('⚠️') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: botStatusMessage.includes('❌') || botStatusMessage.includes('⚠️') ? '#f87171' : '#34d399',
                  border: botStatusMessage.includes('❌') || botStatusMessage.includes('⚠️') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  {botStatusMessage}
                </div>
              )}

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID Pedido</th>
                      <th>Fecha Carga</th>
                      <th>Solicitante</th>
                      <th>Tipo de Pedido</th>
                      <th>Aprobación</th>
                      <th>Estado Jira</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#a0aec0', padding: '30px' }}>
                          No se encontraron tickets con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map(ticket => (
                        <tr key={ticket['ID PEDIDO'] + '-' + ticket['ESTADO APROBACION'] + '-' + Math.random()} onClick={() => openTicketDetails(ticket)}>
                          <td style={{ color: '#818cf8', fontWeight: '600' }}>{ticket['ID PEDIDO'] || '-'}</td>
                          <td>{ticket['FECHA CARGA AL SISTEMA'] || '-'}</td>
                          <td>{ticket['NOMBRE Y APELLIDO SOLICITANTE'] || '-'}</td>
                          <td>{ticket['TIPO DE PEDIDO'] || '-'}</td>
                          <td>
                            <span className={`badge-status ${ticket['ESTADO APROBACION'] === 'APROBADO' ? 'badge-approved-status' : 'badge-pending-status'}`}>
                              {ticket['ESTADO APROBACION'] || 'PENDIENTE A APROBAR'}
                            </span>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(ticket['ESTADO DEL RECLAMO'])}>
                              {ticket['ESTADO DEL RECLAMO'] || '-'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      ) : (
        /* Render User Management View */
        <div className="user-management-grid">
          {/* Card 1: Add/Edit User Form */}
          <div className="user-form-card">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px', color: 'var(--text-main)' }}>
              {editingUsername ? '📝 Editar Usuario' : '➕ Crear Usuario'}
            </h3>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {userError && <div className="error-card" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #ef4444' }}>{userError}</div>}
              {userSuccess && <div className="success-card" style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #10b981' }}>{userSuccess}</div>}

              <div className="form-group">
                <label style={{ display: 'block', color: '#cbd5e0', fontWeight: '500', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase' }}>Nombre de Usuario</label>
                <input 
                  type="text" 
                  value={usernameForm} 
                  onChange={(e) => setUsernameForm(e.target.value)} 
                  required 
                  placeholder="ej: pedro.lopez"
                  disabled={!!editingUsername}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(15, 20, 30, 0.6)', color: '#e2e8f0', opacity: editingUsername ? 0.6 : 1 }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', color: '#cbd5e0', fontWeight: '500', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase' }}>Contraseña</label>
                <input 
                  type="text" 
                  value={passwordForm} 
                  onChange={(e) => setPasswordForm(e.target.value)} 
                  required 
                  placeholder="Contraseña del usuario"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(15, 20, 30, 0.6)', color: '#e2e8f0' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', color: '#cbd5e0', fontWeight: '500', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase' }}>Rol / Permiso</label>
                <select 
                  value={roleForm} 
                  onChange={(e) => setRoleForm(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(15, 20, 30, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                >
                  <option value="usuario">👤 Usuario (Carga de reclamos)</option>
                  <option value="admin">🔑 Admin (Administrador del dashboard)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="login-btn" style={{ margin: 0, padding: '10px 20px', fontSize: '13px', width: 'auto' }}>
                  {editingUsername ? 'Actualizar' : 'Crear'}
                </button>
                {editingUsername && (
                  <button type="button" onClick={handleCancelEdit} className="logout-btn" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', margin: 0 }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Card 2: User List */}
          <div className="user-list-card">
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px', color: 'var(--text-main)' }}>👥 Listado de Usuarios</h3>
            <div className="table-responsive">
              <table className="admin-table" style={{ cursor: 'default' }}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Contraseña</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(userList).map((uname) => (
                    <tr key={uname}>
                      <td style={{ fontWeight: '600' }}>
                        {uname} {uname === currentUser && <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Tú</span>}
                      </td>
                      <td>
                        <span className={`badge-status ${userList[uname].role === 'admin' ? 'badge-approved-status' : 'badge-in-progress-status'}`}>
                          {userList[uname].role}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{userList[uname].password}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            type="button" 
                            className="user-action-btn edit" 
                            onClick={() => handleEditUser(uname)}
                            title="Editar usuario"
                          >
                            ✏️
                          </button>
                          <button 
                            type="button" 
                            className="user-action-btn delete" 
                            onClick={() => handleDeleteUser(uname)}
                            disabled={uname === currentUser}
                            title={uname === currentUser ? "No puedes eliminarte a ti mismo" : "Eliminar usuario"}
                            style={{ opacity: uname === currentUser ? 0.4 : 1, cursor: uname === currentUser ? 'not-allowed' : 'pointer' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal Pop-Up */}
      <div className={`modal-overlay ${showModal ? 'show' : ''}`} onClick={(e) => e.target.className.includes('modal-overlay') && closeModal()}>
        {selectedTicket && (
          <div className="modal-container">
            <div className="modal-header">
              <h3>Pedido: {selectedTicket['ID PEDIDO'] || '-'}</h3>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-label">Estado de Aprobación</div>
                  <div className="detail-val">
                    <span className={`badge-status ${selectedTicket['ESTADO APROBACION'] === 'APROBADO' ? 'badge-approved-status' : 'badge-pending-status'}`}>
                      {selectedTicket['ESTADO APROBACION'] || 'PENDIENTE A APROBAR'}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Estado de Reclamo (Jira)</div>
                  <div className="detail-val">
                    <span className={getStatusBadgeClass(selectedTicket['ESTADO DEL RECLAMO'])}>
                      {selectedTicket['ESTADO DEL RECLAMO'] || '-'}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Área</div>
                  <div className="detail-val">{selectedTicket['AREA'] || '-'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Tipo Dependencia</div>
                  <div className="detail-val">{selectedTicket['TIPO DE DEPENDENCIA'] || '-'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Institución</div>
                  <div className="detail-val">{selectedTicket['INSTITUCIÓN'] || '-'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Vía de Ingreso</div>
                  <div className="detail-val">{selectedTicket['VÍA DE INGRESO'] || '-'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Fecha de Carga</div>
                  <div className="detail-val">{selectedTicket['FECHA CARGA AL SISTEMA'] || '-'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Fecha de Resolución</div>
                  <div className="detail-val">{selectedTicket['FECHA RESOLUCIÓN'] || '-'}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Días Sin Respuesta</div>
                  <div className="detail-val">
                    {selectedTicket['DÍAS SIN RESPUESTA'] !== undefined && selectedTicket['DÍAS SIN RESPUESTA'] !== '' ? selectedTicket['DÍAS SIN RESPUESTA'] : '-'}
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-label">Solicitante</div>
                  <div className="detail-val">
                    {selectedTicket['NOMBRE Y APELLIDO SOLICITANTE'] || '-'} ({selectedTicket['CARGO SOLICITANTE'] || '-'})
                  </div>
                </div>

                <div className="detail-item full-width">
                  <div className="detail-label">Dirección</div>
                  <div className="detail-val">{selectedTicket['DIRECCIÓN'] || '-'}</div>
                </div>

                <div className="detail-item full-width">
                  <div className="detail-label">Tipo de Pedido</div>
                  <div className="detail-val" style={{ fontWeight: '600' }}>{selectedTicket['TIPO DE PEDIDO'] || '-'}</div>
                </div>

                <div className="detail-item full-width">
                  <div className="detail-label">Detalle de Solicitud</div>
                  <div className="detail-val" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {selectedTicket['DETALLE'] || 'Sin detalle de solicitud.'}
                  </div>
                </div>

                <div className="detail-item full-width">
                  <div className="detail-label">Acciones / Historial</div>
                  <pre className="actions-log">
                    {selectedTicket['ACCIONES'] || 'Sin acciones registradas.'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
