import React, { useState } from 'react';

export default function UserPortal() {
  const [activeCategory, setActiveCategory] = useState(null); // 'limpieza', 'mantenimiento', 'obras'
  const [selectedService, setSelectedService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [view, setView] = useState('selection'); // 'selection' or 'form'
  const [success, setSuccess] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    titulo: '',
    nombre: '',
    secretaria: '',
    aprobador: '',
    cargo: 'Administrativo/a',
    ubicacion: '',
    necesita: ''
  });

  const URL_PLANILLA = "https://script.google.com/macros/s/AKfycbw62Nt75T49M26O4Zuf-f77tB7YH6ZYHykAl-YSdB_mgssHPHYcDjF8roSr425SIorG/exec";

  const toggleCategory = (cat) => {
    setActiveCategory(activeCategory === cat ? null : cat);
  };

  const selectService = (service, category) => {
    setSelectedService(service);
    setSelectedCategory(category);
    setView('form');
    setSuccess(false);
  };

  const handleBack = () => {
    setView('selection');
    setFormData({
      titulo: '',
      nombre: '',
      secretaria: '',
      aprobador: '',
      cargo: 'Administrativo/a',
      ubicacion: '',
      necesita: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSend = {
      titulo: formData.titulo,
      nombre: formData.nombre,
      secretaria: formData.secretaria,
      aprobador: formData.aprobador,
      cargo: formData.cargo,
      ubicacion: formData.ubicacion,
      necesita: formData.necesita,
      servicio: selectedService,
      area: selectedCategory
    };

    fetch(URL_PLANILLA, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(dataToSend)
    })
    .then(() => {
      setSuccess(true);
      setFormData({
        titulo: '',
        nombre: '',
        secretaria: '',
        aprobador: '',
        cargo: 'Administrativo/a',
        ubicacion: '',
        necesita: ''
      });
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch((err) => {
      console.error("Error al enviar reclamo:", err);
    });
  };

  return (
    <div className="container">
      <header>
        <h1>🏛️ Portal de Reclamos Municipales</h1>
        <p>Registra tu solicitud para Servicios Generales o Modernización y Tecnología</p>
      </header>

      {view === 'selection' ? (
        <div className="selection-grid">
          {/* Card 1: Servicios Generales (Direct Options) */}
          <div className="section-card">
            <div className="section-header">
              <span className="icon">🔧</span>
              <h2>Servicios Generales</h2>
            </div>
            <div className="section-content-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '10px' }}>
                Podés generar una solicitud para Servicios Generales con las opciones proporcionadas.
              </p>

              <div className="option" onClick={() => selectService('Limpieza', 'Servicios Generales')}>
                <div className="option-icon">🧹</div>
                <div className="option-text">
                  <h3>Limpieza</h3>
                  <p>Envía una solicitud para que ayudemos a mantener tu espacio limpio y ordenado.</p>
                </div>
              </div>

              <div className="option" onClick={() => selectService('Mantenimiento', 'Servicios Generales')}>
                <div className="option-icon">🔩</div>
                <div className="option-text">
                  <h3>Mantenimiento</h3>
                  <p>Registra un problema de mantenimiento que requiere nuestra atención.</p>
                </div>
              </div>

              <div className="option" onClick={() => selectService('Obras', 'Servicios Generales')}>
                <div className="option-icon">👷</div>
                <div className="option-text">
                  <h3>Obras</h3>
                  <p>Informa si necesitas que ayudemos a realizar reparaciones en el espacio.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Modernización y Tecnología (Expandable Dropdowns) */}
          <div className="section-card">
            <div className="section-header tech">
              <span className="icon" style={{ color: 'var(--color-secondary)', background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>💻</span>
              <h2>Modernización y Tecnología</h2>
            </div>
            <div className="section-content-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '10px' }}>
                Podés generar una solicitud a Sistemas y Tecnología con las opciones proporcionadas.
              </p>

              <div className="expandable-list">
                {/* Cuentas y Permisos */}
                <div className={`expandable ${activeCategory === 'cuentas' ? 'active' : ''}`}>
                  <div className="expandable-header" onClick={() => toggleCategory('cuentas')}>
                    <span>🔐 Cuentas y Permisos Institucionales</span>
                    <span className="chevron">▼</span>
                  </div>
                  <div className="expandable-content">
                    {[
                      'Mi cuenta de SIAT', 'Mi cuenta de Turnera', 'Mi cuenta de ADO',
                      'Mi cuenta de gestión de Trámites', 'Mi cuenta de Registro de Visitas',
                      'Mi cuenta de Mis Reportes', 'Mi cuenta de Intranet',
                      'Mi cuenta de Correo Electrónico Oficial', 'Mi cuenta de GDE',
                      'Mi cuenta de MOCHA', 'Mi cuenta de RAFAM',
                      'Mi cuenta de Jira Service Management', 'Otros sistemas de Mi cuenta'
                    ].map(srv => (
                      <button key={srv} type="button" className="service-btn" onClick={() => selectService(srv, 'Modernización y Tecnología')}>
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soporte de Sistemas */}
                <div className={`expandable ${activeCategory === 'sistemas' ? 'active' : ''}`}>
                  <div className="expandable-header" onClick={() => toggleCategory('sistemas')}>
                    <span>🖥️ Soporte de Sistemas Institucionales</span>
                    <span className="chevron">▼</span>
                  </div>
                  <div className="expandable-content">
                    {[
                      'Soporte con Mis Trámites', 'Soporte de Administración RRHH',
                      'Incidente Web Catastro', 'Soporte para plataforma de Stock',
                      'Soporte con Mi3F', 'Soporte de Tóken ADO', 'Soporte con la Turnera',
                      'Soporte con la Guía de Trámites', 'Soporte con Mis Reportes',
                      'Soporte con Internet', 'Soporte Jira Service Management (Plataforma de Mesa de Ayuda)',
                      'Necesito reportar una caída de plataforma'
                    ].map(srv => (
                      <button key={srv} type="button" className="service-btn" onClick={() => selectService(srv, 'Modernización y Tecnología')}>
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soporte de Equipos */}
                <div className={`expandable ${activeCategory === 'equipos' ? 'active' : ''}`}>
                  <div className="expandable-header" onClick={() => toggleCategory('equipos')}>
                    <span>🔌 Soporte para Computadoras y Equipos</span>
                    <span className="chevron">▼</span>
                  </div>
                  <div className="expandable-content">
                    {[
                      'Soporte para computadora', 'Soporte para periféricos',
                      'Soporte para impresoras', 'Soporte para Teléfono'
                    ].map(srv => (
                      <button key={srv} type="button" className="service-btn" onClick={() => selectService(srv, 'Modernización y Tecnología')}>
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soporte de Infraestructura */}
                <div className={`expandable ${activeCategory === 'infra' ? 'active' : ''}`}>
                  <div className="expandable-header" onClick={() => toggleCategory('infra')}>
                    <span>📡 Soporte para Infraestructura y Redes</span>
                    <span className="chevron">▼</span>
                  </div>
                  <div className="expandable-content">
                    {[
                      'Conectividad a Internet', 'Aperturas de Puertas',
                      'Soporte para infraestructura', 'Cableado', 'Pantallas', 'Tableros'
                    ].map(srv => (
                      <button key={srv} type="button" className="service-btn" onClick={() => selectService(srv, 'Modernización y Tecnología')}>
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soporte de Ingresos y Tesorería */}
                <div className={`expandable ${activeCategory === 'ingresos' ? 'active' : ''}`}>
                  <div className="expandable-header" onClick={() => toggleCategory('ingresos')}>
                    <span>💰 Soporte para Ingresos Públicos y Tesorería</span>
                    <span className="chevron">▼</span>
                  </div>
                  <div className="expandable-content">
                    {[
                      'Necesito soporte con las cuentas de TSG', 'Necesito soporte con Tasas Comerciales',
                      'Necesito soporte con Automotor/Moto', 'Necesito soporte con Nota de Crédito Fiscal',
                      'Necesito soporte con Programa Altos de Podestá', 'Necesito soporte con el Imputador (Tesorería)',
                      'Necesito soporte con Monotasa'
                    ].map(srv => (
                      <button key={srv} type="button" className="service-btn" onClick={() => selectService(srv, 'Modernización y Tecnología')}>
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-card">
          <div className="form-header-bar">
            <button className="back-btn" onClick={handleBack}>
              ←
            </button>
            <div>
              <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '600', textTransform: 'uppercase' }}>
                Reclamo: {selectedService}
              </span>
              <h2>Crear Solicitud</h2>
            </div>
          </div>

          {success && (
            <div className="success-card">
              <span>✅ ¡Solicitud registrada con éxito en el sistema!</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="titulo">Título / Asunto</label>
                <input
                  type="text"
                  id="titulo"
                  placeholder="ej: Luminaria rota en despacho"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="nombre">Nombre y Apellido</label>
                <input
                  type="text"
                  id="nombre"
                  placeholder="Tu nombre completo"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="secretaria">Secretaría / Dirección</label>
                <input
                  type="text"
                  id="secretaria"
                  placeholder="ej: Secretaría de Gobierno"
                  value={formData.secretaria}
                  onChange={(e) => setFormData({ ...formData, secretaria: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cargo">Cargo Laboral</label>
                <select
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                >
                  <option value="Administrativo/a">Administrativo/a</option>
                  <option value="Técnico/a">Técnico/a</option>
                  <option value="Coordinador/a">Coordinador/a</option>
                  <option value="Director/a">Director/a</option>
                  <option value="Secretario/a">Secretario/a</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="aprobador">Aprobador (Jefe Directo)</label>
                <input
                  type="text"
                  id="aprobador"
                  placeholder="Nombre de tu aprobador"
                  value={formData.aprobador}
                  onChange={(e) => setFormData({ ...formData, aprobador: e.target.value })}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="ubicacion">Ubicación del Incidente</label>
                <input
                  type="text"
                  id="ubicacion"
                  placeholder="ej: Alberdi 1234, Planta Alta, Oficina 5"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="necesita">¿Qué necesitas exactamente?</label>
                <textarea
                  id="necesita"
                  rows="4"
                  placeholder="Detalla tu problema aquí de la forma más clara posible..."
                  value={formData.necesita}
                  onChange={(e) => setFormData({ ...formData, necesita: e.target.value })}
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">📨 Enviar Reclamo</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
