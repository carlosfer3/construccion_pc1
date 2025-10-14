import { Routes, Route } from 'react-router-dom'
import { useAuth } from '../ctx/AuthContext'
import DashboardLayout from '../components/DashboardLayout.jsx'
import LogisticaHomeNew from './logistica/LogisticaHomeNew.jsx'
import LogisticaInventarioNew from './logistica/LogisticaInventarioNew.jsx'
import LogisticaSolicitudesNew from './logistica/LogisticaSolicitudesNew.jsx'
import LogisticaPrestamosNew from './logistica/LogisticaPrestamosNew.jsx'
import LogisticaReportesNew from './logistica/LogisticaReportesNew.jsx'

export default function LogisticaLayout() {
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    window.location.href = '/login'
  }

  return (
    <DashboardLayout
      title="Panel de Logística"
      subtitle="Supervisa solicitudes, stock crítico y préstamos activos."
      user={user}
      onLogout={handleLogout}
      accent="amber"
      nav={[
        { to: '/logistica', label: 'Resumen', end: true },
        { to: '/logistica/solicitudes', label: 'Solicitudes' },
        { to: '/logistica/inventario', label: 'Inventario' },
        { to: '/logistica/prestamos', label: 'Préstamos' },
        { to: '/logistica/reportes', label: 'Reportes de Daño' },
      ]}
    >
      <Routes>
        <Route index element={<LogisticaHomeNew />} />
        <Route path="inventario" element={<LogisticaInventarioNew />} />
        <Route path="solicitudes" element={<LogisticaSolicitudesNew />} />
        <Route path="prestamos" element={<LogisticaPrestamosNew />} />
        <Route path="reportes" element={<LogisticaReportesNew />} />
      </Routes>
    </DashboardLayout>
  )
}