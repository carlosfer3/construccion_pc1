import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../ctx/AuthContext'
import { useSearchParams } from 'react-router-dom'
import './login-standalone.css'

export default function Login(){
  const { login } = useAuth()
  const [params] = useSearchParams()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e){
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { user, token, requiereCambioClave } = await api.post('/api/auth/login', { correo, clave })
      // Acceso Instructor: si ?role=INSTR o venimos desde Acceso Instructor, obligar rol
      const mustInstr = (params.get('role') === 'INSTR')
      if (mustInstr && user.idRol !== 'INSTR') {
        setError('Este acceso es solo para Instructores'); setLoading(false); return
      }
      login({ ...user, token })
      const roleRedirects = {
        ADMIN: '/admin',
        INSTR: '/instructor',
        DELEG: '/delegado',
        LOGIS: '/logistica'
      }
      // Si el backend indica que requiere cambio de clave, redirigir
      if (requiereCambioClave) {
        window.location.href = '/perfil/clave'
      } else {
        window.location.href = roleRedirects[user.idRol] ?? '/'
      }
    } catch (err) {
      setError('Credenciales inválidas o error de conexión')
    } finally { setLoading(false) }
  }

  useEffect(()=>{ document.title = 'LabRequests-UNI • Iniciar sesión' }, [])

  return (
    <div className="loginx" role="application">
      <main className="wrap" role="main">
        <header className="brand" aria-label="Identidad del sistema">
          <h1>LabRequestsUNI</h1>
          <p className="muted">Sistema de Gestión de Laboratorio</p>
        </header>

        <section className="card" aria-labelledby="titulo-form">
          <h2 id="titulo-form" className="section-title">Iniciar sesión</h2>

          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <input id="email" name="email" type="email" className="input" placeholder="Correo" required value={correo} onChange={e=> setCorreo(e.target.value)} />
              <label htmlFor="email" className="label">Correo institucional</label>
            </div>
            <div className="field">
              <input id="password" name="password" type="password" className="input" placeholder="Contraseña" required minLength={6} value={clave} onChange={e=> setClave(e.target.value)} />
              <label htmlFor="password" className="label">Contraseña</label>
            </div>
            {error && <p style={{color:'#f87171', marginTop:6, fontSize:14}}>{error}</p>}
            <button id="submitBtn" className="btn" type="submit" disabled={loading}>{loading? 'Ingresando…' : 'Iniciar sesión'}</button>
          </form>
        </section>
      </main>
    </div>
  )
}

