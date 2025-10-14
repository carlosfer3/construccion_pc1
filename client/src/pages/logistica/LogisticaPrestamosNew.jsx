import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function LogisticaPrestamos(){
  const { user } = useAuth()
  const [prestamos, setPrestamos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({
    estado: '',
    usuario: '',
    search: '',
    fecha: ''
  })
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // create, detail, return
  const [selectedPrestamo, setSelectedPrestamo] = useState(null)
  const [selectedSolicitud, setSelectedSolicitud] = useState(null)
  const [insumosSolicitud, setInsumosSolicitud] = useState([])
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [prestamosCreados, setPrestamosCreados] = useState([])
  const [formData, setFormData] = useState({
    idSolicitud: '',
    idUsuario: '',
    insumos: [{ idInsumo: '', cantidad: '', observaciones: '' }],
    fechaLimite: '',
    observaciones: ''
  })

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        const [prestamosData, insumosData, usuariosData, solicitudesData] = await Promise.all([
          api.get('/api/prestamos'),
          api.get('/api/insumos'),
          api.get('/api/usuarios'),
          api.get('/api/solicitudes?estado=Aprobada')
        ])
        if (!alive) return
        setPrestamos(Array.isArray(prestamosData) ? prestamosData : [])
        setInsumos(Array.isArray(insumosData) ? insumosData : [])
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : [])
        setSolicitudes(Array.isArray(solicitudesData) ? solicitudesData : [])
      } catch (err){
        if (!alive) return
        setError('No fue posible cargar los préstamos.')
        setPrestamos([])
        setInsumos([])
        setUsuarios([])
        setSolicitudes([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario])

  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter(prestamo => {
      const matchEstado = !filtros.estado || prestamo.estado === filtros.estado
      const matchUsuario = !filtros.usuario || prestamo.idUsuario === filtros.usuario
      const matchSearch = !filtros.search || 
        prestamo.usuario?.toLowerCase().includes(filtros.search.toLowerCase()) ||
        prestamo.observaciones?.toLowerCase().includes(filtros.search.toLowerCase())
      const matchFecha = !filtros.fecha || 
        new Date(prestamo.fechaPrestamo).toDateString() === new Date(filtros.fecha).toDateString()
      
      return matchEstado && matchUsuario && matchSearch && matchFecha
    })
  }, [prestamos, filtros])

  const stats = useMemo(() => {
    const total = prestamos.length
    const activos = prestamos.filter(p => p.estado === 'activo').length
    const vencidos = prestamos.filter(p => 
      p.estado === 'activo' && new Date(p.fechaLimite) < new Date()
    ).length
    const devueltos = prestamos.filter(p => p.estado === 'devuelto').length
    return { total, activos, vencidos, devueltos }
  }, [prestamos])

  function getEstadoColor(estado, fechaLimite) {
    if (estado === 'devuelto') return { color: '#10b981', label: 'Devuelto', bg: 'rgba(16, 185, 129, 0.2)' }
    if (estado === 'cancelado') return { color: '#6b7280', label: 'Cancelado', bg: 'rgba(107, 114, 128, 0.2)' }
    if (estado === 'activo' && new Date(fechaLimite) < new Date()) {
      return { color: '#ef4444', label: 'Vencido', bg: 'rgba(239, 68, 68, 0.2)' }
    }
    if (estado === 'activo') return { color: '#f59e0b', label: 'Activo', bg: 'rgba(245, 158, 11, 0.2)' }
    return { color: '#94a3b8', label: estado, bg: 'rgba(148, 163, 184, 0.2)' }
  }

  function openCreateModal() {
    setModalMode('create')
    setSelectedPrestamo(null)
    setSelectedSolicitud(null)
    setInsumosSolicitud([])
    setError('')
    setSuccessMessage('')
    setPrestamosCreados([])
    setFormData({
      idSolicitud: '',
      idUsuario: '',
      insumos: [{ idInsumo: '', cantidad: '', observaciones: '' }],
      fechaLimite: '',
      observaciones: ''
    })
    setShowModal(true)
  }

  function openDetailModal(prestamo) {
    setModalMode('detail')
    setSelectedPrestamo(prestamo)
    setShowModal(true)
  }

  function openReturnModal(prestamo) {
    setModalMode('return')
    setSelectedPrestamo(prestamo)
    setShowModal(true)
  }

  function addInsumo() {
    setFormData(prev => ({
      ...prev,
      insumos: [...prev.insumos, { idInsumo: '', cantidad: '', observaciones: '' }]
    }))
  }

  function removeInsumo(index) {
    setFormData(prev => ({
      ...prev,
      insumos: prev.insumos.filter((_, i) => i !== index)
    }))
  }

  function updateInsumo(index, field, value) {
    setFormData(prev => ({
      ...prev,
      insumos: prev.insumos.map((insumo, i) => 
        i === index ? { ...insumo, [field]: value } : insumo
      )
    }))
  }

  async function loadInsumosSolicitud(idSolicitud) {
    if (!idSolicitud) {
      setInsumosSolicitud([])
      return
    }
    try {
      const data = await api.get(`/api/solicitudes/${idSolicitud}/items`)
      setInsumosSolicitud(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando insumos de la solicitud:', err)
      setInsumosSolicitud([])
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccessMessage('')
    setPrestamosCreados([])
    try {
      if (modalMode === 'create') {
        if (!formData.idSolicitud) {
          setError('Debe seleccionar una solicitud aprobada')
          setSaving(false)
          return
        }

        // Enviar la solicitud seleccionada y dejar que el backend cree los préstamos
        const payload = {
          idSolicitud: formData.idSolicitud,
          entregado_por: user?.idUsuario,
          fecha_compromiso: formData.fechaLimite || null
        }
        
        console.log('📤 Enviando payload para crear préstamo:', payload)
        console.log('👤 Usuario actual:', user)
        
        const result = await api.post('/api/prestamos', payload)
        
        console.log('✅ Resultado de crear préstamo:', result)
        
        // Mostrar mensaje de éxito con detalles
        const prestamosNuevos = result.prestamos || (result.prestamo ? [result.prestamo] : [])
        setPrestamosCreados(prestamosNuevos)
        setSuccessMessage(result.mensaje || `Se crearon ${prestamosNuevos.length} préstamo(s) exitosamente`)
        
        // Recargar la lista de préstamos y solicitudes después de crear
        const [prestamosData, solicitudesData] = await Promise.all([
          api.get('/api/prestamos'),
          api.get('/api/solicitudes?estado=Aprobada')
        ])
        setPrestamos(Array.isArray(prestamosData) ? prestamosData : [])
        setSolicitudes(Array.isArray(solicitudesData) ? solicitudesData : [])
        
        // No cerrar el modal inmediatamente, dejar que el usuario vea los detalles
        setFormData({
          idSolicitud: '',
          idUsuario: '',
          insumos: [{ idInsumo: '', cantidad: '', observaciones: '' }],
          fechaLimite: '',
          observaciones: ''
        })
        setSelectedSolicitud(null)
        setInsumosSolicitud([])
      } else if (modalMode === 'return') {
        await api.patch(`/api/prestamos/${selectedPrestamo.idPrestamo}/devolver`, {
          devueltoPor: user?.idUsuario
        })
        setPrestamos(prev => prev.map(p => 
          p.idPrestamo === selectedPrestamo.idPrestamo 
            ? { ...p, estado: 'devuelto', fechaDevolucion: new Date().toISOString() }
            : p
        ))
        setShowModal(false)
      }
    } catch (err) {
      console.error('Error guardando:', err)
      const errorMessage = err.message || err.toString()
      let displayError = 'Error al guardar los cambios'
      
      // Intentar extraer el mensaje de error del texto JSON
      try {
        const jsonMatch = errorMessage.match(/\{.*\}/)
        if (jsonMatch) {
          const errorObj = JSON.parse(jsonMatch[0])
          displayError = errorObj.error || errorObj.detalle || displayError
        } else {
          displayError = errorMessage
        }
      } catch (parseErr) {
        displayError = errorMessage
      }
      
      setError(displayError)
    } finally {
      setSaving(false)
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
                  🏷️ Gestión de Préstamos
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
                  Administra préstamos de insumos a estudiantes e instructores.
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
                + Nuevo Préstamo
              </button>
            </div>

            {/* Grid de estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Total Préstamos', value: stats.total, icon: '📋', color: '#3b82f6' },
                { label: 'Activos', value: stats.activos, icon: '🟡', color: '#f59e0b' },
                { label: 'Vencidos', value: stats.vencidos, icon: '🔴', color: '#ef4444' },
                { label: 'Devueltos', value: stats.devueltos, icon: '✅', color: '#10b981' },
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
                <option value="activo">Activo</option>
                <option value="devuelto">Devuelto</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
              
              <select
                value={filtros.usuario}
                onChange={(e) => setFiltros(prev => ({ ...prev, usuario: e.target.value }))}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  minWidth: '160px'
                }}
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map(usuario => (
                  <option key={usuario.idUsuario} value={usuario.idUsuario}>
                    {usuario.nombre}
                  </option>
                ))}
              </select>
              
              <input
                type="search"
                placeholder="Buscar préstamos..."
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
                value={filtros.fecha}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha: e.target.value }))}
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

          {/* Lista de préstamos */}
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
                Préstamos Registrados
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
                {prestamosFiltrados.length} préstamo{prestamosFiltrados.length !== 1 ? 's' : ''} encontrado{prestamosFiltrados.length !== 1 ? 's' : ''}
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
                Cargando préstamos...
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
            ) : prestamosFiltrados.length === 0 ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px',
                color: '#94a3b8'
              }}>
                No hay préstamos para mostrar
              </div>
            ) : (
              <div style={{ padding: '0' }}>
                {prestamosFiltrados.map((prestamo, i) => {
                  const estado = getEstadoColor(prestamo.estado, prestamo.fechaLimite)
                  return (
                    <div
                      key={prestamo.idPrestamo}
                      style={{
                        padding: '24px',
                        borderBottom: i < prestamosFiltrados.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ color: '#f8fafc', fontWeight: '700', fontSize: '16px' }}>
                              Préstamo #{prestamo.idPrestamo}
                            </div>
                            <span style={{
                              display: 'inline-flex',
                              padding: '4px 12px',
                              borderRadius: '8px',
                              background: estado.bg,
                              color: estado.color,
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {estado.label}
                            </span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Usuario</div>
                              <div style={{ color: '#f8fafc', fontWeight: '600' }}>
                                {prestamo.usuario || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fecha Préstamo</div>
                              <div style={{ color: '#f8fafc' }}>
                                {new Date(prestamo.fechaPrestamo).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fecha Límite</div>
                              <div style={{ color: '#f8fafc' }}>
                                {new Date(prestamo.fechaLimite).toLocaleDateString()}
                              </div>
                            </div>
                            {prestamo.fechaDevolucion && (
                              <div>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fecha Devolución</div>
                                <div style={{ color: '#10b981' }}>
                                  {new Date(prestamo.fechaDevolucion).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>

                          {prestamo.observaciones && (
                            <div style={{ 
                              background: 'rgba(148, 163, 184, 0.1)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              marginBottom: '16px'
                            }}>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Observaciones</div>
                              <div style={{ color: '#f8fafc', fontSize: '14px' }}>
                                {prestamo.observaciones}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openDetailModal(prestamo)}
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
                          {prestamo.estado === 'activo' && (
                            <button
                              onClick={() => openReturnModal(prestamo)}
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
                              Marcar Devuelto
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
            maxWidth: modalMode === 'create' ? '700px' : '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                {modalMode === 'create' ? 'Nuevo Préstamo' :
                 modalMode === 'detail' ? 'Detalle del Préstamo' :
                 'Confirmar Devolución'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setError('')
                }}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Solicitud Aprobada *
                    </label>
                    <select
                      value={formData.idSolicitud}
                      onChange={async (e) => {
                        const solicitud = solicitudes.find(s => s.idSolicitud === e.target.value)
                        setFormData(prev => ({ 
                          ...prev, 
                          idSolicitud: e.target.value,
                          idUsuario: solicitud?.idUsuario_solicitante || ''
                        }))
                        setSelectedSolicitud(solicitud)
                        await loadInsumosSolicitud(e.target.value)
                      }}
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
                      <option value="">Seleccionar solicitud aprobada</option>
                      {solicitudes.map(solicitud => (
                        <option key={solicitud.idSolicitud} value={solicitud.idSolicitud}>
                          {solicitud.idSolicitud} - {solicitud.usuario || solicitud.idUsuario_solicitante} ({solicitud.fecha_solicitud})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Fecha Límite de Devolución
                    </label>
                    <input
                      type="date"
                      value={formData.fechaLimite}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaLimite: e.target.value }))}
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
                </div>

                {selectedSolicitud && insumosSolicitud.length > 0 && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <h4 style={{ color: '#22c55e', fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📦 Detalles de la Solicitud
                    </h4>
                    
                    {/* Información de la solicitud */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>ID Solicitud</div>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>{selectedSolicitud.idSolicitud}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Solicitante</div>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>
                          {selectedSolicitud.usuario || selectedSolicitud.idUsuario_solicitante}
                        </div>
                      </div>
                      {selectedSolicitud.grupo && (
                        <div>
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Grupo</div>
                          <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>{selectedSolicitud.grupo}</div>
                        </div>
                      )}
                      {selectedSolicitud.practica && (
                        <div>
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Práctica</div>
                          <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>{selectedSolicitud.practica}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Fecha</div>
                        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>
                          {selectedSolicitud.fecha_solicitud ? new Date(selectedSolicitud.fecha_solicitud).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Lista de insumos */}
                    <h5 style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      🧪 Insumos a Entregar
                    </h5>
                    <div style={{ 
                      display: 'grid', 
                      gap: '8px',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      marginBottom: '12px'
                    }}>
                      {insumosSolicitud.map((insumo, idx) => {
                        const nombreInsumo = insumo.insumo_nombre || insumo.nombre || insumo.idInsumo
                        const cantidadPendiente = insumo.cantidad_solicitada - (insumo.cantidad_entregada || 0)
                        return (
                          <div key={idx} style={{
                            background: 'rgba(15, 23, 42, 0.5)',
                            border: cantidadPendiente > 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '8px',
                            padding: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                                  {nombreInsumo}
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0' }}>
                                  ID: {insumo.idInsumo}
                                </p>
                              </div>
                              {cantidadPendiente > 0 ? (
                                <span style={{
                                  background: 'rgba(34, 197, 94, 0.3)',
                                  color: '#22c55e',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ✓ Por entregar
                                </span>
                              ) : (
                                <span style={{
                                  background: 'rgba(100, 116, 139, 0.2)',
                                  color: '#94a3b8',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ✓ Completo
                                </span>
                              )}
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '8px',
                              background: 'rgba(15, 23, 42, 0.4)',
                              padding: '8px',
                              borderRadius: '6px'
                            }}>
                              <div>
                                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>Solicitado</div>
                                <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700' }}>{insumo.cantidad_solicitada}</div>
                              </div>
                              <div>
                                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>Entregado</div>
                                <div style={{ color: '#10b981', fontSize: '13px', fontWeight: '700' }}>{insumo.cantidad_entregada || 0}</div>
                              </div>
                              <div>
                                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>Pendiente</div>
                                <div style={{ color: cantidadPendiente > 0 ? '#f59e0b' : '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                                  {cantidadPendiente}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Nota informativa */}
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '20px' }}>💡</span>
                      <p style={{ color: '#f59e0b', fontSize: '12px', margin: 0, fontWeight: '500' }}>
                        Al hacer clic en "Crear Préstamo", se entregarán automáticamente <strong>todos los insumos pendientes</strong> de esta solicitud.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : modalMode === 'detail' ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Contenido del detalle */}
                <div style={{ color: '#f8fafc' }}>
                  Detalles del préstamo #{selectedPrestamo?.idPrestamo}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#f8fafc' }}>
                ¿Está seguro de marcar este préstamo como devuelto?
              </div>
            )}

            {successMessage && prestamosCreados.length > 0 && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}>
                <div style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  ✅ {successMessage}
                </div>
                <div style={{ 
                  display: 'grid', 
                  gap: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {prestamosCreados.map((prestamo, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '6px',
                      padding: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ color: '#f8fafc', fontSize: '13px', fontWeight: '500', margin: '0 0 4px 0' }}>
                            📦 Préstamo #{prestamo.idPrestamo}
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>
                            Insumo: {prestamo.idInsumo} | Cantidad: {prestamo.cantidad}
                          </p>
                        </div>
                        <span style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#22c55e',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          Creado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '16px'
              }}>
                <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>
                  ❌ Error: {error}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowModal(false)
                  setError('')
                  setSuccessMessage('')
                  setPrestamosCreados([])
                }}
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
                {modalMode === 'detail' || successMessage ? 'Cerrar' : 'Cancelar'}
              </button>
              {modalMode !== 'detail' && !successMessage && (
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
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear Préstamo' : 'Confirmar Devolución'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}