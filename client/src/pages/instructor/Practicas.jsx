import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../ctx/AuthContext'
import GruposModal from '../../components/GruposModal'

export default function InstructorPracticas(){
  const { user } = useAuth()
  const [practicas, setPracticas] = useState([])
  const [cursos, setCursos] = useState([])
  const [cursoFiltro, setCursoFiltro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    idCurso: '',
    tipo: 'PRACTICA',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [gruposModal, setGruposModal] = useState({
    isOpen: false,
    practica: null
  })

  useEffect(() => {
    if (!user) return
    let alive = true
    async function load(){
      setLoading(true); setError('')
      try{
        const params = cursoFiltro ? `?curso=${encodeURIComponent(cursoFiltro)}` : ''
        const [practRes, cursosRes] = await Promise.all([
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas${params}`),
          api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/cursos`),
        ])
        if (!alive) return
        setPracticas(Array.isArray(practRes) ? practRes : [])
        setCursos(Array.isArray(cursosRes) ? cursosRes : [])
        if (!form.idCurso && cursosRes?.length){
          setForm((prev) => ({ ...prev, idCurso: cursosRes[0].idCurso }))
        }
      } catch (err) {
        console.error('Error loading practices/courses:', err)
        if (!alive) return
        setError('No fue posible cargar las prácticas.')
        setPracticas([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [user, cursoFiltro])

  async function onSubmit(e){
    e.preventDefault()
    if (!user) return
    setFormLoading(true); setFormError(''); setFormSuccess('')
    try{
      const res = await api.post(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas`, form)
      setFormSuccess(`Práctica ${res?.idPractica || ''} registrada correctamente.`)
      setForm({
        idCurso: form.idCurso,
        tipo: 'PRACTICA',
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
      })
      // Recargar prácticas
      const params = cursoFiltro ? `?curso=${encodeURIComponent(cursoFiltro)}` : ''
      const practRes = await api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas${params}`)
      setPracticas(Array.isArray(practRes) ? practRes : [])
    } catch (err){
      setFormError('No fue posible registrar la práctica.')
    } finally {
      setFormLoading(false)
    }
  }

  async function deletePractica(idPractica) {
    if (!user || !confirm('¿Estás seguro de que deseas eliminar esta práctica?')) return
    
    setDeletingId(idPractica)
    try {
      await api.del(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas/${idPractica}`)
      
      // Recargar prácticas después de eliminar
      const params = cursoFiltro ? `?curso=${encodeURIComponent(cursoFiltro)}` : ''
      const practRes = await api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas${params}`)
      setPracticas(Array.isArray(practRes) ? practRes : [])
      
      setFormSuccess('Práctica eliminada correctamente.')
      setTimeout(() => setFormSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting practice:', err)
      setFormError('No fue posible eliminar la práctica.')
      setTimeout(() => setFormError(''), 3000)
    } finally {
      setDeletingId(null)
    }
  }

  function openGruposModal(practica) {
    setGruposModal({
      isOpen: true,
      practica
    })
  }

  function closeGruposModal() {
    setGruposModal({
      isOpen: false,
      practica: null
    })
  }

  async function onGruposUpdated() {
    // Recargar prácticas para actualizar el contador de grupos
    const params = cursoFiltro ? `?curso=${encodeURIComponent(cursoFiltro)}` : ''
    try {
      const practRes = await api.get(`/api/instructor/${encodeURIComponent(user.idUsuario)}/practicas${params}`)
      setPracticas(Array.isArray(practRes) ? practRes : [])
    } catch (err) {
      console.error('Error reloading practices:', err)
    }
  }

  const practicasFiltradas = useMemo(() => practicas, [practicas])

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      padding: '24px', 
      margin: 0,
      background: 'transparent',
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      gap: '24px'
    }}>
      {/* Lista de prácticas */}
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
              Prácticas programadas
            </h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px' }}>
              Gestiona las prácticas vinculadas a tus cursos y revisa los grupos asignados.
            </p>
          </div>
          <div style={{ minWidth: '200px' }}>
            <select
              value={cursoFiltro}
              onChange={(e) => setCursoFiltro(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: '#1e293b',
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            >
              <option value="">Todos los cursos</option>
              {cursos.map(curso => (
                <option key={curso.idCurso} value={curso.idCurso}>
                  {curso.nombre || curso.idCurso}
                </option>
              ))}
            </select>
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
            Cargando prácticas…
          </div>
        ) : practicasFiltradas.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#94a3b8' 
          }}>
            Aún no registras prácticas para este curso.
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
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Curso</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Descripción</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Inicio</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Fin</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#e5e7eb', fontWeight: 600 }}>Grupos</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#e5e7eb', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {practicasFiltradas.map((prac) => (
                  <tr key={prac.idPractica} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px', color: '#e5e7eb' }}>{prac.idPractica}</td>
                    <td style={{ padding: '12px', color: '#e5e7eb' }}>{prac.curso_nombre || prac.idCurso}</td>
                    <td style={{ padding: '12px', color: '#e5e7eb' }}>{prac.descripcion || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: 'rgba(37, 99, 235, 0.2)',
                        color: '#60a5fa',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {prac.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#e5e7eb' }}>
                      {prac.fecha_inicio ? new Date(prac.fecha_inicio).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#e5e7eb' }}>
                      {prac.fecha_fin ? new Date(prac.fecha_fin).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#e5e7eb' }}>{prac.grupos ?? 0}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openGruposModal(prac)}
                          style={{
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#047857'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#059669'
                          }}
                        >
                          👥 Grupos
                        </button>
                        <button
                          onClick={() => deletePractica(prac.idPractica)}
                          disabled={deletingId === prac.idPractica}
                          style={{
                            background: deletingId === prac.idPractica ? '#6b7280' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: deletingId === prac.idPractica ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            if (deletingId !== prac.idPractica) {
                              e.target.style.background = '#b91c1c'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (deletingId !== prac.idPractica) {
                              e.target.style.background = '#dc2626'
                            }
                          }}
                        >
                          {deletingId === prac.idPractica ? (
                            <>⏳ Eliminando...</>
                          ) : (
                            <>🗑️ Eliminar</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Formulario de nueva práctica - AHORA VA ABAJO */}
      <section style={{
        width: '100%',
        background: 'rgba(11, 18, 32, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '32px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#e5e7eb', margin: '0 0 8px 0' }}>
            Crear nueva práctica
          </h3>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '16px' }}>
            Define el curso, tipo y fechas para habilitar la programación de grupos.
          </p>
        </div>
        
        <form onSubmit={onSubmit} style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
              Curso
            </label>
            <select
              value={form.idCurso}
              onChange={(e) => setForm((prev) => ({ ...prev, idCurso: e.target.value }))}
              required
              style={{ 
                width: '100%',
                padding: '10px 12px', 
                borderRadius: 10, 
                border: '1px solid rgba(255,255,255,0.2)', 
                background: '#1e293b', 
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            >
              {cursos.map(curso => (
                <option key={curso.idCurso} value={curso.idCurso}>
                  {curso.nombre || curso.idCurso}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
              Tipo
            </label>
            <select
              value={form.tipo}
              onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
              required
              style={{ 
                width: '100%',
                padding: '10px 12px', 
                borderRadius: 10, 
                border: '1px solid rgba(255,255,255,0.2)', 
                background: '#1e293b', 
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            >
              <option value="PRACTICA">Práctica</option>
              <option value="LABORATORIO">Laboratorio</option>
              <option value="EVALUACION">Evaluación</option>
            </select>
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
              Descripción
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Ej: Preparación de soluciones tampón"
              style={{ 
                width: '100%',
                padding: '10px 12px', 
                borderRadius: 10, 
                border: '1px solid rgba(255,255,255,0.2)', 
                background: '#1e293b', 
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
              Fecha inicio
            </label>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
              required
              style={{ 
                width: '100%',
                padding: '10px 12px', 
                borderRadius: 10, 
                border: '1px solid rgba(255,255,255,0.2)', 
                background: '#1e293b', 
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#94a3b8' }}>
              Fecha fin
            </label>
            <input
              type="date"
              value={form.fecha_fin}
              onChange={(e) => setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))}
              required
              style={{ 
                width: '100%',
                padding: '10px 12px', 
                borderRadius: 10, 
                border: '1px solid rgba(255,255,255,0.2)', 
                background: '#1e293b', 
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: 16, alignItems: 'center', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={formLoading}
              style={{ 
                background: formLoading ? '#6b7280' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: formLoading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'background-color 0.2s'
              }}
            >
              {formLoading ? 'Registrando…' : 'Registrar práctica'}
            </button>
            
            {formSuccess && (
              <span style={{ 
                color: '#34d399', 
                fontWeight: 600,
                background: 'rgba(52, 211, 153, 0.1)',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(52, 211, 153, 0.2)'
              }}>
                ✅ {formSuccess}
              </span>
            )}
            
            {formError && (
              <span style={{ 
                color: '#f87171', 
                fontWeight: 600,
                background: 'rgba(248, 113, 113, 0.1)',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(248, 113, 113, 0.2)'
              }}>
                ❌ {formError}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Modal de gestión de grupos */}
      <GruposModal
        isOpen={gruposModal.isOpen}
        onClose={closeGruposModal}
        practica={gruposModal.practica}
        instructorId={user?.idUsuario}
        onGruposUpdated={onGruposUpdated}
      />
    </div>
  )
}