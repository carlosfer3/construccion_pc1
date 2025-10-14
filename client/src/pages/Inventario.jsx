import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

export default function Inventario(){
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
    <div style={{ 
      width: '100%', 
      height: '100%', 
      padding: '24px', 
      margin: 0,
      background: 'transparent',
      display: 'grid',
      gridTemplateRows: '1fr',
      gap: '24px'
    }}>
      <section style={{
        width: '100%',
        background: 'rgba(11, 18, 32, 0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '32px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 8px 0' }}>
              Inventario
            </h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px' }}>
              Consulta insumos disponibles, stock crítico y filtra por tipo o disponibilidad para préstamos.
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '16px',
            minWidth: '220px'
          }}>
            <div style={{
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <span style={{ color: '#94a3b8', fontSize: '14px', display: 'block' }}>Total insumos</span>
              <strong style={{ color: '#e5e7eb', fontSize: '18px' }}>{insumos.length}</strong>
            </div>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <span style={{ color: '#94a3b8', fontSize: '14px', display: 'block' }}>Stock crítico (≤5)</span>
              <strong style={{ color: '#f87171', fontSize: '18px' }}>{lowStockCount}</strong>
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr auto', 
          gap: '12px',
          marginBottom: '24px',
          alignItems: 'end'
        }}>
          <input
            type="search"
            placeholder="Buscar por nombre o tipo…"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: '#1e293b', 
              color: '#e5e7eb',
              fontSize: '14px'
            }}
          />
          <select
            value={filters.idTipo}
            onChange={(e) => setFilters((prev) => ({ ...prev, idTipo: e.target.value }))}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: '#1e293b', 
              color: '#e5e7eb',
              fontSize: '14px'
            }}
          >
            <option value="">Todos los tipos</option>
            {tipos.map(tipo => (
              <option key={tipo.idTipo} value={tipo.idTipo}>
                {tipo.nombre} ({tipo.cantidad ?? 0})
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#e5e7eb', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={filters.prestablesOnly}
                onChange={(e) => setFilters((prev) => ({ ...prev, prestablesOnly: e.target.checked }))}
              />
              Solo prestables
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#e5e7eb', fontSize: '14px' }}>
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
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#f87171',
            background: 'rgba(248, 113, 113, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(248, 113, 113, 0.2)'
          }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#94a3b8' 
          }}>
            Cargando inventario…
          </div>
        ) : insumos.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#94a3b8' 
          }}>
            No se encontraron insumos con los filtros aplicados.
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
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Nombre</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Stock</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Capacidad</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Préstamo</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map(insumo => {
                  const capacidad = insumo.capacidad_valor
                    ? `${insumo.capacidad_valor} ${insumo.capacidad_unidad || ''}`.trim()
                    : '—'
                  return (
                    <tr key={insumo.idInsumo} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '12px', color: '#e5e7eb' }}>{insumo.idInsumo}</td>
                      <td style={{ padding: '12px', color: '#e5e7eb' }}>{insumo.nombre}</td>
                      <td style={{ padding: '12px', color: '#e5e7eb' }}>{insumo.tipoNombre || insumo.idTipo}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: insumo.stock <= 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                          color: insumo.stock <= 5 ? '#f87171' : '#60a5fa',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {insumo.stock}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#e5e7eb' }}>{capacidad}</td>
                      <td style={{ padding: '12px', color: '#e5e7eb' }}>{insumo.es_prestable ? 'Sí' : 'No'}</td>
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

