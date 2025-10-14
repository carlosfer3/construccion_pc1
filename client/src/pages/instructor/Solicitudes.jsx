import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'
import { badgeClassByEstado } from './utils'

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'PREPARADA', label: 'Preparadas' },
  { value: 'ENTREGADA', label: 'Entregadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
  { value: 'CERRADA', label: 'Cerradas' },
]

export default function InstructorSolicitudes(){
  const { user } = useAuth()
  const { idSolicitud: idSolicitudParam } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState('')
  const [solicitudes, setSolicitudes] = useState([]) // Solicitudes filtradas para la tabla
  const [todasSolicitudes, setTodasSolicitudes] = useState([]) // Todas las solicitudes para el resumen
  const [loading, setLoading] = useState(true) // Iniciar como true para mostrar loading inmediatamente
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        // Cargar solicitudes filtradas para la tabla
        const qsFiltradas = new URLSearchParams()
        if (estado) qsFiltradas.set('estado', estado)
        qsFiltradas.set('limit', '50')
        
        // Cargar todas las solicitudes para el resumen (sin filtro de estado)
        const qsCompletas = new URLSearchParams()
        qsCompletas.set('limit', '200') // Límite más alto para estadísticas
        
        const [dataFiltradas, dataCompletas] = await Promise.all([
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/solicitudes?${qsFiltradas.toString()}`),
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/solicitudes?${qsCompletas.toString()}`)
        ])
        
        if (!alive) return
        setSolicitudes(Array.isArray(dataFiltradas) ? dataFiltradas : [])
        setTodasSolicitudes(Array.isArray(dataCompletas) ? dataCompletas : [])
        
        // Solo establecer selectedId si hay un parámetro en la URL
        if (dataFiltradas?.length && idSolicitudParam){
          const existeParam = dataFiltradas.some(sol => sol.idSolicitud === idSolicitudParam)
          if (existeParam) {
            setSelectedId(idSolicitudParam)
          } else {
            // Si el ID del parámetro no existe, limpiar la URL
            navigate('/instructor/solicitudes', { replace: true })
            setSelectedId(null)
          }
        } else {
          // No hay parámetro o no hay datos, limpiar selección
          setSelectedId(null)
          setDetalle(null)
          if (idSolicitudParam) {
            navigate('/instructor/solicitudes', { replace: true })
          }
        }
      } catch (err){
        if (!alive) return
        setError('No fue posible cargar las solicitudes.')
        setSolicitudes([])
        setTodasSolicitudes([])
        setSelectedId(null)
        setDetalle(null)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario, estado, idSolicitudParam, navigate])

  useEffect(() => {
    if (!user || !selectedId) return
    let alive = true
    async function loadDetalle(){
      setDetalleLoading(true)
      try{
        const data = await api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/solicitudes/${encodeURIComponent(selectedId)}`)
        if (!alive) return
        setDetalle(data)
      } catch {
        if (!alive) return
        setDetalle(null)
      } finally {
        if (alive) setDetalleLoading(false)
      }
    }
    loadDetalle()
    return () => { alive = false }
  }, [user?.idUsuario, selectedId])

  const resumen = useMemo(() => {
    // Usar todas las solicitudes para el resumen, no las filtradas
    const dataParaResumen = todasSolicitudes.length > 0 ? todasSolicitudes : solicitudes
    return dataParaResumen.reduce((acc, sol) => {
      const key = sol.estado || 'OTROS'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [todasSolicitudes, solicitudes])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        padding: '24px',
        background: 'transparent'
      }}>
        {/* Panel principal de solicitudes - ahora ocupa todo el ancho */}
        <div style={{ display: 'grid', gap: '24px' }}>
        {/* Header con estadísticas */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Efecto de brillo superior */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)'
          }} />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '24px'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: 800, 
                color: '#f8fafc', 
                margin: '0 0 8px 0',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Mis Solicitudes
              </h2>
              <p style={{ 
                color: '#94a3b8', 
                margin: 0, 
                fontSize: '16px',
                fontWeight: 500
              }}>
                Gestiona y revisa tus solicitudes de insumos
              </p>
            </div>
            
            <Link 
              to="/instructor/solicitudes/nueva" 
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                textDecoration: 'none',
                padding: '14px 24px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.3s ease',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)'
              }}
            >
              Nueva Solicitud
            </Link>
          </div>
          
          {/* Estadísticas con diseño mejorado */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '16px' 
          }}>
            {ESTADOS.filter(e => e.value).map(({ value, label }) => (
              <div 
                key={value} 
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.target.style.transform = 'translateY(0)'
                }}
                onFocus={(e) => {
                  e.target.style.outline = 'none'
                  e.target.style.boxShadow = 'none'
                }}
                onBlur={(e) => {
                  e.target.style.outline = 'none'
                  e.target.style.boxShadow = 'none'
                }}
                onClick={() => setEstado(estado === value ? '' : value)}
              >
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 900, 
                  color: '#60a5fa',
                  marginBottom: '4px',
                  textShadow: '0 0 10px rgba(96, 165, 250, 0.3)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  pointerEvents: 'none'
                }}>
                  {resumen[value] || 0}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#94a3b8', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  pointerEvents: 'none'
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla de solicitudes mejorada */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.9) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '24px 32px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                color: '#f8fafc', 
                margin: '0 0 4px 0' 
              }}>
                Lista de Solicitudes
              </h3>
              <p style={{ 
                color: '#64748b', 
                margin: 0, 
                fontSize: '14px' 
              }}>
                {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} {estado ? `en estado ${estado.toLowerCase()}` : 'en total'}
              </p>
            </div>
            
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {ESTADOS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {error ? (
            <div style={{ 
              padding: '60px 32px', 
              textAlign: 'center', 
              color: '#f87171',
              fontSize: '16px'
            }}>
              {error}
            </div>
          ) : loading ? (
            <div style={{ 
              padding: '60px 32px', 
              textAlign: 'center', 
              color: '#94a3b8',
              fontSize: '16px'
            }}>
              ⏳ Cargando solicitudes…
            </div>
          ) : solicitudes.length === 0 ? (
            <div style={{ 
              padding: '60px 32px', 
              textAlign: 'center', 
              color: '#64748b',
              fontSize: '16px'
            }}>
              📝 No hay solicitudes en este estado
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Curso</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Práctica</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grupo</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map(sol => (
                    <tr
                      key={sol.idSolicitud}
                      onClick={() => {
                        setSelectedId(sol.idSolicitud)
                        // No navegamos, solo establecemos el ID seleccionado
                      }}
                      style={{ 
                        cursor: 'pointer', 
                        background: sol.idSolicitud === selectedId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (sol.idSolicitud !== selectedId) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (sol.idSolicitud !== selectedId) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <td style={{ padding: '16px 24px', color: '#60a5fa', fontWeight: 600, fontSize: '14px' }}>#{sol.idSolicitud}</td>
                      <td style={{ padding: '16px 24px', color: '#e2e8f0', fontSize: '14px' }}>{sol.fecha ? new Date(sol.fecha).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '16px 24px', color: '#e2e8f0', fontSize: '14px' }}>{sol.curso_nombre || sol.idCurso || '—'}</td>
                      <td style={{ padding: '16px 24px', color: '#e2e8f0', fontSize: '14px' }}>{sol.practica_descripcion || '—'}</td>
                      <td style={{ padding: '16px 24px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>{sol.idGrupo}</td>
                      <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '14px' }}>{sol.total_items ?? 0}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{
                          background: sol.estado === 'PENDIENTE' ? 'rgba(251, 191, 36, 0.1)' :
                                     sol.estado === 'APROBADA' ? 'rgba(34, 197, 94, 0.1)' :
                                     sol.estado === 'PREPARADA' ? 'rgba(59, 130, 246, 0.1)' :
                                     sol.estado === 'ENTREGADA' ? 'rgba(16, 185, 129, 0.1)' :
                                     sol.estado === 'RECHAZADA' ? 'rgba(239, 68, 68, 0.1)' :
                                     'rgba(156, 163, 175, 0.1)',
                          color: sol.estado === 'PENDIENTE' ? '#fbbf24' :
                                sol.estado === 'APROBADA' ? '#22c55e' :
                                sol.estado === 'PREPARADA' ? '#3b82f6' :
                                sol.estado === 'ENTREGADA' ? '#10b981' :
                                sol.estado === 'RECHAZADA' ? '#ef4444' :
                                '#9ca3af',
                          border: `1px solid ${
                            sol.estado === 'PENDIENTE' ? 'rgba(251, 191, 36, 0.2)' :
                            sol.estado === 'APROBADA' ? 'rgba(34, 197, 94, 0.2)' :
                            sol.estado === 'PREPARADA' ? 'rgba(59, 130, 246, 0.2)' :
                            sol.estado === 'ENTREGADA' ? 'rgba(16, 185, 129, 0.2)' :
                            sol.estado === 'RECHAZADA' ? 'rgba(239, 68, 68, 0.2)' :
                            'rgba(156, 163, 175, 0.2)'
                          }`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {sol.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>

      {/* Modal/Ventana de detalle */}
      {selectedId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header del modal */}
            <div style={{ 
              padding: '24px 24px 20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(59, 130, 246, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #3b82f6, #60a5fa)',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
                }} />
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: '#f8fafc', 
                  margin: 0
                }}>
                  Detalle de Solicitud #{selectedId}
                </h3>
              </div>
              
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                ✕ Cerrar
              </button>
            </div>
            
            {/* Contenido del modal con scroll */}
            <div style={{ 
              padding: '24px',
              maxHeight: 'calc(80vh - 80px)',
              overflowY: 'auto'
            }}>
              {detalleLoading ? (
                <div style={{ 
                  padding: '40px 24px', 
                  textAlign: 'center', 
                  color: '#94a3b8',
                  fontSize: '15px'
                }}>
                  ⏳ Cargando detalle…
                </div>
              ) : !detalle ? (
                <div style={{ 
                  padding: '40px 24px', 
                  textAlign: 'center', 
                  color: '#f87171',
                  fontSize: '15px'
                }}>
                  ❌ Error al cargar el detalle
                </div>
              ) : (
                <div>
                  {/* Información general */}
                  <div style={{ 
                    display: 'grid', 
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    {[
                      { label: 'Curso', value: detalle.solicitud.curso_nombre || detalle.solicitud.idCurso || '—', icon: '📚' },
                      { label: 'Práctica', value: detalle.solicitud.practica_descripcion || '—', icon: '🔬' },
                      { label: 'Estado', value: detalle.solicitud.estado, icon: '📊', isStatus: true },
                      { label: 'Fecha', value: detalle.solicitud.fecha ? new Date(detalle.solicitud.fecha).toLocaleDateString() : '—', icon: '📅' },
                      { label: 'Grupo', value: detalle.solicitud.idGrupo, icon: '👥' }
                    ].map((item, index) => (
                      <div 
                        key={index}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '16px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontSize: '16px' }}>{item.icon}</span>
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#94a3b8', 
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {item.label}
                          </span>
                        </div>
                        
                        {item.isStatus ? (
                          <span style={{
                            background: item.value === 'PENDIENTE' ? 'rgba(251, 191, 36, 0.1)' :
                                       item.value === 'APROBADA' ? 'rgba(34, 197, 94, 0.1)' :
                                       item.value === 'PREPARADA' ? 'rgba(59, 130, 246, 0.1)' :
                                       item.value === 'ENTREGADA' ? 'rgba(16, 185, 129, 0.1)' :
                                       item.value === 'RECHAZADA' ? 'rgba(239, 68, 68, 0.1)' :
                                       'rgba(156, 163, 175, 0.1)',
                            color: item.value === 'PENDIENTE' ? '#fbbf24' :
                                  item.value === 'APROBADA' ? '#22c55e' :
                                  item.value === 'PREPARADA' ? '#3b82f6' :
                                  item.value === 'ENTREGADA' ? '#10b981' :
                                  item.value === 'RECHAZADA' ? '#ef4444' :
                                  '#9ca3af',
                            border: `1px solid ${
                              item.value === 'PENDIENTE' ? 'rgba(251, 191, 36, 0.2)' :
                              item.value === 'APROBADA' ? 'rgba(34, 197, 94, 0.2)' :
                              item.value === 'PREPARADA' ? 'rgba(59, 130, 246, 0.2)' :
                              item.value === 'ENTREGADA' ? 'rgba(16, 185, 129, 0.2)' :
                              item.value === 'RECHAZADA' ? 'rgba(239, 68, 68, 0.2)' :
                              'rgba(156, 163, 175, 0.2)'
                            }`,
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'inline-block'
                          }}>
                            {item.value}
                          </span>
                        ) : (
                          <div style={{ 
                            color: '#e2e8f0', 
                            fontWeight: 600,
                            fontSize: '15px'
                          }}>
                            {item.value}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Observaciones si existen */}
                  {detalle.solicitud.observaciones && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '16px' }}>💭</span>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#94a3b8', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Observaciones
                        </span>
                      </div>
                      <div style={{ 
                        color: '#cbd5e1', 
                        fontSize: '14px',
                        lineHeight: '1.5',
                        fontStyle: 'italic'
                      }}>
                        "{detalle.solicitud.observaciones}"
                      </div>
                    </div>
                  )}

                  {/* Lista de insumos */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      padding: '16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>📦</span>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#f8fafc', 
                        fontWeight: 700
                      }}>
                        Insumos Solicitados ({detalle.items?.length || 0})
                      </span>
                    </div>
                    
                    {detalle.items?.length ? (
                      <div>
                        {detalle.items.map((item, index) => (
                          <div 
                            key={item.idInsumo}
                            style={{
                              padding: '12px 16px',
                              borderBottom: index < detalle.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto',
                              gap: '12px',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ 
                                color: '#e2e8f0', 
                                fontWeight: 600,
                                fontSize: '14px',
                                marginBottom: '2px'
                              }}>
                                {item.nombre}
                              </div>
                              <div style={{ 
                                color: '#94a3b8', 
                                fontSize: '12px'
                              }}>
                                ID: {item.idInsumo}
                              </div>
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                color: '#60a5fa', 
                                fontWeight: 700,
                                fontSize: '16px'
                              }}>
                                {item.cantidad_solicitada}
                              </div>
                              <div style={{ 
                                color: '#94a3b8', 
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Solicitado
                              </div>
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ 
                                color: item.cantidad_entregada > 0 ? '#22c55e' : '#64748b', 
                                fontWeight: 700,
                                fontSize: '16px'
                              }}>
                                {item.cantidad_entregada || 0}
                              </div>
                              <div style={{ 
                                color: '#94a3b8', 
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Entregado
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '32px 16px', 
                        textAlign: 'center', 
                        color: '#64748b',
                        fontSize: '14px'
                      }}>
                        Sin insumos registrados
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
