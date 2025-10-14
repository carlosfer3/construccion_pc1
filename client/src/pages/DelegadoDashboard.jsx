import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { useAuth } from '../ctx/AuthContext'
import { api } from '../api'

export default function DelegadoDashboard(){
  const { user, logout } = useAuth()
  const [grupo, setGrupo] = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [practicas, setPracticas] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true)
      try{
        const [grupoData, solData, pracData] = await Promise.all([
          api.get(`/api/grupos/delegado/${encodeURIComponent(user.idUsuario)}`),
          api.get(`/api/solicitudes?delegado=${encodeURIComponent(user.idUsuario)}&limit=25`),
          api.get(`/api/practicas/grupo/${encodeURIComponent(user.idUsuario)}`),
        ])
        if (!alive) return
        setGrupo(grupoData || null)
        setSolicitudes(Array.isArray(solData) ? solData : [])
        setPracticas(Array.isArray(pracData) ? pracData : [])
      } catch {
        if (!alive) return
        setGrupo(null)
        setSolicitudes([])
        setPracticas([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario])

  const stats = useMemo(() => ({
    solicitudes: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
    practicas: practicas.length,
  }), [solicitudes, practicas])

  function handleLogout(){
    logout()
    window.location.href = '/login'
  }

  return (
    <DashboardLayout
      title="Panel de Delegado"
      subtitle="Consulta el estado de tu grupo, prácticas y solicitudes."
      user={user}
      onLogout={handleLogout}
      accent="emerald"
      nav={[
        { to: '/delegado', label: 'Resumen', end: true },
        { to: '/delegado/solicitudes', label: 'Solicitudes' },
        { to: '/delegado/grupo', label: 'Mi grupo' },
        { to: '/delegado/prestamos', label: 'Préstamos' },
      ]}
    >
      <div className="dash-grid">
        <section className="dash-grid cols-3">
          <article className="dash-card dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-icon">📦</div>
              <div className="dash-stat-content">
                <span className="dash-card-muted">Solicitudes totales</span>
                <strong>{stats.solicitudes}</strong>
              </div>
            </div>
          </article>
          <article className="dash-card dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-icon">🕑</div>
              <div className="dash-stat-content">
                <span className="dash-card-muted">Pendientes</span>
                <strong>{stats.pendientes}</strong>
              </div>
            </div>
          </article>
          <article className="dash-card dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-icon">🧪</div>
              <div className="dash-stat-content">
                <span className="dash-card-muted">Prácticas asignadas</span>
                <strong>{stats.practicas}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Mi grupo</h2>
            {grupo ? (
              <span className="dash-tag">ID {grupo.idGrupo}</span>
            ) : null}
          </div>
          {loading ? (
            <div className="dash-empty">Cargando información del grupo…</div>
          ) : !grupo ? (
            <div className="dash-empty">
              No se encontró información del grupo asignado.
            </div>
          ) : (
            <div className="dash-mini-grid">
              <div className="dash-mini-card">
                <span className="dash-card-muted">Práctica actual</span>
                <strong>{grupo.practica || 'Sin asignar'}</strong>
              </div>
              <div className="dash-mini-card">
                <span className="dash-card-muted">Integrantes</span>
                <strong>{grupo.cantidad_integrantes ?? 0}</strong>
              </div>
              <div className="dash-mini-card">
                <span className="dash-card-muted">Delegado</span>
                <strong>{user?.nombres} {user?.apellidos}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Acciones rápidas</h2>
          </div>
          <div className="dash-actions">
            <Link to="/delegado/nueva-solicitud" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">📝</span>
              <strong>Nueva solicitud</strong>
              <span>Solicita materiales al laboratorio para tu práctica.</span>
            </Link>
            <Link to="/delegado/prestamos" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">📦</span>
              <strong>Préstamos</strong>
              <span>Revisa los préstamos de insumos en curso.</span>
            </Link>
            <Link to="/delegado/reportes" className="dash-action">
              <span className="dash-stat-icon" aria-hidden="true">⚠️</span>
              <strong>Reportar daño</strong>
              <span>Registra incidencias con materiales o equipos.</span>
            </Link>
          </div>
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Solicitudes recientes</h2>
            <Link to="/delegado/solicitudes" className="dash-table-actions">Ver todas</Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando solicitudes…</div>
          ) : solicitudes.length === 0 ? (
            <div className="dash-empty">Aún no registras solicitudes.</div>
          ) : (
            <div className="dash-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.slice(0, 6).map((sol) => (
                    <tr key={sol.idSolicitud}>
                      <td>{sol.idSolicitud}</td>
                      <td>{sol.fecha ? new Date(sol.fecha).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`dash-badge ${badgeByEstado(sol.estado)}`}>
                          {sol.estado}
                        </span>
                      </td>
                      <td>{sol.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Prácticas</h2>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando prácticas…</div>
          ) : practicas.length === 0 ? (
            <div className="dash-empty">Tu grupo no tiene prácticas próximas.</div>
          ) : (
            <div className="dash-list">
              {practicas.map((prac) => (
                <div key={prac.idPractica} className="dash-list-item">
                  <div>
                    <strong>{prac.descripcion || prac.nombre || `Práctica ${prac.idPractica}`}</strong>
                    <span className="dash-card-muted">
                      {prac.curso_nombre || `Curso ${prac.idCurso || ''}`}
                    </span>
                  </div>
                  <div className="dash-chip">
                    <strong>Fecha</strong>
                    <span>
                      {prac.fecha_inicio
                        ? new Date(prac.fecha_inicio).toLocaleDateString()
                        : prac.fecha
                          ? new Date(prac.fecha).toLocaleDateString()
                          : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

function badgeByEstado(estado){
  switch(estado){
    case 'PENDIENTE':
      return 'warning'
    case 'APROBADA':
      return 'success'
    case 'ENTREGADA':
      return 'info'
    case 'RECHAZADA':
      return 'danger'
    default:
      return 'neutral'
  }
}
