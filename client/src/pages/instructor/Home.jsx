import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'
import { badgeClassByEstado } from './utils'

export default function InstructorHome(){
  const { user } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [practicas, setPracticas] = useState([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true)
      try{
        const [solData, pracData, summaryData] = await Promise.all([
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/solicitudes?limit=25`),
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas`),
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/summary`),
        ])
        if (!alive) return
        setSolicitudes(Array.isArray(solData)? solData : [])
        setPracticas(Array.isArray(pracData)? pracData : [])
        setSummary(summaryData || null)
      } catch {
        if (!alive) return
        setSolicitudes([])
        setPracticas([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario])

  const stats = useMemo(() => {
    const total = summary?.solicitudes?.total ?? solicitudes.length
    const pendientes = summary?.solicitudes?.pendientes ?? solicitudes.filter(s => s.estado === 'PENDIENTE').length
    const practicasTotal = summary?.practicas?.total ?? practicas.length
    const proxima = summary?.practicas?.proxima ?? null
    return { total, pendientes, practicas: practicasTotal, proxima }
  }, [solicitudes, practicas, summary])

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Columna principal (ocupa 2/3) */}
      <div className="xl:col-span-2 grid gap-6">
        {/* === Fila de KPIs === */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '📦', label: 'Solicitudes registradas', value: stats.total },
            { icon: '⏳', label: 'Pendientes de aprobación', value: stats.pendientes },
            { icon: '🧪', label: 'Prácticas activas', value: stats.practicas },
          ].map((s, i) => (
            <article key={i} className="dash-card flex items-center gap-4 border-slate-800">
              <div className="text-3xl bg-blue-600/20 rounded-full p-3">{s.icon}</div>
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
                { to: '/instructor/nueva-solicitud', icon: '📝', title: 'Nueva solicitud', desc: 'Registra los materiales necesarios para la práctica.' },
                { to: '/instructor/inventario', icon: '📦', title: 'Ver inventario', desc: 'Consulta disponibilidad y stock por laboratorio.' },
                { to: '/instructor/practicas', icon: '🧬', title: 'Mis prácticas', desc: 'Administra fechas, descripciones y grupos.' },
                { to: '/instructor/reportes', icon: '📊', title: 'Reportes', desc: 'Analiza el avance de solicitudes y prácticas.' },
              ].map((a, i) => (
                <Link
                  key={i}
                  to={a.to}
                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:border-blue-500 hover:bg-slate-900/60 transition flex flex-col gap-1"
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
              <Link to="/instructor/solicitudes" className="text-blue-400 text-sm hover:underline">
                Ver todas
              </Link>
            </div>

            {loading ? (
              <div className="dash-empty">Cargando datos…</div>
            ) : (() => {
              const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE')
              return pendientes.length === 0 ? (
                <div className="dash-empty">No tienes solicitudes pendientes.</div>
              ) : (
                <div className="space-y-3">
                  {/* Contador destacado */}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-yellow-400 mb-1">
                      {pendientes.length}
                    </div>
                    <div className="text-yellow-300 text-sm">
                      {pendientes.length === 1 ? 'Solicitud pendiente' : 'Solicitudes pendientes'}
                    </div>
                  </div>

                  {/* Lista de solicitudes pendientes (máximo 3) */}
                  <div className="space-y-2">
                    {pendientes.slice(0, 3).map(sol => (
                      <div
                        key={sol.idSolicitud}
                        className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 hover:bg-slate-900/60 transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-mono text-sm">#{sol.idSolicitud}</span>
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-lg">
                              PENDIENTE
                            </span>
                          </div>
                          <span className="text-slate-400 text-xs">
                            {sol.fecha ? new Date(sol.fecha).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          <div className="text-slate-200 font-medium mb-1">
                            {sol.practica_descripcion || 'Sin descripción'}
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>
                              📚 {sol.curso_nombre || sol.idCurso || 'Sin curso'}
                            </span>
                            <span>
                              📦 {sol.total_items || 0} items
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Indicador si hay más solicitudes */}
                    {pendientes.length > 3 && (
                      <div className="text-center py-2">
                        <Link 
                          to="/instructor/solicitudes?estado=PENDIENTE" 
                          className="text-blue-400 text-sm hover:underline"
                        >
                          Ver {pendientes.length - 3} solicitud{pendientes.length - 3 !== 1 ? 'es' : ''} más
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </article>
        </section>
      </div>

      {/* Columna lateral: Próximas prácticas (1/3) */}
      <aside className="grid gap-6">
        <section className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">Próximas prácticas</h2>
          </div>

          {stats.proxima ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-4">
              <span className="dash-card-muted block">Próxima actividad</span>
              <strong className="block">
                {stats.proxima.descripcion || stats.proxima.idPractica}
              </strong>
              <span className="dash-card-muted">
                {stats.proxima.curso_nombre || stats.proxima.idCurso} •{' '}
                {stats.proxima.fecha_inicio
                  ? new Date(stats.proxima.fecha_inicio).toLocaleDateString()
                  : 'Sin fecha'}
              </span>
            </div>
          ) : null}

          {loading ? (
            <div className="dash-empty">Cargando datos…</div>
          ) : practicas.length === 0 ? (
            <div className="dash-empty">No registras prácticas activas.</div>
          ) : (
            <div className="space-y-3">
              {practicas
                .slice(0, 5)
                .sort((a, b) => new Date(a.fecha_inicio || a.fecha) - new Date(b.fecha_inicio || b.fecha))
                .map(prac => (
                  <div
                    key={prac.idPractica}
                    className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl p-3"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {prac.descripcion || prac.nombre || `Práctica ${prac.idPractica}`}
                      </strong>
                      <span className="dash-card-muted block truncate">
                        {prac.curso_nombre || `Curso ${prac.idCurso || ''}`}
                      </span>
                    </div>
                    <div className="ml-3 shrink-0 bg-blue-600/20 text-blue-300 text-xs rounded-lg px-3 py-1">
                      {prac.fecha_inicio ? new Date(prac.fecha_inicio).toLocaleDateString() : '—'}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
