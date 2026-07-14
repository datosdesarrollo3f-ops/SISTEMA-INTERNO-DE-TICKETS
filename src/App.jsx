import { useState, useEffect } from 'react'
import './App.css'

// Cargar fallback de datos locales si no se ha configurado Supabase aún
const localData = window.baseTicketeraData || []
const localLastUpdated = window.baseTicketeraLastUpdated || ''

function App() {
  const [tickets, setTickets] = useState(localData)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAprobacion, setFilterAprobacion] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterDependencia, setFilterDependencia] = useState('TODOS')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(localLastUpdated)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

  const fetchFromSupabase = async () => {
    if (!supabaseUrl || !supabaseKey) return
    setLoading(true)
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/reclamos?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const mappedData = data.map(item => ({
          "ID PEDIDO": item.id_pedido,
          "ESTADO APROBACION": item.estado_aprobacion,
          "AREA": item.area,
          "TIPO DE DEPENDENCIA": item.tipo_dependencia,
          "INSTITUCIÓN": item.institucion,
          "DIRECCIÓN": item.direccion,
          "VÍA DE INGRESO": item.via_ingreso,
          "FECHA CARGA AL SISTEMA": item.fecha_carga,
          "FECHA RESOLUCIÓN": item.fecha_resolucion,
          "DÍAS SIN RESPUESTA": item.dias_sin_respuesta,
          "TIPO DE PEDIDO": item.tipo_pedido,
          "DETALLE": item.detalle,
          "NOMBRE Y APELLIDO SOLICITANTE": item.nombre_solicitante,
          "CARGO SOLICITANTE": item.cargo_solicitante,
          "ACCIONES": item.acciones,
          "ESTADO DEL RECLAMO": item.estado_reclamo
        }))
        // Ordenar alfabéticamente descendiente por ID de Pedido para ver los más nuevos primero
        mappedData.sort((a, b) => b["ID PEDIDO"].localeCompare(a["ID PEDIDO"]))
        setTickets(mappedData)
        setLastUpdated(new Date().toLocaleString('es-AR', { hour12: false }))
      } else {
        console.error("Error en respuesta de Supabase:", response.statusText)
      }
    } catch (error) {
      console.error("Error al conectar con Supabase:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      fetchFromSupabase()
    }
  }, [supabaseUrl, supabaseKey])

  // Métricas
  const totalReclamos = tickets.length
  const aprobadosCount = tickets.filter(t => t["ESTADO APROBACION"] === "APROBADO").length
  const pendientesAprobCount = tickets.filter(t => t["ESTADO APROBACION"]?.includes("PENDIENTE") || t["ESTADO DEL RECLAMO"]?.includes("espera de aprobacion")).length
  const completadosCount = tickets.filter(t => t["ESTADO DEL RECLAMO"] === "COMPLETADO").length

  // Obtener opciones únicas de filtros
  const dependenciasUnicas = ['TODOS', ...new Set(tickets.map(t => t["TIPO DE DEPENDENCIA"]).filter(Boolean))]
  const estadosUnicos = ['TODOS', ...new Set(tickets.map(t => t["ESTADO DEL RECLAMO"]).filter(Boolean))]

  // Filtrado de datos
  const filteredTickets = tickets.filter(t => {
    const matchSearch = 
      t["ID PEDIDO"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t["INSTITUCIÓN"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t["DETALLE"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t["TIPO DE PEDIDO"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t["DIRECCIÓN"]?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchAprobacion = 
      filterAprobacion === 'TODOS' || 
      t["ESTADO APROBACION"] === filterAprobacion

    const matchEstado = 
      filterEstado === 'TODOS' || 
      t["ESTADO DEL RECLAMO"] === filterEstado

    const matchDependencia = 
      filterDependencia === 'TODOS' || 
      t["TIPO DE DEPENDENCIA"] === filterDependencia

    return matchSearch && matchAprobacion && matchEstado && matchDependencia
  })

  // Helper para renderizar los badges de estado
  const getBadgeClass = (value, type) => {
    const val = value?.toUpperCase() || ''
    if (type === 'aprobacion') {
      if (val === 'APROBADO') return 'badge badge-success'
      return 'badge badge-warning'
    } else {
      if (val === 'COMPLETADO') return 'badge badge-success'
      if (val.includes('RELEVAR') || val.includes('RECIBIDO')) return 'badge badge-info'
      if (val.includes('ESPERA')) return 'badge badge-warning'
      return 'badge badge-secondary'
    }
  }

  // Parsear el string de acciones a una lista estructurada
  const parseAcciones = (accionesStr) => {
    if (!accionesStr) return []
    return accionesStr.split('\n').map((line, index) => {
      // Formato esperado: "DD/MM/YYYY AUTOR: ACCION" o similar
      const parts = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+([^:]+):\s*(.*)$/)
      if (parts) {
        return {
          id: index,
          fecha: parts[1],
          autor: parts[2],
          texto: parts[3]
        }
      }
      return {
        id: index,
        fecha: '',
        autor: 'BITÁCORA',
        texto: line
      }
    })
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-info">
          <h1>SISTEMA INTERNO</h1>
          <p className="subtitle">Gestión y Control de Reclamos - Servicios Generales</p>
        </div>
        <div className="header-actions">
          {supabaseUrl && supabaseKey && (
            <button className="refresh-btn" onClick={fetchFromSupabase} disabled={loading}>
              {loading ? '⏳ Actualizando...' : '🔄 Sincronizar Nube'}
            </button>
          )}
          <span className="last-updated">Actualizado: {lastUpdated || 'Sin datos'}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card total">
          <span className="kpi-title">Total Reclamos</span>
          <span className="kpi-value">{totalReclamos}</span>
        </div>
        <div className="kpi-card aprobados">
          <span className="kpi-title">Aprobados</span>
          <span className="kpi-value">{aprobadosCount}</span>
        </div>
        <div className="kpi-card pendientes">
          <span className="kpi-title">Esp. Aprobación</span>
          <span className="kpi-value">{pendientesAprobCount}</span>
        </div>
        <div className="kpi-card completados">
          <span className="kpi-title">Completados</span>
          <span className="kpi-value">{completadosCount}</span>
        </div>
      </section>

      {/* Filters Area */}
      <section className="filters-bar">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Buscar por ID, detalle, dirección, solicitante..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <div className="filter-item">
            <label>Aprobación</label>
            <select value={filterAprobacion} onChange={(e) => setFilterAprobacion(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="APROBADO">Aprobados</option>
              <option value="PENDIENTE A APROBAR">Pendiente Aprobación</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Estado Reclamo</label>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              {estadosUnicos.map(est => (
                <option key={est} value={est}>{est === 'TODOS' ? 'Todos' : est}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Dependencia</label>
            <select value={filterDependencia} onChange={(e) => setFilterDependencia(e.target.value)}>
              {dependenciasUnicas.map(dep => (
                <option key={dep} value={dep}>{dep === 'TODOS' ? 'Todas' : dep}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Content (Table) */}
      <main className="table-wrapper">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Dependencia / Inst.</th>
              <th>Tipo de Pedido</th>
              <th>Dirección</th>
              <th>Aprobación</th>
              <th>Estado Reclamo</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map(ticket => (
              <tr key={ticket["ID PEDIDO"]} onClick={() => setSelectedTicket(ticket)} className="clickable-row">
                <td className="ticket-id">{ticket["ID PEDIDO"]}</td>
                <td>
                  <div className="dep-cell">
                    <span className="dep-tag">{ticket["TIPO DE DEPENDENCIA"]}</span>
                    <span className="inst-name">{ticket["INSTITUCIÓN"]}</span>
                  </div>
                </td>
                <td className="tipo-pedido-cell">{ticket["TIPO DE PEDIDO"] || 'Sin especificar'}</td>
                <td className="dir-cell" title={ticket["DIRECCIÓN"]}>{ticket["DIRECCIÓN"] || '-'}</td>
                <td>
                  <span className={getBadgeClass(ticket["ESTADO APROBACION"], 'aprobacion')}>
                    {ticket["ESTADO APROBACION"]}
                  </span>
                </td>
                <td>
                  <span className={getBadgeClass(ticket["ESTADO DEL RECLAMO"], 'estado')}>
                    {ticket["ESTADO DEL RECLAMO"]}
                  </span>
                </td>
                <td>
                  <button className="view-details-btn">Ver Bitácora</button>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan="7" className="no-data-cell">
                  No se encontraron reclamos con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      {/* Detail Sidebar / Modal */}
      {selectedTicket && (
        <div className="sidebar-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="detail-sidebar" onClick={(e) => e.stopPropagation()}>
            <header className="sidebar-header">
              <h3>Detalle de Solicitud</h3>
              <button className="close-btn" onClick={() => setSelectedTicket(null)}>&times;</button>
            </header>
            
            <div className="sidebar-body">
              <div className="section-card header-card">
                <span className="ticket-id-large">{selectedTicket["ID PEDIDO"]}</span>
                <div className="badge-row">
                  <span className={getBadgeClass(selectedTicket["ESTADO APROBACION"], 'aprobacion')}>
                    {selectedTicket["ESTADO APROBACION"]}
                  </span>
                  <span className={getBadgeClass(selectedTicket["ESTADO DEL RECLAMO"], 'estado')}>
                    {selectedTicket["ESTADO DEL RECLAMO"]}
                  </span>
                </div>
              </div>

              <div className="section-card">
                <h4>Información de la Dependencia</h4>
                <div className="info-grid">
                  <div><strong>Institución:</strong> {selectedTicket["INSTITUCIÓN"]}</div>
                  <div><strong>Dependencia:</strong> {selectedTicket["TIPO DE DEPENDENCIA"]}</div>
                  <div><strong>Dirección:</strong> {selectedTicket["DIRECCIÓN"] || 'No registrada'}</div>
                  <div><strong>Carga al Sistema:</strong> {selectedTicket["FECHA CARGA AL SISTEMA"]}</div>
                  {selectedTicket["FECHA RESOLUCIÓN"] && (
                    <div><strong>Fecha Resolución:</strong> {selectedTicket["FECHA RESOLUCIÓN"]}</div>
                  )}
                  {selectedTicket["DÍAS SIN RESPUESTA"] !== "" && selectedTicket["DÍAS SIN RESPUESTA"] !== null && (
                    <div><strong>Días sin Respuesta:</strong> {selectedTicket["DÍAS SIN RESPUESTA"]} días</div>
                  )}
                </div>
              </div>

              <div className="section-card">
                <h4>Detalle del Pedido</h4>
                <p className="pedido-tipo-label"><strong>Tipo:</strong> {selectedTicket["TIPO DE PEDIDO"] || 'Sin especificar'}</p>
                <div className="pedido-detalle-text">
                  {selectedTicket["DETALLE"] || 'Sin detalles proporcionados en la ticketera.'}
                </div>
                <div className="info-grid" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <div><strong>Solicitante:</strong> {selectedTicket["NOMBRE Y APELLIDO SOLICITANTE"] || '-'}</div>
                  <div><strong>Cargo:</strong> {selectedTicket["CARGO SOLICITANTE"] || '-'}</div>
                </div>
              </div>

              <div className="section-card">
                <h4>Bitácora de Acciones</h4>
                <div className="timeline">
                  {parseAcciones(selectedTicket["ACCIONES"]).map(accion => (
                    <div key={accion.id} className="timeline-item">
                      <div className="timeline-meta">
                        <span className="timeline-date">{accion.fecha}</span>
                        <span className="timeline-author">{accion.autor}</span>
                      </div>
                      <div className="timeline-content">{accion.texto}</div>
                    </div>
                  ))}
                  {(!selectedTicket["ACCIONES"]) && (
                    <p className="no-timeline">No hay acciones registradas.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
