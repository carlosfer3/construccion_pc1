import { useRef, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../ctx/AuthContext'
import LogisticaHomeNew from './logistica/LogisticaHomeNew.jsx'
import LogisticaSolicitudesNew from './logistica/LogisticaSolicitudesNew.jsx'
import LogisticaInventarioNew from './logistica/LogisticaInventarioNew.jsx'
import LogisticaPrestamosNew from './logistica/LogisticaPrestamosNew.jsx'
import LogisticaReportesNew from './logistica/LogisticaReportesNew.jsx'
import './logistica-dashboard.css'

export default function LogisticaDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // AI Assistant state
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiShow, setAiShow] = useState(false)
  const [aiTyped, setAiTyped] = useState('')
  const aiRef = useRef(null)

  async function handleAiSearch(e) {
    e.preventDefault()
    if (!aiQuery.trim() || aiLoading) return
    setAiLoading(true)
    setAiAnswer('')
    setAiShow(true)
    setAiTyped('')
    
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAV-9HOcggGQQpy0HTB5tdu39hOHv0JN2E', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiQuery }]}]
        })
      })
      const data = await res.json()
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se obtuvo respuesta.'
      setAiAnswer(answer)
      
      // Efecto máquina de escribir
      let i = 0
      function typeWriter() {
        setAiTyped(answer.slice(0, i))
        if (i < answer.length) {
          i++
          setTimeout(typeWriter, 12 + Math.random() * 30)
        }
      }
      typeWriter()
    } catch {
      setAiAnswer('Error al conectar con el asistente.')
      setAiTyped('Error al conectar con el asistente.')
    } finally { 
      setAiLoading(false) 
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const currentSection = location.pathname.replace('/logistica', '').split('/')[1] || ''

  return (
    <div className="logisticax">
      <aside className="sidebar">
        <div className="brand">QuimLab</div>
        <nav className="nav">
          <NavLink to="/logistica" end className={({ isActive }) => isActive ? 'active' : ''}>
            📊 Resumen
          </NavLink>
          <NavLink to="/logistica/solicitudes" className={({ isActive }) => isActive ? 'active' : ''}>
            📋 Solicitudes
          </NavLink>
          <NavLink to="/logistica/inventario" className={({ isActive }) => isActive ? 'active' : ''}>
            📦 Inventario
          </NavLink>
          <NavLink to="/logistica/prestamos" className={({ isActive }) => isActive ? 'active' : ''}>
            🔄 Préstamos
          </NavLink>
          <NavLink to="/logistica/reportes" className={({ isActive }) => isActive ? 'active' : ''}>
            ⚠️ Reportes
          </NavLink>
        </nav>
        <div className="user">
          <div className="avatar">
            {user?.nombres?.[0] || 'L'}{user?.apellidos?.[0] || 'O'}
          </div>
          <div>
            <div style={{ fontWeight: 900 }}>
              {user?.nombres || 'Logística'} {user?.apellidos || ''}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Logística — Laboratorio
            </div>
          </div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <form className="ia-search" onSubmit={handleAiSearch} role="search" aria-label="Buscar">
            <input
              type="search"
              placeholder="Asistente IA: Pregunta sobre inventario, solicitudes, préstamos, logística..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              disabled={aiLoading}
              autoComplete="off"
            />
            <button type="submit" aria-label="Enviar" disabled={aiLoading || !aiQuery.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M3 12l18-9-6 9 6 9-18-9z"/>
              </svg>
            </button>
          </form>
          
          {aiShow && (
            <div ref={aiRef} className="ai-response">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 18, color: '#fbbf24' }}>🤖 Asistente IA</strong>
                <button
                  onClick={() => {
                    setAiShow(false)
                    setAiQuery('')
                    setAiAnswer('')
                    setAiTyped('')
                    setAiLoading(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e5e7eb',
                    fontSize: 22,
                    cursor: 'pointer',
                    fontWeight: 700,
                    marginLeft: 10
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7 }}>
                <ReactMarkdown>{aiTyped || '...'}</ReactMarkdown>
                {aiLoading && <span style={{ fontSize: 13, color: '#fbbf24' }}>Procesando tu consulta...</span>}
              </div>
            </div>
          )}

          <div className="actions">
            <button
              onClick={handleLogout}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="content">
          <Routes>
            <Route index element={<LogisticaHomeNew />} />
            <Route path="solicitudes" element={<LogisticaSolicitudesNew />} />
            <Route path="solicitudes/:idSolicitud" element={<LogisticaSolicitudesNew />} />
            <Route path="inventario" element={<LogisticaInventarioNew />} />
            <Route path="prestamos" element={<LogisticaPrestamosNew />} />
            <Route path="reportes" element={<LogisticaReportesNew />} />
          </Routes>
        </div>
      </section>
    </div>
  )
}