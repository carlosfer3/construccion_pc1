import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function DelegadoHome() {
  const { user } = useAuth()
  const [miGrupo, setMiGrupo] = useState(null)
  const [practicas, setPracticas] = useState([])
  const [integrantes, setIntegrantes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        // Obtener el grupo del delegado
        const grupoData = await api.get(`/api/usuarios/${user.idUsuario}/grupo`)
        if (!alive) return
        
        if (grupoData) {
          setMiGrupo(grupoData)
          
          // Cargar práctica e integrantes
          const [practicaData, integrantesData] = await Promise.all([
            api.get(`/api/practicas/${grupoData.idPractica}`),
            api.get(`/api/grupos/${grupoData.idGrupo}/integrantes`)
          ])
          
          if (!alive) return
          setPracticas([practicaData])
          setIntegrantes(Array.isArray(integrantesData) ? integrantesData : [])
        }
      } catch (err) {
        if (!alive) return
        console.error(err)
        setError('No fue posible cargar la información del grupo.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [user.idUsuario])

  const stats = useMemo(() => ({
    integrantes: integrantes.length,
    practicasAsignadas: practicas.length,
    reportesPendientes: 0, // TODO: implementar
  }), [integrantes, practicas])

  return (
    <div className="dash-content">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Panel de Delegado</h1>
          <p className="dash-subtitle">
            Gestiona tu grupo, integrantes y reporta incidencias.
          </p>
        </div>
      </div>

      {error && (
        <div className="dash-card" style={{ color: '#f87171', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Estadísticas */}
      <section className="dash-grid cols-3" style={{ marginBottom: '1.5rem' }}>
        <article className="dash-card dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon">👥</div>
            <div className="dash-stat-content">
              <span className="dash-card-muted">Integrantes</span>
              <strong>{stats.integrantes}</strong>
            </div>
          </div>
        </article>
        <article className="dash-card dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon">📋</div>
            <div className="dash-stat-content">
              <span className="dash-card-muted">Prácticas asignadas</span>
              <strong>{stats.practicasAsignadas}</strong>
            </div>
          </div>
        </article>
        <article className="dash-card dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon">⚠️</div>
            <div className="dash-stat-content">
              <span className="dash-card-muted">Reportes pendientes</span>
              <strong>{stats.reportesPendientes}</strong>
            </div>
          </div>
        </article>
      </section>

      {/* Información del grupo */}
      {miGrupo && (
        <section className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <h2 className="dash-card-title">Mi Grupo: {miGrupo.idGrupo}</h2>
          </div>
          <div className="dash-grid cols-2">
            <div className="dash-field">
              <label>Práctica asignada:</label>
              <span>{miGrupo.practica_descripcion || miGrupo.idPractica}</span>
            </div>
            <div className="dash-field">
              <label>Cantidad de integrantes:</label>
              <span>{miGrupo.cantidad_integrantes}</span>
            </div>
            <div className="dash-field">
              <label>Curso:</label>
              <span>{miGrupo.curso_nombre || 'No especificado'}</span>
            </div>
            <div className="dash-field">
              <label>Fecha de inicio:</label>
              <span>
                {miGrupo.fecha_inicio ? new Date(miGrupo.fecha_inicio).toLocaleDateString() : 'No definida'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Acciones rápidas */}
      <section className="dash-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-card-header">
          <h2 className="dash-card-title">Acciones rápidas</h2>
        </div>
        <div className="dash-actions">
          <Link to="/delegado/integrantes" className="dash-action">
            <span className="dash-stat-icon" aria-hidden="true">👥</span>
            <strong>Gestionar integrantes</strong>
            <span>Añade o remueve integrantes de tu grupo.</span>
          </Link>
          <Link to="/delegado/reportes" className="dash-action">
            <span className="dash-stat-icon" aria-hidden="true">⚠️</span>
            <strong>Reportar daños</strong>
            <span>Reporta daños en equipos o materiales.</span>
          </Link>
          <Link to="/delegado/practicas" className="dash-action">
            <span className="dash-stat-icon" aria-hidden="true">📋</span>
            <strong>Ver prácticas</strong>
            <span>Consulta indicaciones y detalles de prácticas.</span>
          </Link>
        </div>
      </section>

      {/* Lista de integrantes */}
      <section className="dash-card">
        <div className="dash-card-header">
          <h2 className="dash-card-title">Integrantes del grupo</h2>
          <Link to="/delegado/integrantes" className="dash-table-actions">Gestionar</Link>
        </div>
        {loading ? (
          <div className="dash-empty">Cargando integrantes…</div>
        ) : integrantes.length === 0 ? (
          <div className="dash-empty">No hay integrantes registrados en el grupo.</div>
        ) : (
          <div className="dash-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellidos</th>
                  <th>Correo</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {integrantes.map((integrante, index) => (
                  <tr key={index}>
                    <td>{integrante.nombres || integrante.nombre || '—'}</td>
                    <td>{integrante.apellidos || integrante.apellido || '—'}</td>
                    <td>{integrante.correo || '—'}</td>
                    <td>
                      <span className={`dash-badge ${integrante.es_delegado ? 'primary' : 'secondary'}`}>
                        {integrante.es_delegado ? 'Delegado' : 'Integrante'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}