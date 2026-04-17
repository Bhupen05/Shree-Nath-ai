import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', permission: 'dashboard:read' },
  { to: '/inventory', label: 'Inventory', permission: 'inventory:read' },
  { to: '/billing', label: 'Billing', permission: 'billing:read' },
  { to: '/customers', label: 'Customers', permission: 'customers:read' },
  { to: '/profile', label: 'Profile' },
]

function AppLayout() {
  const navigate = useNavigate()
  const { user, can, logoutUser } = useAuth()

  const logout = () => {
    logoutUser()
    navigate('/login')
  }

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <div className="brand-wrap">
          <p className="brand-eyebrow">Shree Nath</p>
          <h1>SIBMS Console</h1>
          <p className="brand-sub">Operations cockpit</p>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <p className="tiny-caption">Signed in as</p>
            <p className="user-chip">{user?.name || 'Unknown User'} • {user?.role || 'No role'}</p>
          </div>
          <Button variant="outline" onClick={logout}>Logout</Button>
        </header>

        <section className="workspace-content">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

export default AppLayout
