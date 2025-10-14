import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { useAuth } from '../ctx/AuthContext'
import { api } from '../api'

export default function LogisticaDashboard(){
  const { user, logout } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [inventarioCritico, setInventarioCritico] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [solData, invData, presData] = await Promise.all([
          api.get('/api/solicitudes?estado=PENDIENTE&limit=20'),
          api.get('/api/insumos?lowStock=1&limit=10'),
          api.get('/api/prestamos?estado=ACTIVOS&limit=10'),
        ])
        if (!alive) return
        setSolicitudes(Array.isArray(solData) ? solData : [])
        setInventarioCritico(Array.isArray(invData) ? invData : [])
        setPrestamos(Array.isArray(presData) ? presData : [])
      } catch (err) {
        if (!alive) return
        console.error(err)
        setError('No fue posible obtener el resumen de logística.')
        setSolicitudes([])
        setInventarioCritico([])
        setPrestamos([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const stats = useMemo(() => ({
    pendientes: solicitudes.length,
    criticos: inventarioCritico.length,
    prestamos: prestamos.filter(p => !p.devuelto).length,
  }), [solicitudes, inventarioCritico, prestamos])

  function handleLogout(){
    logout()
    window.location.href = '/login'
  }

  return (
    <DashboardLayout
      title="Panel de Logística"
      subtitle="Supervisa solicitudes, stock crítico y préstamos activos."
      user={user}
      onLogout={handleLogout}
      accent="amber"
      nav={[
        { to: '/logistica', label: 'Resumen', end: true },
        { to: '/logistica/solicitudes', label: 'Solicitudes' },
        { to: '/logistica/inventario', label: 'Inventario' },
        { to: '/logistica/prestamos', label: 'Préstamos' },
        { to: '/logistica/reportes', label: 'Reportes de Daño' },
      ]}
    >
      <div className="dash-grid">
        {error ? (
          <div className="dash-card dash-empty" style={{ color: '#f87171' }}>
            {error}
          </div>
        ) : null}

        <section className="dash-grid cols-3">
          <article className="dash-card dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-icon" aria-hidden="true">�</div>
              <div className="dash-stat-content">
                <span className="dash-card-muted">Solicitudes pendientes</span>
                <strong>{stats.pendientes}</strong>
              </div>
            </div>
          </article>
          <article className="dash-card dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-icon" aria-hidden="true">⚠️</div>
              <div className="dash-stat-content">
                <span className="dash-card-muted">Stock crítico</span>
                <strong>{stats.criticos}</strong>
              </div>
            </div>
          </article>
          <article className="dash-card dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-icon" aria-hidden="true">�</div>
              <div className="dash-stat-content">
                <span className="dash-card-muted">Préstamos activos</span>
                <strong>{stats.prestamos}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Acciones rápidas</h2>
          </div>
          <div className="dash-actions">
            <Link to="/logistica/solicitudes" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">✅</span>
              <strong>Gestionar solicitudes</strong>
              <span>Aprueba, prepara y entrega insumos solicitados.</span>
            </Link>
            <Link to="/logistica/inventario" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">🧪</span>
              <strong>Actualizar inventario</strong>
              <span>Registra ingresos, ajustes de stock y nuevos insumos.</span>
            </Link>
            <Link to="/logistica/prestamos" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">�</span>
              <strong>Control de préstamos</strong>
              <span>Da seguimiento a devoluciones y vencimientos.</span>
            </Link>
            <Link to="/logistica/reportes" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">🔧</span>
              <strong>Reportes de daño</strong>
              <span>Gestiona reportes de daños y reparaciones de equipos.</span>
            </Link>
          </div>
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Solicitudes pendientes</h2>
            <Link to="/logistica/solicitudes" className="dash-table-actions">Ver todas</Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando solicitudes…</div>
          ) : solicitudes.length === 0 ? (
            <div className="dash-empty">No hay Solicitudes pendientes.</div>
          ) : (
            <div className="dash-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Solicitante</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map(sol => (
                    <tr key={sol.idSolicitud}>
                      <td>{sol.idSolicitud}</td>
                      <td>{sol.solicitante || sol.idUsuario_solicitante}</td>
                      <td>{sol.fecha ? new Date(sol.fecha).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className="dash-badge warning">{sol.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Insumos con stock crítico</h2>
            <Link to="/logistica/inventario" className="dash-table-actions">Inventario completo</Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando inventario…</div>
          ) : inventarioCritico.length === 0 ? (
            <div className="dash-empty">No hay insumos con stock crítico.</div>
          ) : (
            <div className="dash-list">
              {inventarioCritico.map(item => (
                <div key={item.idInsumo} className="dash-list-item">
                  <div>
                    <strong>{item.nombre}</strong>
                    <span className="dash-card-muted">
                      Stock actual: {item.stock}
                    </span>
                  </div>
                  <div className="dash-chip">
                    <strong>Tipo</strong>
                    <span>{item.tipoNombre || item.tipo_nombre || item.idTipo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Préstamos activos</h2>
            <Link to="/logistica/prestamos" className="dash-table-actions">Gestionar</Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando préstamos…</div>
          ) : prestamos.length === 0 ? (
            <div className="dash-empty">No hay préstamos activos.</div>
          ) : (
            <div className="dash-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Insumo</th>
                    <th>Cantidad</th>
                    <th>Compromiso</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {prestamos.map(pres => {
                    const vencido = pres.fecha_compromiso && new Date(pres.fecha_compromiso) < new Date() && !pres.devuelto
                    return (
                      <tr key={pres.idprestamo}>
                        <td>{pres.idprestamo}</td>
                        <td>{pres.insumo_nombre || pres.idInsumo}</td>
                        <td>{pres.cantidad}</td>
                        <td>{pres.fecha_compromiso ? new Date(pres.fecha_compromiso).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`dash-badge ${vencido ? 'danger' : pres.devuelto ? 'success' : 'info'}`}>
                            {vencido ? 'Vencido' : (pres.devuelto ? 'Devuelto' : 'Activo')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
