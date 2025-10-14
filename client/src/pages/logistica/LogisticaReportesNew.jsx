import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function LogisticaReportes(){
  const { user } = useAuth()
  const [reportes, setReportes] = useState([])
  const [insumos, setInsumos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({
    tipo: '',
    estado: '',
    search: '',
    fechaInicio: '',
    fechaFin: ''
  })
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // create, detail, resolve
  const [selectedReporte, setSelectedReporte] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'daño',
    idInsumo: '',
    descripcion: '',
    gravedad: 'media',
    observaciones: ''
  })
  const [resolutionData, setResolutionData] = useState({
    accion: '',
    observaciones: '',
    costo: ''
  })

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        const [reportesData, insumosData, usuariosData] = await Promise.all([
          api.get('/api/reportes-danho'),
          api.get('/api/insumos'),
          api.get('/api/usuarios')
        ])
        if (!alive) return
        setReportes(Array.isArray(reportesData) ? reportesData : [])
        setInsumos(Array.isArray(insumosData) ? insumosData : [])
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : [])
      } catch (err){
        if (!alive) return
        setError('No fue posible cargar los reportes.')
        setReportes([])
        setInsumos([])
        setUsuarios([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario])

  const reportesFiltrados = useMemo(() => {
    return reportes.filter(reporte => {
      const matchTipo = !filtros.tipo || reporte.tipo === filtros.tipo
      const matchEstado = !filtros.estado || reporte.estado === filtros.estado
      const matchSearch = !filtros.search || 
        reporte.descripcion?.toLowerCase().includes(filtros.search.toLowerCase()) ||
        reporte.insumo?.toLowerCase().includes(filtros.search.toLowerCase())
      const fechaReporte = new Date(reporte.fechaReporte)
      const matchFechaInicio = !filtros.fechaInicio || fechaReporte >= new Date(filtros.fechaInicio)
      const matchFechaFin = !filtros.fechaFin || fechaReporte <= new Date(filtros.fechaFin)
      
      return matchTipo && matchEstado && matchSearch && matchFechaInicio && matchFechaFin
    })
  }, [reportes, filtros])

  const stats = useMemo(() => {
    const total = reportes.length
    const pendientes = reportes.filter(r => r.estado === 'pendiente').length
    const enProceso = reportes.filter(r => r.estado === 'en_proceso').length
    const resueltos = reportes.filter(r => r.estado === 'resuelto').length
    const criticos = reportes.filter(r => r.gravedad === 'alta').length
    return { total, pendientes, enProceso, resueltos, criticos }
  }, [reportes])

  function getEstadoColor(estado) {
    switch(estado) {
      case 'pendiente': return { color: '#f59e0b', label: 'Pendiente', bg: 'rgba(245, 158, 11, 0.2)' }
      case 'en_proceso': return { color: '#3b82f6', label: 'En Proceso', bg: 'rgba(59, 130, 246, 0.2)' }
      case 'resuelto': return { color: '#10b981', label: 'Resuelto', bg: 'rgba(16, 185, 129, 0.2)' }
      default: return { color: '#94a3b8', label: estado, bg: 'rgba(148, 163, 184, 0.2)' }
    }
  }

  function getGravedadColor(gravedad) {
    switch(gravedad) {
      case 'baja': return { color: '#10b981', label: 'Baja', bg: 'rgba(16, 185, 129, 0.2)' }
      case 'media': return { color: '#f59e0b', label: 'Media', bg: 'rgba(245, 158, 11, 0.2)' }
      case 'alta': return { color: '#ef4444', label: 'Alta', bg: 'rgba(239, 68, 68, 0.2)' }
      default: return { color: '#94a3b8', label: gravedad, bg: 'rgba(148, 163, 184, 0.2)' }
    }
  }

  function getTipoIcon(tipo) {
    switch(tipo) {
      case 'daño': return '💔'
      case 'perdida': return '❌'
      case 'deterioro': return '⚠️'
      case 'robo': return '🚨'
      default: return '📋'
    }
  }

  function openCreateModal() {
    setModalMode('create')
    setSelectedReporte(null)
    setFormData({
      tipo: 'daño',
      idInsumo: '',
      descripcion: '',
      gravedad: 'media',
      observaciones: ''
    })
    setShowModal(true)
  }

  function openDetailModal(reporte) {
    setModalMode('detail')
    setSelectedReporte(reporte)
    setShowModal(true)
  }

  function openResolveModal(reporte) {
    setModalMode('resolve')
    setSelectedReporte(reporte)
    setResolutionData({
      accion: '',
      observaciones: '',
      costo: ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (modalMode === 'create') {
        const payload = {
          ...formData,
          reportadoPor: user?.idUsuario
        }
        const result = await api.post('/api/reportes-danho', payload)
        setReportes(prev => [...prev, result])
      } else if (modalMode === 'resolve') {
        const payload = {
          ...resolutionData,
          resueltoPor: user?.idUsuario,
          estado: 'resuelto'
        }
        await api.patch(`/api/reportes-danho/${selectedReporte.idReporte}/resolver`, payload)
        setReportes(prev => prev.map(r => 
          r.idReporte === selectedReporte.idReporte 
            ? { ...r, estado: 'resuelto', fechaResolucion: new Date().toISOString(), ...payload }
            : r
        ))
      }
      setShowModal(false)
    } catch (err) {
      console.error('Error guardando:', err)
      setError('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  async function cambiarEstado(idReporte, nuevoEstado) {
    try {
      await api.patch(`/reportes-danho/${idReporte}`, { estado: nuevoEstado })
      setReportes(prev => prev.map(r => 
        r.idReporte === idReporte ? { ...r, estado: nuevoEstado } : r
      ))
    } catch (err) {
      console.error('Error cambiando estado:', err)
      setError('Error al cambiar el estado')
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
                  🛠️ Reportes de Daños
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
                  Gestiona incidentes, daños y pérdidas de equipos e insumos del laboratorio.
                </p>
              </div>
              <button
                onClick={openCreateModal}
                style={{
                  background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                + Nuevo Reporte
              </button>
            </div>

            {/* Grid de estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Total Reportes', value: stats.total, icon: '📋', color: '#3b82f6' },
                { label: 'Pendientes', value: stats.pendientes, icon: '⏳', color: '#f59e0b' },
                { label: 'En Proceso', value: stats.enProceso, icon: '🔄', color: '#3b82f6' },
                { label: 'Resueltos', value: stats.resueltos, icon: '✅', color: '#10b981' },
                { label: 'Críticos', value: stats.criticos, icon: '🚨', color: '#ef4444' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                    {stat.label}
                  </div>
                  <div style={{ color: stat.color, fontSize: '24px', fontWeight: '900' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '24px',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  minWidth: '130px'
                }}
              >
                <option value="">Todos los tipos</option>
                <option value="daño">Daño</option>
                <option value="perdida">Pérdida</option>
                <option value="deterioro">Deterioro</option>
                <option value="robo">Robo</option>
              </select>
              
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  minWidth: '140px'
                }}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="resuelto">Resuelto</option>
              </select>
              
              <input
                type="search"
                placeholder="Buscar por descripción o insumo..."
                value={filtros.search}
                onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  flex: '1',
                  minWidth: '200px'
                }}
              />
              
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
                placeholder="Desde"
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px'
                }}
              />
              
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
                placeholder="Hasta"
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Lista de reportes */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <h2 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                Reportes de Incidentes
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
                {reportesFiltrados.length} reporte{reportesFiltrados.length !== 1 ? 's' : ''} encontrado{reportesFiltrados.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px',
                color: '#94a3b8'
              }}>
                Cargando reportes...
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
            ) : reportesFiltrados.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px',
                color: '#94a3b8'
              }}>
                No hay reportes para mostrar
              </div>
            ) : (
              <div style={{ padding: '0' }}>
                {reportesFiltrados.map((reporte, i) => {
                  const estado = getEstadoColor(reporte.estado)
                  const gravedad = getGravedadColor(reporte.gravedad)
                  return (
                    <div
                      key={reporte.idReporte}
                      style={{
                        padding: '24px',
                        borderBottom: i < reportesFiltrados.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ fontSize: '24px' }}>{getTipoIcon(reporte.tipo)}</div>
                            <div>
                              <div style={{ color: '#f8fafc', fontWeight: '700', fontSize: '16px' }}>
                                Reporte #{reporte.idReporte} - {reporte.tipo}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: estado.bg,
                                  color: estado.color,
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}>
                                  {estado.label}
                                </span>
                                <span style={{
                                  display: 'inline-flex',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: gravedad.bg,
                                  color: gravedad.color,
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}>
                                  {gravedad.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Insumo Afectado</div>
                              <div style={{ color: '#f8fafc', fontWeight: '600' }}>
                                {reporte.insumo || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fecha Reporte</div>
                              <div style={{ color: '#f8fafc' }}>
                                {new Date(reporte.fechaReporte).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Reportado por</div>
                              <div style={{ color: '#f8fafc' }}>
                                {reporte.reportadoPor || 'N/A'}
                              </div>
                            </div>
                            {reporte.fechaResolucion && (
                              <div>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fecha Resolución</div>
                                <div style={{ color: '#10b981' }}>
                                  {new Date(reporte.fechaResolucion).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ 
                            background: 'rgba(148, 163, 184, 0.1)', 
                            borderRadius: '8px', 
                            padding: '12px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Descripción</div>
                            <div style={{ color: '#f8fafc', fontSize: '14px', lineHeight: '1.5' }}>
                              {reporte.descripcion}
                            </div>
                          </div>

                          {reporte.observaciones && (
                            <div style={{ 
                              background: 'rgba(148, 163, 184, 0.1)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              marginBottom: '16px'
                            }}>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Observaciones</div>
                              <div style={{ color: '#f8fafc', fontSize: '14px' }}>
                                {reporte.observaciones}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button
                            onClick={() => openDetailModal(reporte)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.2)',
                              color: '#3b82f6',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Ver Detalle
                          </button>
                          
                          {reporte.estado === 'pendiente' && (
                            <button
                              onClick={() => cambiarEstado(reporte.idReporte, 'en_proceso')}
                              style={{
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Tomar Caso
                            </button>
                          )}
                          
                          {reporte.estado !== 'resuelto' && (
                            <button
                              onClick={() => openResolveModal(reporte)}
                              style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(12px)',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                {modalMode === 'create' ? 'Nuevo Reporte de Daño' :
                 modalMode === 'detail' ? 'Detalle del Reporte' :
                 'Resolver Reporte'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {modalMode === 'create' ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Tipo de Incidente
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#f8fafc',
                        fontSize: '14px'
                      }}
                    >
                      <option value="daño">Daño</option>
                      <option value="perdida">Pérdida</option>
                      <option value="deterioro">Deterioro</option>
                      <option value="robo">Robo</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Gravedad
                    </label>
                    <select
                      value={formData.gravedad}
                      onChange={(e) => setFormData(prev => ({ ...prev, gravedad: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#f8fafc',
                        fontSize: '14px'
                      }}
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Insumo Afectado
                  </label>
                  <select
                    value={formData.idInsumo}
                    onChange={(e) => setFormData(prev => ({ ...prev, idInsumo: e.target.value }))}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f8fafc',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Seleccionar insumo</option>
                    {insumos.map(insumo => (
                      <option key={insumo.idInsumo} value={insumo.idInsumo}>
                        {insumo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Descripción del Incidente
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    rows="4"
                    placeholder="Describe detalladamente qué ocurrió..."
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Observaciones Adicionales
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    rows="3"
                    placeholder="Información adicional relevante..."
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            ) : modalMode === 'resolve' ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{
                  background: 'rgba(148, 163, 184, 0.1)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                    Reporte #{selectedReporte?.idReporte}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                    {selectedReporte?.descripcion}
                  </div>
                </div>

                <div>
                  <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Acción Tomada
                  </label>
                  <textarea
                    value={resolutionData.accion}
                    onChange={(e) => setResolutionData(prev => ({ ...prev, accion: e.target.value }))}
                    rows="3"
                    placeholder="Describe qué acciones se tomaron para resolver el problema..."
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Costo de Reparación/Reposición (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={resolutionData.costo}
                    onChange={(e) => setResolutionData(prev => ({ ...prev, costo: e.target.value }))}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f8fafc',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    Observaciones de la Resolución
                  </label>
                  <textarea
                    value={resolutionData.observaciones}
                    onChange={(e) => setResolutionData(prev => ({ ...prev, observaciones: e.target.value }))}
                    rows="3"
                    placeholder="Comentarios adicionales sobre la resolución..."
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ color: '#f8fafc' }}>
                Detalles del reporte #{selectedReporte?.idReporte}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {modalMode === 'detail' ? 'Cerrar' : 'Cancelar'}
              </button>
              {modalMode !== 'detail' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear Reporte' : 'Resolver Reporte'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}