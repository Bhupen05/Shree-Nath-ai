import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function ProtectedRoute({ requiredPermission }) {
  const location = useLocation()
  const { ready, isAuthenticated, can } = useAuth()

  if (!ready) {
    return <section className="center-state">Authenticating session...</section>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
