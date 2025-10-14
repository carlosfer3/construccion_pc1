import { useRef, useState } from 'react'

export default function AIAssistant() {
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

  return (
    <div className="ai-assistant-container">
      {/* Buscador IA */}
      <form onSubmit={handleAiSearch} className="ia-search">
        <input
          type="search"
          placeholder="Pregunta al asistente IA sobre QuimLab..."
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
          disabled={aiLoading}
        />
        <button type="submit" disabled={aiLoading || !aiQuery.trim()}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </form>

      {/* Respuesta del asistente */}
      {aiShow && (
        <div className="ai-response" ref={aiRef}>
          <div className="ai-response-header">
            <span>🤖 Asistente IA QuimLab</span>
            <button
              type="button"
              onClick={() => setAiShow(false)}
              className="ai-close-btn"
            >
              ×
            </button>
          </div>
          <div className="ai-response-content">
            {aiLoading ? (
              <div className="ai-loading">
                <div className="ai-loading-dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
                Procesando tu consulta...
              </div>
            ) : (
              <div className="ai-answer">
                {aiTyped}
                {aiTyped.length < aiAnswer.length && (
                  <span className="ai-cursor">|</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}