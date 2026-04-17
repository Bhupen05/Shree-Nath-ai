import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function PublicOnlyRoute() {
  const { ready, isAuthenticated } = useAuth()

  if (!ready) {
    return <section className="center-state">Preparing workspace...</section>
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
