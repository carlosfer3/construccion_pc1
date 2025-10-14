import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'

import Login from './pages/Login.jsx'

import AdminDashboard from './pages/AdminDashboard.jsx'

import InstructorDashboard from './pages/InstructorDashboard.jsx'

import DelegadoDashboard from './pages/DelegadoDashboard.jsx'

import LogisticaLayout from './pages/LogisticaLayout.jsx'

import DelegadoLayout from './pages/DelegadoLayout.jsx'

import Profile from './pages/Profile.jsx'

import ChangePassword from './pages/ChangePassword.jsx'

import Usuarios from './pages/Usuarios.jsx'

import Roles from './pages/Roles.jsx'

import Cursos from './pages/Cursos.jsx'

import Practicas from './pages/Practicas.jsx'

import Solicitudes from './pages/Solicitudes.jsx'

import Logistica from './pages/Logistica.jsx'

import Inventario from './pages/Inventario.jsx'

import Reportes from './pages/Reportes.jsx'

import Grupos from './pages/Grupos.jsx'

import Delegados from './pages/Delegados.jsx'



import Protected from './components/Protected.jsx'

import { useAuth } from './ctx/AuthContext.jsx'



const NAV = [

  { to: '/', label: 'Dashboard', roles: ['ADMIN','INSTR','LOGIS','DELEG'] },

  { to: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },

  { to: '/roles', label: 'Roles', roles: ['ADMIN'] },

  { to: '/cursos', label: 'Cursos', roles: ['ADMIN','INSTR'] },

  { to: '/practicas', label: 'Prácticas', roles: ['ADMIN','INSTR'] },

  { to: '/solicitudes', label: 'Solicitudes', roles: ['ADMIN','INSTR','DELEG'] },

  { to: '/logistica', label: 'Logística', roles: ['ADMIN','LOGIS'] },

  { to: '/inventario', label: 'Inventario', roles: ['ADMIN','LOGIS'] },

  { to: '/reportes', label: 'Reportes', roles: ['ADMIN','LOGIS','INSTR'] },

  { to: '/grupos', label: 'Grupos', roles: ['ADMIN','DELEG','INSTR'] },

  { to: '/delegados', label: 'Delegados', roles: ['ADMIN','INSTR'] },

]



export default function App(){

  const { user } = useAuth()

  const location = useLocation()

  const isLogin = location.pathname.startsWith('/login')

  const isAdmin = location.pathname.startsWith('/admin')

  

  // Función para determinar la ruta por defecto según el rol

  function getDefaultRoute() {

    if (!user) return '/login'

    

    switch(user.idRol) {

      case 'ADMIN': // ADMIN

        return '/admin'

      case 'INSTR': // DOCENTE/INSTRUCTOR

        return '/instructor'

      case 'DELEG': // ALUMNO/DELEGADO

        return '/delegado'

      case 'LOGIS': // LOGÍSTICA

        return '/logistica'

      default:

        return '/admin' // Por defecto admin

    }

  }

  

  return (

    <div className={(isLogin || isAdmin) ? '' : 'min-h-screen bg-white text-slate-900'}>

      <main className={(isLogin || isAdmin) ? '' : 'max-w-6xl mx-auto px-4 py-6'}>

        <Routes>

          <Route path="/" element={<Navigate to={getDefaultRoute()} />} />

          <Route path="/login" element={<Login/>} />

          

          {/* Admin Routes */}

          <Route path="/admin/*" element={<Protected roles={['ADMIN']}><AdminDashboard/></Protected>} />

          

          {/* Instructor Routes */}

          <Route path="/instructor" element={<Protected roles={['INSTR']}><InstructorDashboard/></Protected>} />

          <Route path="/instructor/*" element={<Protected roles={['INSTR']}><InstructorDashboard/></Protected>} />

          

          {/* Delegado Routes */}

          <Route path="/delegado" element={<Protected roles={['DELEG']}><DelegadoDashboard/></Protected>} />

          {/* Logística Routes */}

          <Route path="/delegado/*" element={<Protected roles={['DELEG']}><DelegadoLayout/></Protected>} />

          <Route path="/logistica/*" element={<Protected roles={['LOGIS']}><Logistica/></Protected>} />

          

          {/* Shared Routes */}

          <Route path="/perfil" element={<Protected roles={['ADMIN','INSTR','DELEG','LOGIS']}><Profile/></Protected>} />

          <Route path="/perfil/clave" element={<Protected roles={['ADMIN','INSTR','DELEG','LOGIS']}><ChangePassword/></Protected>} />

          {/* Legacy Routes (mantener para compatibilidad) */}

          <Route path="/usuarios" element={<Protected roles={['ADMIN']}><Usuarios/></Protected>} />

          <Route path="/roles" element={<Protected roles={['ADMIN']}><Roles/></Protected>} />

          <Route path="/cursos" element={<Protected roles={['ADMIN','INSTR']}><Cursos/></Protected>} />

          <Route path="/practicas" element={<Protected roles={['ADMIN','INSTR']}><Practicas/></Protected>} />

          <Route path="/solicitudes" element={<Protected roles={['ADMIN','INSTR','DELEG']}><Solicitudes/></Protected>} />

          <Route path="/inventario" element={<Protected roles={['ADMIN','LOGIS']}><Inventario/></Protected>} />

          <Route path="/reportes" element={<Protected roles={['ADMIN','LOGIS','INSTR']}><Reportes/></Protected>} />

          <Route path="/grupos" element={<Protected roles={['ADMIN','DELEG','INSTR']}><Grupos/></Protected>} />

          <Route path="/delegados" element={<Protected roles={['ADMIN','INSTR']}><Delegados/></Protected>} />

          <Route path="*" element={<Navigate to="/" />} />

        </Routes>

      </main>

      

    </div>

  )

}




