import { Routes, Route } from 'react-router-dom'
import { useAuth } from '../ctx/AuthContext'
import DashboardLayout from '../components/DashboardLayout.jsx'
import DelegadoHome from './delegado/DelegadoHome.jsx'
import DelegadoIntegrantes from './delegado/DelegadoIntegrantes.jsx'

export default function DelegadoLayout() {
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    window.location.href = '/login'
  }

  return (
    <DashboardLayout
      title="Panel de Delegado"
      subtitle="Gestiona tu grupo, integrantes y reporta incidencias."
      user={user}
      onLogout={handleLogout}
      accent="green"
      nav={[
        { to: '/delegado', label: 'Resumen', end: true },
        { to: '/delegado/integrantes', label: 'Integrantes' },
        { to: '/delegado/reportes', label: 'Reportar Daños' },
        { to: '/delegado/practicas', label: 'Prácticas' },
      ]}
    >
      <Routes>
        <Route index element={<DelegadoHome />} />
        <Route path="integrantes" element={<DelegadoIntegrantes />} />
        <Route path="reportes" element={<div className="dash-content"><h1>Reportes de Daño</h1><p>Funcionalidad en desarrollo...</p></div>} />
        <Route path="practicas" element={<div className="dash-content"><h1>Prácticas</h1><p>Funcionalidad en desarrollo...</p></div>} />
      </Routes>
    </DashboardLayout>
  )
}