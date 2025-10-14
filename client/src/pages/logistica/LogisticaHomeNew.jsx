import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function LogisticaHome(){
  const { user } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [inventarioCritico, setInventarioCritico] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [reportes, setReportes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true)
      try{
        const [solData, invData, presData, repData] = await Promise.all([
          api.get('/api/solicitudes?estado=PENDIENTE&limit=20'),
          api.get('/api/insumos?lowStock=1&limit=10'),
          api.get('/api/prestamos?estado=ACTIVOS&limit=10'),
          api.get('/api/reportes-dano?estado=PENDIENTE&limit=10'),
        ])
        if (!alive) return
        setSolicitudes(Array.isArray(solData) ? solData : [])
        setInventarioCritico(Array.isArray(invData) ? invData : [])
        setPrestamos(Array.isArray(presData) ? presData : [])
        setReportes(Array.isArray(repData) ? repData : [])
      } catch {
        if (!alive) return
        setSolicitudes([])
        setInventarioCritico([])
        setPrestamos([])
        setReportes([])
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
  }, [user?.idUsuario])

  const stats = useMemo(() => {
    const pendientes = solicitudes.length
    const criticos = inventarioCritico.length
    const prestamosActivos = prestamos.filter(p => !p.devuelto).length
    const reportesPendientes = reportes.length
    return { pendientes, criticos, prestamosActivos, reportesPendientes }
  }, [solicitudes, inventarioCritico, prestamos, reportes])

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Columna principal (ocupa 2/3) */}
      <div className="xl:col-span-2 grid gap-6">
        {/* === Fila de KPIs === */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '📋', label: 'Solicitudes pendientes', value: stats.pendientes },
            { icon: '⚠️', label: 'Stock crítico', value: stats.criticos },
            { icon: '🔄', label: 'Préstamos activos', value: stats.prestamosActivos },
            { icon: '🔧', label: 'Reportes pendientes', value: stats.reportesPendientes },
          ].map((s, i) => (
            <article key={i} className="dash-card flex items-center gap-4 border-slate-800">
              <div className="text-3xl bg-amber-600/20 rounded-full p-3">{s.icon}</div>
              <div className="min-w-0">
                <span className="dash-card-muted block">{s.label}</span>
                <strong className="text-2xl">{s.value}</strong>
              </div>
            </article>
          ))}
        </section>

        {/* === Acciones rápidas + Últimas solicitudes (dos columnas) === */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Acciones rápidas */}
          <article className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Acciones rápidas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { to: '/logistica/solicitudes', icon: '✅', title: 'Gestionar solicitudes', desc: 'Aprueba, prepara y entrega insumos solicitados.' },
                { to: '/logistica/inventario', icon: '📦', title: 'Actualizar inventario', desc: 'Registra ingresos, ajustes de stock y nuevos insumos.' },
                { to: '/logistica/prestamos', icon: '🔄', title: 'Control de préstamos', desc: 'Da seguimiento a devoluciones y vencimientos.' },
                { to: '/logistica/reportes', icon: '🔧', title: 'Reportes de daño', desc: 'Gestiona reportes de daños y reparaciones de equipos.' },
              ].map((a, i) => (
                <Link
                  key={i}
                  to={a.to}
                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:border-amber-500 hover:bg-slate-900/60 transition flex flex-col gap-1"
                >
                  <span className="text-2xl" aria-hidden="true">{a.icon}</span>
                  <strong>{a.title}</strong>
                  <span className="dash-card-muted">{a.desc}</span>
                </Link>
              ))}
            </div>
          </article>

          {/* Solicitudes pendientes */}
          <article className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Solicitudes pendientes</h2>
              <Link to="/logistica/solicitudes" className="text-amber-400 hover:text-amber-300 text-sm">
                Ver todas →
              </Link>
            </div>
            {loading ? (
              <div className="dash-empty">Cargando solicitudes…</div>
            ) : solicitudes.length === 0 ? (
              <div className="dash-empty">No hay solicitudes pendientes.</div>
            ) : (
              <div className="space-y-3">
                {solicitudes.slice(0, 5).map(sol => (
                  <div key={sol.idSolicitud} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">#{sol.idSolicitud}</div>
                      <div className="dash-card-muted text-sm truncate">
                        {sol.solicitante || sol.idUsuario_solicitante}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 rounded-full bg-amber-600/20 text-amber-400 text-xs font-medium">
                        {sol.estado}
                      </span>
                      <div className="dash-card-muted text-xs mt-1">
                        {sol.fecha ? new Date(sol.fecha).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* === Insumos con stock crítico === */}
        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Insumos con stock crítico</h2>
            <Link to="/logistica/inventario" className="text-amber-400 hover:text-amber-300 text-sm">
              Inventario completo →
            </Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando inventario…</div>
          ) : inventarioCritico.length === 0 ? (
            <div className="dash-empty">No hay insumos con stock crítico.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventarioCritico.map(item => (
                <div key={item.idInsumo} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  <div className="font-medium">{item.nombre}</div>
                  <div className="dash-card-muted text-sm mt-1">
                    Stock actual: <span className="text-red-400 font-medium">{item.stock}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex px-2 py-1 rounded-full bg-slate-700 text-slate-300 text-xs">
                      {item.tipoNombre || item.tipo_nombre || item.idTipo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Columna lateral (ocupa 1/3) */}
      <div className="grid gap-6">
        {/* === Préstamos activos === */}
        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Préstamos activos</h2>
            <Link to="/logistica/prestamos" className="text-amber-400 hover:text-amber-300 text-sm">
              Gestionar →
            </Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando préstamos…</div>
          ) : prestamos.filter(p => !p.devuelto).length === 0 ? (
            <div className="dash-empty">No hay préstamos activos.</div>
          ) : (
            <div className="space-y-3">
              {prestamos.filter(p => !p.devuelto).slice(0, 5).map(pres => {
                const vencido = pres.fecha_compromiso && new Date(pres.fecha_compromiso) < new Date()
                return (
                  <div key={pres.idprestamo} className="py-3 border-b border-slate-800 last:border-b-0">
                    <div className="font-medium text-sm">
                      {pres.insumo_nombre || pres.idInsumo}
                    </div>
                    <div className="dash-card-muted text-xs mt-1">
                      Cantidad: {pres.cantidad}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        vencido ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {vencido ? 'Vencido' : 'Activo'}
                      </span>
                      <div className="dash-card-muted text-xs">
                        {pres.fecha_compromiso ? new Date(pres.fecha_compromiso).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* === Reportes de daño pendientes === */}
        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Reportes de daño</h2>
            <Link to="/logistica/reportes" className="text-amber-400 hover:text-amber-300 text-sm">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div className="dash-empty">Cargando reportes…</div>
          ) : reportes.length === 0 ? (
            <div className="dash-empty">No hay reportes pendientes.</div>
          ) : (
            <div className="space-y-3">
              {reportes.slice(0, 5).map(rep => (
                <div key={rep.idReporte} className="py-3 border-b border-slate-800 last:border-b-0">
                  <div className="font-medium text-sm">
                    {rep.insumo_nombre || rep.idInsumo}
                  </div>
                  <div className="dash-card-muted text-xs mt-1 line-clamp-2">
                    {rep.descripcion}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      rep.gravedad === 'ALTA' ? 'bg-red-600/20 text-red-400' :
                      rep.gravedad === 'MEDIA' ? 'bg-amber-600/20 text-amber-400' :
                      'bg-green-600/20 text-green-400'
                    }`}>
                      {rep.gravedad}
                    </span>
                    <div className="dash-card-muted text-xs">
                      {rep.fechaReporte ? new Date(rep.fechaReporte).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}