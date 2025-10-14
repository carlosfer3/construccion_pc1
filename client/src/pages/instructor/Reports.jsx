import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'
import { badgeClassByEstado } from './utils'

export default function InstructorReports(){
  const { user } = useAuth()
  const [data, setData] = useState({ porEstado: [], porMes: [], topInsumos: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        const res = await api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/reportes/solicitudes`)
        if (!alive) return
        setData({
          porEstado: Array.isArray(res?.porEstado) ? res.porEstado : [],
          porMes: Array.isArray(res?.porMes) ? res.porMes : [],
          topInsumos: Array.isArray(res?.topInsumos) ? res.topInsumos : [],
        })
      } catch {
        if (!alive) return
        setError('No fue posible cargar los reportes.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario])

  return (
    <div className="dash-grid">
      <section className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Resumen de solicitudes</h2>
            <p className="dash-card-muted">
              Visualiza el comportamiento de tus solicitudes por estado, evolución mensual y materiales más requeridos.
            </p>
          </div>
        </div>
        {error ? (
          <div className="dash-empty">{error}</div>
        ) : loading ? (
          <div className="dash-empty">Cargando reportes…</div>
        ) : (
          <div className="dash-grid cols-3">
            {data.porEstado.map(item => (
              <div key={item.estado} className="dash-mini-card">
                <span className="dash-card-muted">{item.estado}</span>
                <span className={`dash-badge ${badgeClassByEstado(item.estado)}`}>
                  {item.total}
                </span>
              </div>
            ))}
            {data.porEstado.length === 0 ? (
              <div className="dash-empty" style={{ gridColumn:'span 3' }}>
                Sin registros para mostrar.
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="dash-card">
        <div className="dash-card-header">
          <h3 className="dash-card-title">Evolución mensual</h3>
        </div>
        {loading ? (
          <div className="dash-empty">Cargando…</div>
        ) : data.porMes.length === 0 ? (
          <div className="dash-empty">Sin datos acumulados.</div>
        ) : (
          <div className="dash-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Mes</th>
                  <th>Total solicitudes</th>
                </tr>
              </thead>
              <tbody>
                {data.porMes.map(row => (
                  <tr key={row.periodo}>
                    <td>{row.periodo}</td>
                    <td>{row.mes}</td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dash-card">
        <div className="dash-card-header">
          <h3 className="dash-card-title">Insumos más solicitados</h3>
        </div>
        {loading ? (
          <div className="dash-empty">Cargando…</div>
        ) : data.topInsumos.length === 0 ? (
          <div className="dash-empty">No se registran solicitudes de insumos.</div>
        ) : (
          <div className="dash-list">
            {data.topInsumos.map(item => (
              <div key={item.idInsumo} className="dash-list-item">
                <div>
                  <strong>{item.nombre}</strong>
                  <span className="dash-card-muted">{item.idInsumo}</span>
                </div>
                <span className="dash-badge info">{item.cantidad}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
