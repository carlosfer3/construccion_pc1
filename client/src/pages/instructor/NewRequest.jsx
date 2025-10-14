import { useEffect, useMemo, useState, useRef } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'

const initialItem = { idInsumo: '', cantidad: 1 }
const ALL_GROUPS_OPTION = '__ALL__'

export default function InstructorNewRequest(){
  const { user } = useAuth()
  const [practicas, setPracticas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [insumoQuery, setInsumoQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [form, setForm] = useState({
    idPractica: '',
    idGrupo: '',
    observaciones: '',
    items: [initialItem],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const suggestionsRef = useRef(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      try{
        const [practRes, grupoRes, insumoRes] = await Promise.all([
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas`),
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/grupos`),
          api.get('/api/insumos?limit=200'),
        ])
        if (!alive) return
        const practs = Array.isArray(practRes) ? practRes : []
        const grups = Array.isArray(grupoRes) ? grupoRes : []
        setPracticas(practs)
        setGrupos(grups)
        setInsumos(Array.isArray(insumoRes) ? insumoRes : [])
        if (practs.length){
          setForm((prev) => ({
            ...prev,
            idPractica: prev.idPractica || practs[0].idPractica,
            idGrupo: prev.idGrupo || grups.find(g => g.idPractica === (prev.idPractica || practs[0].idPractica))?.idGrupo || '',
          }))
        }
      } catch {
        if (!alive) return
        setPracticas([])
        setGrupos([])
        setInsumos([])
      }
    }
    load()
    return () => { alive = false }
  }, [user])

  useEffect(() => {
    if (!form.idPractica) return
    const gruposDePractica = grupos.filter(g => g.idPractica === form.idPractica)

    if (form.idGrupo === ALL_GROUPS_OPTION) {
      if (!gruposDePractica.length) {
        setForm(prev => ({ ...prev, idGrupo: '' }))
      }
      return
    }

    if (!gruposDePractica.find(g => g.idGrupo === form.idGrupo)) {
      setForm(prev => ({ ...prev, idGrupo: gruposDePractica[0]?.idGrupo || '' }))
    }
  }, [form.idPractica, grupos, form.idGrupo])

  // Filtrar grupos por práctica seleccionada
  const gruposDisponibles = useMemo(
    () => grupos.filter(g => g.idPractica === form.idPractica),
    [grupos, form.idPractica]
  )

  // Filtrar insumos por búsqueda para autocompletado
  const insumosFiltrados = useMemo(() => {
    if (!insumoQuery.trim()) return []
    const query = insumoQuery.toLowerCase()
    return insumos.filter(ins => 
      ins.nombre.toLowerCase().includes(query) ||
      ins.idInsumo.toLowerCase().includes(query)
    ).slice(0, 10) // Limitar a 10 resultados
  }, [insumos, insumoQuery])

  // Cerrar sugerencias cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function updateItem(index, changes){
    setForm(prev => {
      const items = prev.items.slice()
      items[index] = { ...items[index], ...changes }
      return { ...prev, items }
    })
  }

  function addItem(){
    setForm(prev => ({ ...prev, items: [...prev.items, initialItem] }))
  }

  function removeItem(index){
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  function addInsumoFromSuggestion(insumo) {
    // Verificar si ya está en la lista
    const exists = form.items.some(item => item.idInsumo === insumo.idInsumo)
    if (exists) {
      setError('Este insumo ya está en la lista')
      setTimeout(() => setError(''), 3000)
      return
    }

    // Buscar si hay un slot vacío
    const emptyIndex = form.items.findIndex(item => !item.idInsumo)
    if (emptyIndex >= 0) {
      updateItem(emptyIndex, { idInsumo: insumo.idInsumo, cantidad: 1 })
    } else {
      // Agregar nuevo item
      setForm(prev => ({
        ...prev,
        items: [...prev.items, { idInsumo: insumo.idInsumo, cantidad: 1 }]
      }))
    }
    
    setInsumoQuery('')
    setShowSuggestions(false)
  }

  async function onSubmit(e){
    e.preventDefault()
    if (!user) return
    const aplicarATodos = form.idGrupo === ALL_GROUPS_OPTION
    const payload = {
      idGrupo: aplicarATodos ? null : form.idGrupo,
      idPractica: form.idPractica,
      observaciones: form.observaciones,
      aplicarATodos,
      items: form.items
        .filter(item => item.idInsumo && Number(item.cantidad) > 0)
        .map(item => ({
          idInsumo: item.idInsumo,
          cantidad: Number(item.cantidad),
        })),
    }
    if ((!aplicarATodos && !payload.idGrupo) || payload.items.length === 0){
      setError('Selecciona un grupo (o elige "Todos") y al menos un insumo con cantidad válida.')
      return
    }
    setLoading(true); setError(''); setSuccess('')
    try{
      const res = await api.post(`/api/instructor/${encodeURIComponent(user.idUsuario)}/solicitudes`, payload)
      if (Array.isArray(res?.solicitudes) && res.solicitudes.length) {
        const listado = res.solicitudes.map(s => s.idGrupo).join(', ')
        setSuccess(`Se registraron ${res.solicitudes.length} solicitudes para los grupos: ${listado}.`)
      } else {
        setSuccess(`Solicitud ${res?.idSolicitud || ''} registrada correctamente.`)
      }
      setForm({
        idPractica: form.idPractica,
        idGrupo: aplicarATodos ? ALL_GROUPS_OPTION : form.idGrupo,
        observaciones: '',
        items: [initialItem],
      })
    } catch (err){
      setError('No fue posible registrar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      padding: '24px', 
      margin: 0,
      background: 'transparent'
    }}>
      {/* Una sola card principal */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '32px',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Nueva solicitud de insumos
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px', fontWeight: 500 }}>
            Selecciona la práctica y grupo correspondiente, luego agrega los insumos requeridos.
          </p>
        </div>
        
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '32px' }}>
          {/* 1. Práctica y Grupo */}
          <div style={{ display: 'grid', gap: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 16px 0', borderBottom: '2px solid rgba(59, 130, 246, 0.3)', paddingBottom: '8px' }}>
              📚 Práctica y Grupo
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                  Práctica
                </label>
                <select
                  value={form.idPractica}
                  onChange={(e) => setForm(prev => ({ ...prev, idPractica: e.target.value }))}
                  required
                  style={{ 
                    width: '100%',
                    padding:'12px 16px', 
                    borderRadius: '8px', 
                    border:'1px solid rgba(255,255,255,0.1)', 
                    background:'#0b1229', 
                    color:'#e5e7eb',
                    fontSize: '14px'
                  }}
                >
                  {practicas.map(prac => (
                    <option key={prac.idPractica} value={prac.idPractica}>
                      {prac.curso_nombre || prac.idCurso} • {prac.descripcion || prac.idPractica}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                  Grupo
                </label>
                <select
                  value={form.idGrupo}
                  onChange={(e) => setForm(prev => ({ ...prev, idGrupo: e.target.value }))}
                  required
                  style={{ 
                    width: '100%',
                    padding:'12px 16px', 
                    borderRadius: '8px', 
                    border:'1px solid rgba(255,255,255,0.1)', 
                    background:'#0b1229', 
                    color:'#e5e7eb',
                    fontSize: '14px'
                  }}
                >
                  <option value="" disabled>Selecciona un grupo</option>
                  {gruposDisponibles.length > 1 ? (
                    <option value={ALL_GROUPS_OPTION}>Todos los grupos</option>
                  ) : null}
                  {gruposDisponibles.map(grupo => (
                    <option key={grupo.idGrupo} value={grupo.idGrupo}>
                      {grupo.idGrupo} • {grupo.curso_nombre || grupo.idCurso}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Observaciones */}
          <div style={{ display: 'grid', gap: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 16px 0', borderBottom: '2px solid rgba(59, 130, 246, 0.3)', paddingBottom: '8px' }}>
              💭 Observaciones
            </h3>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
                Observaciones (opcional)
              </label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
                placeholder="Notas adicionales para el personal de logística..."
                style={{ 
                  width: '100%',
                  padding:'12px 16px', 
                  borderRadius: '8px', 
                  border:'1px solid rgba(255,255,255,0.1)', 
                  background:'#0b1229', 
                  color:'#e5e7eb', 
                  resize:'vertical',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* 3. Insumos */}
          <div style={{ display: 'grid', gap: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 16px 0', borderBottom: '2px solid rgba(59, 130, 246, 0.3)', paddingBottom: '8px' }}>
              📦 Insumos Solicitados
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 600 }}>
                Busca y selecciona los insumos necesarios para la práctica
              </div>
            </div>
            
            {/* Buscador de insumos con autocompletado */}
            <div style={{ position: 'relative', marginBottom: '20px' }} ref={suggestionsRef}>
              <input
                type="search"
                placeholder="🔍 Buscar insumos para agregar (escribe para filtrar)..."
                value={insumoQuery}
                onChange={(e) => {
                  setInsumoQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                style={{ 
                  width: '100%',
                  padding:'12px 16px', 
                  borderRadius: '8px', 
                  border:'2px solid rgba(37, 99, 235, 0.3)', 
                  background:'#0b1229', 
                  color:'#e5e7eb',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              
              {/* Dropdown de sugerencias */}
              {showSuggestions && insumoQuery.trim() && insumosFiltrados.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#0b1020',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {insumosFiltrados.map(ins => (
                    <div
                      key={ins.idInsumo}
                      onClick={() => addInsumoFromSuggestion(ins)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(37, 99, 235, 0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: '2px' }}>
                          {ins.nombre}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {ins.idInsumo}
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 600,
                        color: ins.stock <= 5 ? '#f87171' : '#34d399',
                        background: ins.stock <= 5 ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        Stock: {ins.stock}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de insumos seleccionados */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {form.items.filter(item => item.idInsumo).map((item, index) => {
                const insumo = insumos.find(ins => ins.idInsumo === item.idInsumo)
                const stock = insumo?.stock
                const isLowStock = typeof stock === 'number' && stock <= 5
                
                return (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '12px',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <div>
                      <div style={{ 
                        fontWeight: 600, 
                        color: '#e5e7eb', 
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {insumo?.nombre || item.idInsumo}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#94a3b8',
                        marginBottom: '8px'
                      }}>
                        ID: {item.idInsumo}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 600,
                        color: isLowStock ? '#f87171' : '#34d399'
                      }}>
                        Stock actual: {stock ?? '—'}
                        {isLowStock && ' ⚠️ Stock bajo'}
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#94a3b8' }}>
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) => {
                          const filteredItems = form.items.filter(it => it.idInsumo)
                          const actualIndex = filteredItems.findIndex(it => it.idInsumo === item.idInsumo)
                          if (actualIndex !== -1) {
                            const realIndex = form.items.findIndex(it => it.idInsumo === item.idInsumo)
                            updateItem(realIndex, { cantidad: Number(e.target.value) })
                          }
                        }}
                        required
                        style={{ 
                          width: '80px',
                          padding:'10px 8px', 
                          borderRadius: '6px', 
                          border:'1px solid rgba(255,255,255,0.1)', 
                          background:'#0b1229', 
                          color:'#e5e7eb',
                          textAlign: 'center',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const realIndex = form.items.findIndex(it => it.idInsumo === item.idInsumo)
                          if (realIndex !== -1) {
                            removeItem(realIndex)
                          }
                        }}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                )
              })}
              
              {form.items.filter(item => item.idInsumo).length === 0 && (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px'
                }}>
                  🔍 Usa el buscador para agregar insumos a tu solicitud
                </div>
              )}
            </div>
          </div>

          {/* 4. Resumen de la solicitud */}
          <div style={{ display: 'grid', gap: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 16px 0', borderBottom: '2px solid rgba(59, 130, 246, 0.3)', paddingBottom: '8px' }}>
              📋 Resumen de la Solicitud
            </h3>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', 
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Efectos decorativos de fondo */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
              
              <div style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-10%',
                width: '150px',
                height: '150px',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
              
              {/* Header del resumen */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px',
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #3b82f6, #60a5fa)',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
                  animation: 'pulse 2s infinite'
                }} />
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  color: '#f8fafc', 
                  margin: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  Tu Solicitud
                </h4>
              </div>
              
              {/* Contenido principal del resumen */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Información principal */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '20px',
                    padding: '20px 32px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Brillo superior */}
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)'
                    }} />
                    
                    <div style={{
                      fontSize: '36px',
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 20px rgba(96, 165, 250, 0.5)',
                      marginBottom: '8px',
                      lineHeight: 1
                    }}>
                      {form.items.filter(item => item.idInsumo).length}
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#cbd5e1',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {form.items.filter(item => item.idInsumo).length === 1 ? 'Insumo' : 'Insumos'}
                    </div>
                  </div>
                </div>
                
                {/* Lista de insumos seleccionados */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>📦</span>
                    Insumos Seleccionados
                  </div>
                  
                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}>
                    {(() => {
                      const itemsWithInsumos = form.items.filter(item => item.idInsumo)
                      
                      if (itemsWithInsumos.length === 0) {
                        return (
                          <div style={{ 
                            color: '#64748b', 
                            fontStyle: 'italic',
                            textAlign: 'center',
                            padding: '20px'
                          }}>
                            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📝</span>
                            Aún no has seleccionado ningún insumo
                          </div>
                        )
                      }
                      
                      return itemsWithInsumos.map((item, index) => {
                        const insumo = insumos.find(ins => ins.idInsumo === item.idInsumo)
                        return (
                          <div 
                            key={index}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 0',
                              borderBottom: index < itemsWithInsumos.length - 1 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none'
                            }}
                          >
                            <div style={{
                              color: '#e2e8f0',
                              fontWeight: 500,
                              flex: 1
                            }}>
                              {insumo?.nombre || item.idInsumo}
                            </div>
                            <div style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#60a5fa',
                              minWidth: '40px',
                              textAlign: 'center'
                            }}>
                              {item.cantidad}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
                
                {/* Estadísticas adicionales */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#10b981',
                      marginBottom: '8px',
                      lineHeight: '1.2'
                    }}>
                      {(() => {
                        const practica = practicas.find(p => p.idPractica === form.idPractica)
                        return practica?.curso_nombre || practica?.idCurso || 'Curso no seleccionado'
                      })()}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#34d399',
                      lineHeight: '1.2'
                    }}>
                      {(() => {
                        const practica = practicas.find(p => p.idPractica === form.idPractica)
                        return practica?.descripcion || 'Práctica no seleccionada'
                      })()}
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#a855f7',
                      marginBottom: '4px'
                    }}>
                      {form.idGrupo === ALL_GROUPS_OPTION ? 'Todos los grupos' : (form.idGrupo || '—')}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#c4b5fd',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Grupo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Botones de acción */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Botón Volver a la izquierda */}
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                background: 'rgba(75, 85, 99, 0.8)',
                color: '#e5e7eb',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '14px 28px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(75, 85, 99, 1)'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(75, 85, 99, 0.8)'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              ← Volver
            </button>

            {/* Mensajes y botón de envío a la derecha */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {success && (
                <span style={{ 
                  color: '#34d399', 
                  fontWeight: 600,
                  background: 'rgba(52, 211, 153, 0.1)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(52, 211, 153, 0.2)'
                }}>
                  ✅ {success}
                </span>
              )}
              
              {error && (
                <span style={{ 
                  color: '#f87171', 
                  fontWeight: 600,
                  background: 'rgba(248, 113, 113, 0.1)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(248, 113, 113, 0.2)'
                }}>
                  ❌ {error}
                </span>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? '#6b7280' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 28px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(37, 99, 235, 0.4)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 25px rgba(37, 99, 235, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.4)'
                  }
                }}
              >
                {loading ? 'Enviando…' : 'Registrar solicitud'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// Component export is already handled by the function declaration