import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'APROBADA', label: 'Aprobadas' },
  { value: 'PREPARADA', label: 'Preparadas' },
  { value: 'ENTREGADA', label: 'Entregadas' },
  { value: 'RECHAZADA', label: 'Rechazadas' },
  { value: 'CERRADA', label: 'Cerradas' },
]

function badgeClassByEstado(estado) {
  switch (estado) {
    case 'PENDIENTE': return 'inline-flex px-2 py-1 rounded-full bg-amber-600/20 text-amber-400 text-xs font-medium'
    case 'APROBADA': return 'inline-flex px-2 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium'
    case 'PREPARADA': return 'inline-flex px-2 py-1 rounded-full bg-purple-600/20 text-purple-400 text-xs font-medium'
    case 'ENTREGADA': return 'inline-flex px-2 py-1 rounded-full bg-green-600/20 text-green-400 text-xs font-medium'
    case 'RECHAZADA': return 'inline-flex px-2 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-medium'
    case 'CERRADA': return 'inline-flex px-2 py-1 rounded-full bg-slate-600/20 text-slate-400 text-xs font-medium'
    default: return 'inline-flex px-2 py-1 rounded-full bg-gray-600/20 text-gray-400 text-xs font-medium'
  }
}

// Función auxiliar robusta para validar y formatear datos del solicitante
function getsolicitanteInfo(detalle) {
  const pick = (...vals) => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  // Acepta ambos esquemas: solicitante_* (detalle nuevo) o nombres/apellidos (detalle viejo)
  const nombres   = pick(detalle?.solicitante_nombres, detalle?.nombres);
  const apellidos = pick(detalle?.solicitante_apellidos, detalle?.apellidos);

  const hasValidNames = Boolean(nombres && apellidos);

  return {
    hasValidNames,
    fullName: hasValidNames
      ? `${nombres} ${apellidos}`
      : detalle?.idUsuario_solicitante || 'ID no disponible',
    needsWarning: Boolean(detalle?.idUsuario_solicitante && !hasValidNames),
    email: pick(detalle?.solicitante_correo, detalle?.correo) || null,
    phone: pick(detalle?.solicitante_telefono, detalle?.telefono) || null,
  };
}

export default function LogisticaSolicitudes(){
  const { user } = useAuth()
  const { idSolicitud: idSolicitudParam } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState('')
  const [solicitudes, setSolicitudes] = useState([])
  const [todasSolicitudes, setTodasSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        const qsFiltradas = new URLSearchParams()
        if (estado) qsFiltradas.set('estado', estado)
        qsFiltradas.set('limit', '50')
        
        const qsCompletas = new URLSearchParams()
        qsCompletas.set('limit', '200')
        
        const [dataFiltradas, dataCompletas] = await Promise.all([
          api.get(`/api/solicitudes?${qsFiltradas.toString()}`),
          api.get(`/api/solicitudes?${qsCompletas.toString()}`)
        ])
        
        if (!alive) return
        setSolicitudes(Array.isArray(dataFiltradas) ? dataFiltradas : [])
        setTodasSolicitudes(Array.isArray(dataCompletas) ? dataCompletas : [])
        
        if (dataFiltradas?.length && idSolicitudParam){
          const existeParam = dataFiltradas.some(sol => sol.idSolicitud === idSolicitudParam)
          if (existeParam) {
            setSelectedId(idSolicitudParam)
          } else {
            navigate('/logistica/solicitudes', { replace: true })
            setSelectedId(null)
          }
        } else {
          setSelectedId(null)
          setDetalle(null)
          if (idSolicitudParam) {
            navigate('/logistica/solicitudes', { replace: true })
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
        console.log('🔍 Cargando detalle de solicitud:', selectedId)
        const data = await api.get(`/api/solicitudes/${encodeURIComponent(selectedId)}`)
        console.log('📦 Respuesta del servidor:', data)
        
        // Log específico para los datos del solicitante (acepta ambos esquemas)
        if (data && data.solicitud) {
          console.log('👤 Datos del solicitante recibidos:')
          console.log('- solicitante_nombres:', data.solicitud.solicitante_nombres ?? 'null')
          console.log('- solicitante_apellidos:', data.solicitud.solicitante_apellidos ?? 'null')
          console.log('- nombres (fallback):', data.solicitud.nombres ?? 'null')
          console.log('- apellidos (fallback):', data.solicitud.apellidos ?? 'null')
          console.log('- idUsuario_solicitante:', data.solicitud.idUsuario_solicitante ?? 'null')
        }
        if (!alive) return
        // El backend devuelve { solicitud: {...}, items: [...] }
        // Combinamos ambos en un solo objeto para facilitar el acceso
        if (data && data.solicitud) {
          const detalleCompleto = {
            ...data.solicitud,
            items: data.items || []
          }
          console.log('✅ Detalle procesado:', detalleCompleto)
          console.log('🔍 Datos del solicitante específicos:', {
            idUsuario_solicitante: detalleCompleto.idUsuario_solicitante,
            solicitante_nombres: detalleCompleto.solicitante_nombres,
            solicitante_apellidos: detalleCompleto.solicitante_apellidos,
            tipo_nombres: typeof detalleCompleto.solicitante_nombres,
            tipo_apellidos: typeof detalleCompleto.solicitante_apellidos
          })
          setDetalle(detalleCompleto)
          
          // Probar la función auxiliar para depuración
          const solicitanteInfo = getsolicitanteInfo(detalleCompleto)
          console.log('🧪 Resultado de getsolicitanteInfo:', solicitanteInfo)
        } else {
          // Por si acaso viene en formato antiguo (solo solicitud)
          console.log('⚠️ Formato de respuesta diferente, usando data directamente')
          setDetalle(data)
        }
      } catch (err) {
        console.error('❌ Error cargando detalle:', err)
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
    const dataParaResumen = todasSolicitudes.length > 0 ? todasSolicitudes : solicitudes
    return dataParaResumen.reduce((acc, sol) => {
      const key = sol.estado || 'OTROS'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [todasSolicitudes, solicitudes])

  async function handleUpdateEstado(nuevoEstado, observaciones = '') {
    if (!selectedId) return
    setUpdating(true)
    try {
      const payload = {
        estado: nuevoEstado,
        observaciones,
        usuarioAccion: user?.idUsuario
      }
      
      const result = await api.patch(`/api/solicitudes/${selectedId}`, payload)
      
      // Actualizar la lista local
      setSolicitudes(prev => prev.map(s => 
        s.idSolicitud === selectedId ? { ...s, estado: nuevoEstado } : s
      ))
      setTodasSolicitudes(prev => prev.map(s => 
        s.idSolicitud === selectedId ? { ...s, estado: nuevoEstado } : s
      ))
      
      // Actualizar el detalle
      setDetalle(prev => prev ? { ...prev, estado: nuevoEstado } : null)
      
      alert(`✅ Solicitud actualizada a: ${nuevoEstado}`)
    } catch (err) {
      console.error('Error actualizando estado:', err)
      alert('❌ Error al actualizar el estado de la solicitud')
    } finally {
      setUpdating(false)
    }
  }

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
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.8), transparent)'
          }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', margin: 0, marginBottom: '8px' }}>
                📋 Gestión de Solicitudes
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
                Aprueba, prepara y entrega insumos solicitados para prácticas de laboratorio.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: '500',
                  minWidth: '160px',
                  backdropFilter: 'blur(8px)'
                }}
              >
                {ESTADOS.map(est => (
                  <option key={est.value} value={est.value}>{est.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            {[
              { key: 'PENDIENTE', label: 'Pendientes', icon: '⏳', color: '#f59e0b' },
              { key: 'APROBADA', label: 'Aprobadas', icon: '✅', color: '#3b82f6' },
              { key: 'PREPARADA', label: 'Preparadas', icon: '📦', color: '#8b5cf6' },
              { key: 'ENTREGADA', label: 'Entregadas', icon: '🚀', color: '#10b981' },
              { key: 'RECHAZADA', label: 'Rechazadas', icon: '❌', color: '#ef4444' },
              { key: 'CERRADA', label: 'Cerradas', icon: '✔️', color: '#6b7280' },
            ].map(stat => (
              <div key={stat.key} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                  {stat.label}
                </div>
                <div style={{ color: stat.color, fontSize: '24px', fontWeight: '900' }}>
                  {resumen[stat.key] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Layout principal - Lista y Detalle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr',
          gap: '24px',
          height: 'calc(100vh - 320px)',
          transition: 'grid-template-columns 0.3s ease'
        }}>
          {/* Panel de lista */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <h2 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                Lista de Solicitudes
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
                {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} encontrada{solicitudes.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div style={{ flex: '1', overflow: 'auto', padding: '0' }}>
              {loading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  color: '#94a3b8'
                }}>
                  Cargando solicitudes...
                </div>
              ) : error ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  color: '#ef4444'
                }}>
                  {error}
                </div>
              ) : solicitudes.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  color: '#94a3b8'
                }}>
                  No hay solicitudes para mostrar
                </div>
              ) : (
                <div style={{ padding: '0' }}>
                  {solicitudes.map((sol, i) => (
                    <div
                      key={sol.idSolicitud}
                      onClick={() => {
                        setSelectedId(sol.idSolicitud)
                        navigate(`/logistica/solicitudes/${sol.idSolicitud}`)
                      }}
                      style={{
                        padding: '16px 24px',
                        cursor: 'pointer',
                        borderBottom: i < solicitudes.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                        background: selectedId === sol.idSolicitud ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedId !== sol.idSolicitud) {
                          e.target.style.background = 'rgba(148, 163, 184, 0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedId !== sol.idSolicitud) {
                          e.target.style.background = 'transparent'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ color: '#f8fafc', fontWeight: '700', fontSize: '16px' }}>
                              #{sol.idSolicitud}
                            </span>
                            <span className={badgeClassByEstado(sol.estado)}>
                              {sol.estado}
                            </span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
                            <strong>Solicitante:</strong> {sol.solicitante_nombres && sol.solicitante_apellidos 
                              ? `${sol.solicitante_nombres} ${sol.solicitante_apellidos}`
                              : sol.idUsuario_solicitante}
                          </div>
                          {sol.solicitante_correo && (
                            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>
                              📧 {sol.solicitante_correo}
                            </div>
                          )}
                          {sol.solicitante_telefono && (
                            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>
                              📞 {sol.solicitante_telefono}
                            </div>
                          )}
                          <div style={{ color: '#64748b', fontSize: '12px' }}>
                            📅 {sol.fecha ? new Date(sol.fecha).toLocaleDateString() : '—'}
                          </div>
                          {sol.curso_nombre && (
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                              📚 {sol.curso_nombre}
                            </div>
                          )}
                        </div>
                        <div style={{ color: '#f59e0b', fontSize: '18px' }}>
                          →
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel de detalle */}
          {selectedId && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                  Detalle de Solicitud #{selectedId}
                </h2>
                <button
                  onClick={() => {
                    setSelectedId(null)
                    setDetalle(null)
                    navigate('/logistica/solicitudes')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                {detalleLoading ? (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px',
                    color: '#94a3b8'
                  }}>
                    Cargando detalle...
                  </div>
                ) : detalle ? (
                  <div style={{ display: 'grid', gap: '24px' }}>
                    {/* Panel de advertencia - Solo mostrar si realmente hay un problema */}
                    {(() => {
                      const solicitanteInfo = getsolicitanteInfo(detalle);
                      if (solicitanteInfo.needsWarning) {
                        return (
                          <div style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                              ⚠️ Datos del solicitante incompletos
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                              No se pudieron obtener los nombres completos del usuario {detalle.idUsuario_solicitante}.
                              Esto puede indicar que el usuario fue eliminado o que hay problemas en la base de datos.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Información general */}
                    <div>
                      <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                        Información General
                      </h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Estado:</span>
                          <span className={badgeClassByEstado(detalle.estado)}>
                            {detalle.estado}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Fecha:</span>
                          <span style={{ color: '#f8fafc' }}>
                            {detalle.fecha ? new Date(detalle.fecha).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        {detalle.curso_nombre && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Curso:</span>
                            <span style={{ color: '#f8fafc' }}>{detalle.curso_nombre}</span>
                          </div>
                        )}
                        {detalle.practica_descripcion && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Práctica:</span>
                            <span style={{ color: '#f8fafc' }}>{detalle.practica_descripcion}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información del solicitante */}
                    <div>
                      <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                        Información del Solicitante
                      </h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Nombre:</span>
                          <span style={{ color: '#f8fafc' }}>
                            {(() => {
                              const info = getsolicitanteInfo(detalle);
                              return info.fullName + (!info.hasValidNames ? ' (Datos incompletos)' : '');
                            })()}
                          </span>
                        </div>
                        {(() => {
                          const info = getsolicitanteInfo(detalle);
                          return info.email && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Correo:</span>
                              <span style={{ color: '#f8fafc' }}>{info.email}</span>
                            </div>
                          );
                        })()}
                        {(() => {
                          const info = getsolicitanteInfo(detalle);
                          return info.phone && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Teléfono:</span>
                              <span style={{ color: '#f8fafc' }}>{info.phone}</span>
                            </div>
                          );
                        })()}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>ID Usuario:</span>
                          <span style={{ color: '#64748b', fontSize: '13px', fontFamily: 'monospace' }}>
                            {detalle.idUsuario_solicitante}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Información de auditoría */}
                    {(detalle.aprobada_por || detalle.entregada_por || detalle.observaciones) && (
                      <div>
                        <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                          Historial de Acciones
                        </h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {detalle.aprobada_por && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Aprobada por:</span>
                                <span style={{ color: '#f8fafc' }}>
                                  {detalle.aprobador_nombres && detalle.aprobador_apellidos
                                    ? `${detalle.aprobador_nombres} ${detalle.aprobador_apellidos}`
                                    : detalle.aprobada_por}
                                </span>
                              </div>
                              {detalle.fecha_aprobacion && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#94a3b8' }}>Fecha aprobación:</span>
                                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                                    {new Date(detalle.fecha_aprobacion).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {detalle.entregada_por && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#94a3b8' }}>Entregada por:</span>
                                <span style={{ color: '#f8fafc' }}>
                                  {detalle.entregador_nombres && detalle.entregador_apellidos
                                    ? `${detalle.entregador_nombres} ${detalle.entregador_apellidos}`
                                    : detalle.entregada_por}
                                </span>
                              </div>
                              {detalle.fecha_entrega && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#94a3b8' }}>Fecha entrega:</span>
                                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                                    {new Date(detalle.fecha_entrega).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {detalle.observaciones && (
                            <div style={{ marginTop: '8px' }}>
                              <span style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                                Observaciones:
                              </span>
                              <div style={{
                                background: 'rgba(100, 116, 139, 0.1)',
                                border: '1px solid rgba(100, 116, 139, 0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                color: '#f8fafc',
                                fontSize: '14px'
                              }}>
                                {detalle.observaciones}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Items solicitados */}
                    {detalle.items && detalle.items.length > 0 && (
                      <div>
                        <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                          Insumos Solicitados ({detalle.items.length})
                        </h3>
                        <div style={{ 
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.1)',
                          borderRadius: '12px',
                          overflow: 'hidden'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: 'rgba(100, 116, 139, 0.1)' }}>
                                <th style={{ 
                                  padding: '12px', 
                                  textAlign: 'left', 
                                  color: '#94a3b8', 
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                                }}>
                                  Insumo
                                </th>
                                <th style={{ 
                                  padding: '12px', 
                                  textAlign: 'center', 
                                  color: '#94a3b8', 
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                                }}>
                                  Solicitado
                                </th>
                                <th style={{ 
                                  padding: '12px', 
                                  textAlign: 'center', 
                                  color: '#94a3b8', 
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                                }}>
                                  Entregado
                                </th>
                                <th style={{ 
                                  padding: '12px', 
                                  textAlign: 'center', 
                                  color: '#94a3b8', 
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                                }}>
                                  Tipo
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalle.items.map((item, idx) => (
                                <tr key={item.idInsumo || idx} style={{
                                  borderBottom: idx < detalle.items.length - 1 ? '1px solid rgba(148, 163, 184, 0.05)' : 'none'
                                }}>
                                  <td style={{ padding: '12px', color: '#f8fafc', fontSize: '14px' }}>
                                    {item.nombre}
                                  </td>
                                  <td style={{ 
                                    padding: '12px', 
                                    textAlign: 'center', 
                                    color: '#f8fafc',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                  }}>
                                    {item.cantidad_solicitada || 0}
                                  </td>
                                  <td style={{ 
                                    padding: '12px', 
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                  }}>
                                    <span style={{ 
                                      color: item.cantidad_entregada >= item.cantidad_solicitada ? '#10b981' : '#f59e0b'
                                    }}>
                                      {item.cantidad_entregada || 0}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      background: item.es_prestable ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                      color: item.es_prestable ? '#3b82f6' : '#94a3b8'
                                    }}>
                                      {item.es_prestable ? 'Prestable' : 'Consumible'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Acciones según estado */}
                    <div>
                      <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                        Cambiar Estado
                      </h3>
                      
                      {/* Opciones basadas en el estado actual */}
                      {detalle.estado === 'PENDIENTE' && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleUpdateEstado('APROBADA')}
                            disabled={updating}
                            style={{
                              background: 'linear-gradient(90deg, #10b981, #059669)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 20px',
                              fontWeight: '600',
                              cursor: updating ? 'not-allowed' : 'pointer',
                              opacity: updating ? 0.6 : 1,
                              flex: 1,
                              minWidth: '140px'
                            }}
                          >
                            ✅ Aprobar
                          </button>
                          <button
                            onClick={() => handleUpdateEstado('RECHAZADA')}
                            disabled={updating}
                            style={{
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 20px',
                              fontWeight: '600',
                              cursor: updating ? 'not-allowed' : 'pointer',
                              opacity: updating ? 0.6 : 1,
                              flex: 1,
                              minWidth: '140px'
                            }}
                          >
                            ❌ Rechazar
                          </button>
                        </div>
                      )}

                      {detalle.estado === 'APROBADA' && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleUpdateEstado('PREPARADA')}
                            disabled={updating}
                            style={{
                              background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 20px',
                              fontWeight: '600',
                              cursor: updating ? 'not-allowed' : 'pointer',
                              opacity: updating ? 0.6 : 1,
                              flex: 1,
                              minWidth: '180px'
                            }}
                          >
                            📦 Marcar como Preparada
                          </button>
                          <button
                            onClick={() => handleUpdateEstado('RECHAZADA')}
                            disabled={updating}
                            style={{
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 20px',
                              fontWeight: '600',
                              cursor: updating ? 'not-allowed' : 'pointer',
                              opacity: updating ? 0.6 : 1,
                              flex: 1,
                              minWidth: '140px'
                            }}
                          >
                            ❌ Rechazar
                          </button>
                        </div>
                      )}

                      {detalle.estado === 'PREPARADA' && (
                        <button
                          onClick={() => handleUpdateEstado('ENTREGADA')}
                          disabled={updating}
                          style={{
                            background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 20px',
                            fontWeight: '600',
                            cursor: updating ? 'not-allowed' : 'pointer',
                            opacity: updating ? 0.6 : 1,
                            width: '100%'
                          }}
                        >
                          🚀 Marcar como Entregada
                        </button>
                      )}

                      {detalle.estado === 'ENTREGADA' && (
                        <button
                          onClick={() => handleUpdateEstado('CERRADA')}
                          disabled={updating}
                          style={{
                            background: 'linear-gradient(90deg, #6b7280, #4b5563)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 20px',
                            fontWeight: '600',
                            cursor: updating ? 'not-allowed' : 'pointer',
                            opacity: updating ? 0.6 : 1,
                            width: '100%'
                          }}
                        >
                          ✔️ Cerrar Solicitud
                        </button>
                      )}

                      {(detalle.estado === 'RECHAZADA' || detalle.estado === 'CERRADA') && (
                        <div style={{
                          background: 'rgba(100, 116, 139, 0.1)',
                          border: '1px solid rgba(100, 116, 139, 0.2)',
                          borderRadius: '8px',
                          padding: '16px',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '14px'
                        }}>
                          Esta solicitud está {detalle.estado.toLowerCase()} y no requiere más acciones.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px',
                    color: '#94a3b8'
                  }}>
                    No se pudo cargar el detalle
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}