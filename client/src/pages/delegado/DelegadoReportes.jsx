import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

export default function DelegadoReportes() {
  const { user } = useAuth()
  const [reportes, setReportes] = useState([])
  const [miGrupo, setMiGrupo] = useState(null)
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal para crear reporte
  const [modalOpen, setModalOpen] = useState(false)
  const [nuevoReporte, setNuevoReporte] = useState({
    idInsumo: '',
    descripcion_danho: ''
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
        
        // Cargar reportes del grupo
        const reportesData = await api.get(`/api/reportes-daño?search=${grupoData.idGrupo}`)
        setReportes(Array.isArray(reportesData) ? reportesData : [])
      }
      
      // Cargar insumos para el formulario
      const insumosData = await api.get('/api/insumos?limit=100')
      setInsumos(Array.isArray(insumosData) ? insumosData : [])
    } catch (err) {
      console.error(err)
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReporte = async (e) => {
    e.preventDefault()
    if (!miGrupo || !nuevoReporte.idInsumo || !nuevoReporte.descripcion_danho) {
      alert('Complete todos los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      const payload = {
        idInsumo: nuevoReporte.idInsumo,
        idGrupo: miGrupo.idGrupo,
        descripcion_danho: nuevoReporte.descripcion_danho.trim(),
        idUsuario: user.idUsuario,
        fue_devuelto_correctamente: false
      }

      await api.post('/api/reportes-daño', payload)
      
      // Recargar lista
      await loadData()
      
      // Limpiar form
      setNuevoReporte({ idInsumo: '', descripcion_danho: '' })
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Error al crear reporte de daño')
    } finally {
      setSaving(false)
    }
  }

  const getEstadoBadge = (reporte) => {
    if (reporte.fue_reparado) return { class: 'success', text: 'Reparado' }
    return { class: 'warning', text: 'Pendiente' }
  }

  return (
    <div className="dash-content">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Reportes de Daño</h1>
          <p className="dash-subtitle">
            Reporta daños en equipos y materiales utilizados por tu grupo.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="dash-btn primary">
          ⚠️ Reportar Daño
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
          <div className="dash-grid cols-2">
            <div className="dash-field">
              <label>Práctica:</label>
              <span>{miGrupo.practica_descripcion || miGrupo.idPractica}</span>
            </div>
            <div className="dash-field">
              <label>Reportes realizados:</label>
              <span>{reportes.length}</span>
            </div>
          </div>
        </section>
      )}

      {/* Lista de reportes */}
      <section className="dash-card">
        <div className="dash-card-header">
          <h2 className="dash-card-title">Mis Reportes ({reportes.length})</h2>
        </div>
        {loading ? (
          <div className="dash-empty">Cargando reportes…</div>
        ) : reportes.length === 0 ? (
          <div className="dash-empty">No has realizado reportes de daño.</div>
        ) : (
          <div className="dash-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Insumo afectado</th>
                  <th>Fecha reporte</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map(reporte => {
                  const estado = getEstadoBadge(reporte)
                  return (
                    <tr key={reporte.idReporte}>
                      <td>{reporte.idReporte}</td>
                      <td>{reporte.insumo_nombre || reporte.idInsumo}</td>
                      <td>
                        {reporte.fecha_reporte ? new Date(reporte.fecha_reporte).toLocaleDateString() : '—'}
                      </td>
                      <td className="dash-text-truncate" title={reporte.descripcion_danho}>
                        {reporte.descripcion_danho || '—'}
                      </td>
                      <td>
                        <span className={`dash-badge ${estado.class}`}>
                          {estado.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal para crear reporte */}
      {modalOpen && (
        <div className="dash-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Reportar Daño</h3>
              <button onClick={() => setModalOpen(false)} className="dash-modal-close">✕</button>
            </div>
            <form onSubmit={handleCreateReporte} className="dash-modal-content">
              <div className="dash-field">
                <label>Insumo afectado *</label>
                <select
                  value={nuevoReporte.idInsumo}
                  onChange={(e) => setNuevoReporte(prev => ({ ...prev, idInsumo: e.target.value }))}
                  className="dash-select"
                  required
                >
                  <option value="">Seleccionar insumo</option>
                  {insumos.map(insumo => (
                    <option key={insumo.idInsumo} value={insumo.idInsumo}>
                      {insumo.nombre} ({insumo.idInsumo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="dash-field">
                <label>Descripción del daño *</label>
                <textarea
                  value={nuevoReporte.descripcion_danho}
                  onChange={(e) => setNuevoReporte(prev => ({ ...prev, descripcion_danho: e.target.value }))}
                  className="dash-textarea"
                  rows="4"
                  placeholder="Describe detalladamente el daño encontrado..."
                  required
                />
              </div>
              <div className="dash-modal-actions">
                <button type="button" onClick={() => setModalOpen(false)} className="dash-btn secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="dash-btn primary">
                  {saving ? 'Reportando...' : 'Crear Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}