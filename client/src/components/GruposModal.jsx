import { useState, useEffect } from 'react'
import { api } from '../api'

export default function GruposModal({ 
  isOpen, 
  onClose, 
  practica, 
  instructorId, 
  onGruposUpdated 
}) {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  
  const [newGroup, setNewGroup] = useState({
    cantidad_integrantes: 4,
    delegado: {
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: ''
    }
  })

  useEffect(() => {
    if (isOpen && practica) {
      loadGrupos()
    }
  }, [isOpen, practica])

  async function loadGrupos() {
    if (!practica || !instructorId) return
    
    setLoading(true)
    setError('')
    try {
      const result = await api.get(`/api/instructor/${instructorId}/practicas/${practica.idPractica}/grupos`)
      setGrupos(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error('Error loading groups:', err)
      setError('Error al cargar los grupos')
      setGrupos([])
    } finally {
      setLoading(false)
    }
  }

  async function createGroup(e) {
    e.preventDefault()
    if (!practica || !instructorId) return
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      await api.post(`/api/instructor/${instructorId}/practicas/${practica.idPractica}/grupos`, newGroup)
      setSuccess('Grupo creado exitosamente')
      setNewGroup({
        cantidad_integrantes: 4,
        delegado: {
          nombres: '',
          apellidos: '',
          correo: '',
          telefono: ''
        }
      })
      setShowCreateForm(false)
      await loadGrupos()
      if (onGruposUpdated) onGruposUpdated()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error creating group:', err)
      setError(err.response?.data?.error || 'Error al crear el grupo')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  async function deleteGroup(idGrupo) {
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo?')) return
    
    setDeletingId(idGrupo)
    try {
      await api.del(`/api/instructor/${instructorId}/practicas/${practica.idPractica}/grupos/${idGrupo}`)
      setSuccess('Grupo eliminado exitosamente')
      await loadGrupos()
      if (onGruposUpdated) onGruposUpdated()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting group:', err)
      setError(err.response?.data?.error || 'Error al eliminar el grupo')
      setTimeout(() => setError(''), 5000)
    } finally {
      setDeletingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(11, 18, 32, 0.95)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 8px 0' }}>
              Gestión de Grupos
            </h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px' }}>
              {practica?.descripcion || `Práctica ${practica?.idPractica}`} - {practica?.curso_nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            Cerrar
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            marginBottom: '16px',
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: '8px',
            color: '#f87171'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '12px 16px', 
            marginBottom: '16px',
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            borderRadius: '8px',
            color: '#34d399'
          }}>
            ✅ {success}
          </div>
        )}

        {/* Create Group Button */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {showCreateForm ? '❌ Cancelar' : '➕ Crear Nuevo Grupo'}
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateForm && (
          <div style={{
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#e5e7eb', margin: '0 0 16px 0' }}>
              Crear Nuevo Grupo
            </h3>
            
            <form onSubmit={createGroup}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                    Cantidad de Integrantes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newGroup.cantidad_integrantes}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      cantidad_integrantes: parseInt(e.target.value) || 1 
                    }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: '#1e293b',
                      color: '#e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#e5e7eb', margin: '0 0 16px 0' }}>
                Datos del Delegado
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={newGroup.delegado.nombres}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      delegado: { ...prev.delegado, nombres: e.target.value }
                    }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: '#1e293b',
                      color: '#e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={newGroup.delegado.apellidos}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      delegado: { ...prev.delegado, apellidos: e.target.value }
                    }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: '#1e293b',
                      color: '#e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={newGroup.delegado.correo}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      delegado: { ...prev.delegado, correo: e.target.value }
                    }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: '#1e293b',
                      color: '#e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newGroup.delegado.telefono}
                    onChange={(e) => setNewGroup(prev => ({ 
                      ...prev, 
                      delegado: { ...prev.delegado, telefono: e.target.value }
                    }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: '#1e293b',
                      color: '#e5e7eb',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? '#6b7280' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                {loading ? 'Creando...' : 'Crear Grupo'}
              </button>
            </form>
          </div>
        )}

        {/* Groups List */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#e5e7eb', margin: '0 0 16px 0' }}>
            Grupos Asignados ({grupos.length})
          </h3>
          
          {loading && !showCreateForm ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#94a3b8' 
            }}>
              Cargando grupos...
            </div>
          ) : grupos.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              No hay grupos asignados a esta práctica.
            </div>
          ) : (
            <div style={{ 
              overflowX: 'auto',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: 'rgba(11, 18, 32, 0.6)'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(37, 99, 235, 0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>
                      ID Grupo
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>
                      Delegado
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#e5e7eb', fontWeight: 600 }}>
                      Integrantes
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#e5e7eb', fontWeight: 600 }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((grupo) => (
                    <tr key={grupo.idGrupo} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '12px', color: '#e5e7eb', fontWeight: 600 }}>
                        {grupo.idGrupo}
                      </td>
                      <td style={{ padding: '12px', color: '#e5e7eb' }}>
                        {grupo.delegado_nombres ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {grupo.delegado_nombres} {grupo.delegado_apellidos}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {grupo.delegado_correo}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#f87171', fontStyle: 'italic' }}>
                            Sin delegado asignado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#e5e7eb' }}>
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {grupo.integrantes_actuales || 0} / {grupo.cantidad_integrantes}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteGroup(grupo.idGrupo)}
                          disabled={deletingId === grupo.idGrupo}
                          style={{
                            background: deletingId === grupo.idGrupo ? '#6b7280' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: deletingId === grupo.idGrupo ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                          }}
                        >
                          {deletingId === grupo.idGrupo ? '⏳' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}