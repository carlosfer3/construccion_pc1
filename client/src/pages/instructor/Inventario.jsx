import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'

export default function InstructorInventario(){
  const [tipos, setTipos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    idTipo: '',
    prestablesOnly: false,
    lowStock: false,
  })

  useEffect(() => {
    let alive = true
    async function loadTipos(){
      try{
        const data = await api.get('/api/tipos-insumo')
        if (!alive) return
        setTipos(Array.isArray(data) ? data : [])
      } catch {
        if (!alive) return
        setTipos([])
      }
    }
    loadTipos()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    const timeout = setTimeout(async () => {
      setLoading(true); setError('')
      try{
        const params = new URLSearchParams()
        if (filters.search) params.set('search', filters.search)
        if (filters.idTipo) params.set('idTipo', filters.idTipo)
        if (filters.prestablesOnly) params.set('prestablesOnly', '1')
        if (filters.lowStock) params.set('lowStock', '1')
        params.set('limit', '200')
        const data = await api.get(`/api/insumos?${params.toString()}`)
        if (!alive) return
        setInsumos(Array.isArray(data) ? data : [])
      } catch {
        if (!alive) return
        setError('No fue posible cargar el inventario.')
        setInsumos([])
      } finally {
        if (alive) setLoading(false)
      }
    }, filters.search ? 250 : 0)
    return () => { alive = false; clearTimeout(timeout) }
  }, [filters])

  const lowStockCount = useMemo(() => insumos.filter(i => i.stock <= 5).length, [insumos])

  return (
    <div className="dash-grid">
      <section className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Inventario</h2>
            <p className="dash-card-muted">
              Consulta insumos disponibles, stock crítico y filtra por tipo o disponibilidad para préstamos.
            </p>
          </div>
          <div className="dash-mini-grid" style={{minWidth:220}}>
            <div className="dash-mini-card">
              <span className="dash-card-muted">Total insumos</span>
              <strong>{insumos.length}</strong>
            </div>
            <div className="dash-mini-card">
              <span className="dash-card-muted">Stock crítico (&le;5)</span>
              <strong>{lowStockCount}</strong>
            </div>
          </div>
        </div>

        <div className="dash-grid cols-3" style={{ gap: 12 }}>
          <input
            type="search"
            placeholder="Buscar por nombre o tipo…"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--dash-card-strong)', color: 'var(--dash-text)' }}
          />
          <select
            value={filters.idTipo}
            onChange={(e) => setFilters((prev) => ({ ...prev, idTipo: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--dash-card-strong)', color: 'var(--dash-text)' }}
          >
            <option value="">Todos los tipos</option>
            {tipos.map(tipo => (
              <option key={tipo.idTipo} value={tipo.idTipo}>
                {tipo.nombre} ({tipo.cantidad ?? 0})
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.prestablesOnly}
                onChange={(e) => setFilters((prev) => ({ ...prev, prestablesOnly: e.target.checked }))}
              />
              Solo prestables
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(e) => setFilters((prev) => ({ ...prev, lowStock: e.target.checked }))}
              />
              Stock crítico
            </label>
          </div>
        </div>

        {error ? (
          <div className="dash-empty">{error}</div>
        ) : loading ? (
          <div className="dash-empty">Cargando inventario…</div>
        ) : insumos.length === 0 ? (
          <div className="dash-empty">No se encontraron insumos con los filtros aplicados.</div>
        ) : (
          <div className="dash-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Stock</th>
                  <th>Capacidad</th>
                  <th>Préstamo</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map(insumo => {
                  const capacidad = insumo.capacidad_valor
                    ? `${insumo.capacidad_valor} ${insumo.capacidad_unidad || ''}`.trim()
                    : '—'
                  return (
                    <tr key={insumo.idInsumo}>
                      <td>{insumo.idInsumo}</td>
                      <td>{insumo.nombre}</td>
                  <td>{insumo.tipoNombre || insumo.idTipo}</td>
                      <td>
                        <span className={`dash-badge ${insumo.stock <= 5 ? 'danger' : 'info'}`}>
                          {insumo.stock}
                        </span>
                      </td>
                      <td>{capacidad}</td>
                      <td>{insumo.es_prestable ? 'Sí' : 'No'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
