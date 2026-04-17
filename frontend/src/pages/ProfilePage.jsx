import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import StatusView from '../components/ui/StatusView'
import { getProfile } from '../auth'
import { useAuth } from '../context/AuthContext'

function ProfilePage() {
  const navigate = useNavigate()
  const { user: authUser, logoutUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  const loadProfile = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getProfile()
      setUser(data.user)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const logout = () => {
    logoutUser()
    navigate('/login')
  }

  if (loading) {
    return <StatusView mode="loading" title="Loading profile" message="Fetching your account details..." />
  }

  if (error) {
    return <StatusView mode="error" title="Unable to load profile" message={error} onRetry={loadProfile} />
  }

  return (
    <section className="stack">
      <header className="page-head">
        <p className="eyebrow">Account</p>
        <h1>Profile</h1>
      </header>

      <Card title="User details" subtitle="Authentication and role data">
        <div className="profile-grid">
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Role:</strong> {user?.role || authUser?.role || 'No role assigned'}</p>
          <p><strong>Created:</strong> {new Date(user?.created_at).toLocaleString()}</p>
          <button type="button" className="btn btn-outline" onClick={logout}>Logout</button>
        </div>
      </Card>
    </section>
  )
}

export default ProfilePage
