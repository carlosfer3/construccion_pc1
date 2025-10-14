import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function DelegadoIntegrantes() {
  const { user } = useAuth()
  const [integrantes, setIntegrantes] = useState([])
  const [miGrupo, setMiGrupo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal para añadir integrante
  const [modalOpen, setModalOpen] = useState(false)
  const [nuevoIntegrante, setNuevoIntegrante] = useState({
    nombres: '',
    apellidos: '',
    correo: ''
  })

  useEffect(() => {
    loadData()
  }, [user.idUsuario])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      // Obtener grupo del delegado
      const grupoData = await api.get(`/api/usuarios/${user.idUsuario}/grupo`)
      if (grupoData) {
        setMiGrupo(grupoData)
        
        // Cargar integrantes
        const integrantesData = await api.get(`/api/grupos/${grupoData.idGrupo}/integrantes`)
        setIntegrantes(Array.isArray(integrantesData) ? integrantesData : [])
      }
    } catch (err) {
      console.error(err)
      setError('Error al cargar datos del grupo')
    } finally {
      setLoading(false)
    }
  }

  const handleAddIntegrante = async (e) => {
    e.preventDefault()
    if (!miGrupo || !nuevoIntegrante.nombres || !nuevoIntegrante.apellidos) {
      alert('Complete los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      const payload = {
        idGrupo: miGrupo.idGrupo,
        nombres: nuevoIntegrante.nombres.trim(),
        apellidos: nuevoIntegrante.apellidos.trim(),
        correo: nuevoIntegrante.correo.trim() || null,
        es_delegado: false
      }

      await api.post('/api/grupos/integrantes', payload)
      
      // Recargar lista
      await loadData()
      
      // Limpiar form
      setNuevoIntegrante({ nombres: '', apellidos: '', correo: '' })
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Error al añadir integrante')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveIntegrante = async (integrante) => {
    if (!confirm(`¿Remover a ${integrante.nombres} ${integrante.apellidos} del grupo?`)) return

    try {
      await api.delete(`/api/grupos/${miGrupo.idGrupo}/integrantes/${integrante.idUsuario || integrante.id}`)
      await loadData()
    } catch (err) {
      console.error(err)
      alert('Error al remover integrante')
    }
  }

  return (
    <div className="dash-content">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Gestión de Integrantes</h1>
          <p className="dash-subtitle">
            Administra los integrantes de tu grupo de práctica.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="dash-btn primary">
          ➕ Añadir Integrante
        </button>
      </div>

      {error && (
        <div className="dash-card" style={{ color: '#f87171', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Información del grupo */}
      {miGrupo && (
        <section className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <h2 className="dash-card-title">Grupo: {miGrupo.idGrupo}</h2>
          </div>
          <div className="dash-grid cols-3">
            <div className="dash-field">
              <label>Práctica:</label>
              <span>{miGrupo.practica_descripcion || miGrupo.idPractica}</span>
            </div>
            <div className="dash-field">
              <label>Capacidad máxima:</label>
              <span>{miGrupo.cantidad_integrantes}</span>
            </div>
            <div className="dash-field">
              <label>Integrantes actuales:</label>
              <span>{integrantes.length}</span>
            </div>
          </div>
        </section>
      )}

      {/* Lista de integrantes */}
      <section className="dash-card">
        <div className="dash-card-header">
          <h2 className="dash-card-title">Integrantes ({integrantes.length})</h2>
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
                  <th>Nombre completo</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {integrantes.map((integrante, index) => (
                  <tr key={index}>
                    <td>
                      {`${integrante.nombres || integrante.nombre || ''} ${integrante.apellidos || integrante.apellido || ''}`.trim()}
                    </td>
                    <td>{integrante.correo || '—'}</td>
                    <td>
                      <span className={`dash-badge ${integrante.es_delegado ? 'primary' : 'secondary'}`}>
                        {integrante.es_delegado ? 'Delegado' : 'Integrante'}
                      </span>
                    </td>
                    <td>
                      {!integrante.es_delegado && (
                        <button
                          onClick={() => handleRemoveIntegrante(integrante)}
                          className="dash-btn danger small"
                          title="Remover del grupo"
                        >
                          🗑️ Remover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal para añadir integrante */}
      {modalOpen && (
        <div className="dash-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Añadir Integrante</h3>
              <button onClick={() => setModalOpen(false)} className="dash-modal-close">✕</button>
            </div>
            <form onSubmit={handleAddIntegrante} className="dash-modal-content">
              <div className="dash-field">
                <label>Nombres *</label>
                <input
                  type="text"
                  value={nuevoIntegrante.nombres}
                  onChange={(e) => setNuevoIntegrante(prev => ({ ...prev, nombres: e.target.value }))}
                  className="dash-input"
                  required
                />
              </div>
              <div className="dash-field">
                <label>Apellidos *</label>
                <input
                  type="text"
                  value={nuevoIntegrante.apellidos}
                  onChange={(e) => setNuevoIntegrante(prev => ({ ...prev, apellidos: e.target.value }))}
                  className="dash-input"
                  required
                />
              </div>
              <div className="dash-field">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={nuevoIntegrante.correo}
                  onChange={(e) => setNuevoIntegrante(prev => ({ ...prev, correo: e.target.value }))}
                  className="dash-input"
                  placeholder="opcional"
                />
              </div>
              <div className="dash-modal-actions">
                <button type="button" onClick={() => setModalOpen(false)} className="dash-btn secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="dash-btn primary">
                  {saving ? 'Añadiendo...' : 'Añadir Integrante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}