import { NavLink } from 'react-router-dom'
import './dashboard-layout.css'

export default function DashboardLayout({
  title,
  subtitle,
  user,
  nav = [],
  accent = 'indigo',
  onLogout,
  actions = null,
  children,
}) {
  return (
    <div className={`dash-shell accent-${accent}`}>
      <div className="dash-header">
        <div className="dash-heading">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="dash-header-actions">
          {actions}
          {user ? (
            <div className="dash-user">
              <div className="dash-avatar" aria-hidden="true">
                {user.nombres?.[0]}
                {user.apellidos?.[0]}
              </div>
              <div className="dash-user-meta">
                <strong>{`${user.nombres || ''} ${user.apellidos || ''}`.trim()}</strong>
                <span>{user.correo || ''}</span>
              </div>
              {onLogout ? (
                <button type="button" className="dash-logout" onClick={onLogout}>
                  Cerrar sesión
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {nav.length ? (
        <nav className="dash-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `dash-nav-link${isActive ? ' active' : ''}`
              }
            >
              <span>{item.label}</span>
              {typeof item.badge === 'number' ? (
                <span className="dash-nav-badge">{item.badge}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
      ) : null}

      <main className="dash-main">{children}</main>
    </div>
  )
}
