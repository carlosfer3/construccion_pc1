import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function LogisticaInventario(){
  const { user } = useAuth()
  const [insumos, setInsumos] = useState([])
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({
    tipo: '',
    search: '',
    stockBajo: false
  })
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // create, edit, adjust
  const [selectedInsumo, setSelectedInsumo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    idTipo: '',
    stock: '',
    capacidad_valor: '',
    capacidad_unidad: '',
    es_prestable: false
  })
  const [adjustData, setAdjustData] = useState({
    cantidad: '',
    tipo: 'entrada', // entrada, salida, ajuste
    observaciones: ''
  })

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        const [insumosData, tiposData] = await Promise.all([
          api.get('/api/insumos'),
          api.get('/api/tipos-insumo')
        ])
        if (!alive) return
        setInsumos(Array.isArray(insumosData) ? insumosData : [])
        setTipos(Array.isArray(tiposData) ? tiposData : [])
      } catch (err){
        if (!alive) return
        setError('No fue posible cargar el inventario.')
        setInsumos([])
        setTipos([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user?.idUsuario])

  const insumosFiltrados = useMemo(() => {
    return insumos.filter(insumo => {
      const matchTipo = !filtros.tipo || insumo.idTipo === filtros.tipo
      const matchSearch = !filtros.search || 
        insumo.nombre?.toLowerCase().includes(filtros.search.toLowerCase())
      const matchStockBajo = !filtros.stockBajo || (insumo.stock <= 5)
      
      return matchTipo && matchSearch && matchStockBajo
    })
  }, [insumos, filtros])

  const stats = useMemo(() => {
    const total = insumos.length
    const stockBajo = insumos.filter(i => i.stock <= 5).length
    const agotados = insumos.filter(i => i.stock === 0).length
    return { total, stockBajo, agotados }
  }, [insumos])

  function getStockStatus(insumo) {
    if (insumo.stock === 0) return { color: '#ef4444', label: 'Agotado', bg: 'bg-red-600/20' }
    if (insumo.stock <= 5) return { color: '#f59e0b', label: 'Bajo', bg: 'bg-amber-600/20' }
    if (insumo.stock <= 10) return { color: '#3b82f6', label: 'Medio', bg: 'bg-blue-600/20' }
    return { color: '#10b981', label: 'Alto', bg: 'bg-green-600/20' }
  }

  function openCreateModal() {
    setModalMode('create')
    setSelectedInsumo(null)
    setFormData({
      nombre: '',
      idTipo: '',
      stock: '',
      capacidad_valor: '',
      capacidad_unidad: '',
      es_prestable: false
    })
    setShowModal(true)
  }

  function openEditModal(insumo) {
    setModalMode('edit')
    setSelectedInsumo(insumo)
    setFormData({
      nombre: insumo.nombre || '',
      idTipo: insumo.idTipo || '',
      stock: insumo.stock?.toString() || '',
      capacidad_valor: insumo.capacidad_valor?.toString() || '',
      capacidad_unidad: insumo.capacidad_unidad || '',
      es_prestable: insumo.es_prestable || false
    })
    setShowModal(true)
  }

  function openAdjustModal(insumo) {
    setModalMode('adjust')
    setSelectedInsumo(insumo)
    setAdjustData({
      cantidad: '',
      tipo: 'entrada',
      observaciones: ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (modalMode === 'create') {
        const payload = {
          ...formData,
          stock: Number(formData.stock),
          capacidad_valor: formData.capacidad_valor ? Number(formData.capacidad_valor) : null,
          creadoPor: user?.idUsuario
        }
        const result = await api.post('/api/insumos', payload)
        setInsumos(prev => [...prev, result])
      } else if (modalMode === 'edit') {
        const payload = {
          ...formData,
          stock: Number(formData.stock),
          capacidad_valor: formData.capacidad_valor ? Number(formData.capacidad_valor) : null,
          actualizadoPor: user?.idUsuario
        }
        const result = await api.patch(`/api/insumos/${selectedInsumo.idInsumo}`, payload)
        setInsumos(prev => prev.map(i => 
          i.idInsumo === selectedInsumo.idInsumo ? result : i
        ))
      } else if (modalMode === 'adjust') {
        const payload = {
          idInsumo: selectedInsumo.idInsumo,
          cantidad: Number(adjustData.cantidad),
          tipo: adjustData.tipo,
          observaciones: adjustData.observaciones,
          realizadoPor: user?.idUsuario
        }
        await api.post('/api/ajustes-inventario', payload)
        
        // Actualizar stock local
        const nuevoStock = adjustData.tipo === 'entrada' 
          ? selectedInsumo.stock + Number(adjustData.cantidad)
          : adjustData.tipo === 'salida'
          ? Math.max(0, selectedInsumo.stock - Number(adjustData.cantidad))
          : Number(adjustData.cantidad)
          
        setInsumos(prev => prev.map(i => 
          i.idInsumo === selectedInsumo.idInsumo ? { ...i, stock: nuevoStock } : i
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
                📦 Gestión de Inventario
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
                Controla el stock de insumos, registra ingresos y ajustes del laboratorio.
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
              + Nuevo Insumo
            </button>
          </div>

          {/* Grid de estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Total Insumos', value: stats.total, icon: '📦', color: '#3b82f6' },
              { label: 'Stock Bajo', value: stats.stockBajo, icon: '⚠️', color: '#f59e0b' },
              { label: 'Agotados', value: stats.agotados, icon: '❌', color: '#ef4444' },
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
                minWidth: '160px'
              }}
            >
              <option value="">Todos los tipos</option>
              {tipos.map(tipo => (
                <option key={tipo.idTipo} value={tipo.idTipo}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            
            <input
              type="search"
              placeholder="Buscar por nombre..."
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
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filtros.stockBajo}
                onChange={(e) => setFiltros(prev => ({ ...prev, stockBajo: e.target.checked }))}
                style={{ accentColor: '#f59e0b' }}
              />
              Solo stock bajo
            </label>
          </div>
        </div>

        {/* Lista de insumos */}
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
              Inventario de Insumos
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
              {insumosFiltrados.length} insumo{insumosFiltrados.length !== 1 ? 's' : ''} encontrado{insumosFiltrados.length !== 1 ? 's' : ''}
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
              Cargando inventario...
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
          ) : insumosFiltrados.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              color: '#94a3b8'
            }}>
              No hay insumos para mostrar
            </div>
          ) : (
            <div style={{ padding: '0', maxHeight: '500px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      Insumo
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      Tipo
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      Stock
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      Estado
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {insumosFiltrados.map((insumo, i) => {
                    const status = getStockStatus(insumo)
                    return (
                      <tr
                        key={insumo.idInsumo}
                        style={{
                          borderBottom: i < insumosFiltrados.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
                        }}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div>
                            <div style={{ color: '#f8fafc', fontWeight: '600', marginBottom: '4px' }}>
                              {insumo.nombre}
                            </div>
                            {insumo.capacidad_unidad && (
                              <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                                � {insumo.capacidad_valor} {insumo.capacidad_unidad}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#94a3b8',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {tipos.find(t => t.idTipo === insumo.idTipo)?.nombre || insumo.idTipo}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <div style={{ color: '#f8fafc', fontWeight: '600' }}>
                            {insumo.stock} {insumo.capacidad_unidad || 'unidades'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: status.bg.replace('bg-', '').replace('/20', '').replace('-600', '') === 'red' ? 'rgba(239, 68, 68, 0.2)' :
                                       status.bg.replace('bg-', '').replace('/20', '').replace('-600', '') === 'amber' ? 'rgba(245, 158, 11, 0.2)' :
                                       status.bg.replace('bg-', '').replace('/20', '').replace('-600', '') === 'blue' ? 'rgba(59, 130, 246, 0.2)' :
                                       'rgba(16, 185, 129, 0.2)',
                            color: status.color,
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => openEditModal(insumo)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => openAdjustModal(insumo)}
                              style={{
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Ajustar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                {modalMode === 'create' ? 'Nuevo Insumo' :
                 modalMode === 'edit' ? 'Editar Insumo' :
                 'Ajustar Stock'}
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

            <div style={{ display: 'grid', gap: '16px' }}>
              {modalMode === 'adjust' ? (
                <>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Insumo
                    </label>
                    <input
                      type="text"
                      value={selectedInsumo?.nombre || ''}
                      readOnly
                      style={{
                        width: '100%',
                        background: 'rgba(148, 163, 184, 0.1)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#94a3b8',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Tipo de Ajuste
                    </label>
                    <select
                      value={adjustData.tipo}
                      onChange={(e) => setAdjustData(prev => ({ ...prev, tipo: e.target.value }))}
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
                      <option value="entrada">Entrada (agregar stock)</option>
                      <option value="salida">Salida (quitar stock)</option>
                      <option value="ajuste">Ajuste (establecer cantidad exacta)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adjustData.cantidad}
                      onChange={(e) => setAdjustData(prev => ({ ...prev, cantidad: e.target.value }))}
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
                      Observaciones
                    </label>
                    <textarea
                      value={adjustData.observaciones}
                      onChange={(e) => setAdjustData(prev => ({ ...prev, observaciones: e.target.value }))}
                      rows="3"
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
                </>
              ) : (
                <>
                  <div>
                    <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      Nombre del Insumo
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
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
                      Tipo
                    </label>
                    <select
                      value={formData.idTipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, idTipo: e.target.value }))}
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
                      <option value="">Seleccionar tipo</option>
                      {tipos.map(tipo => (
                        <option key={tipo.idTipo} value={tipo.idTipo}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                        Stock Inicial
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
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
                        Valor/Precio
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.capacidad_valor}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacidad_valor: e.target.value }))}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                        Unidad de Medida
                      </label>
                      <input
                        type="text"
                        value={formData.capacidad_unidad}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacidad_unidad: e.target.value }))}
                        placeholder="mL, g, unidades..."
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
                        ¿Es prestable?
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', cursor: 'pointer', padding: '12px 0' }}>
                        <input
                          type="checkbox"
                          checked={formData.es_prestable}
                          onChange={(e) => setFormData(prev => ({ ...prev, es_prestable: e.target.checked }))}
                          style={{ accentColor: '#f59e0b' }}
                        />
                        Permite préstamos
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

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
                Cancelar
              </button>
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
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}