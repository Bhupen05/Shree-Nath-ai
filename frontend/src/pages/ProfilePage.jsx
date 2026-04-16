import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearToken, getProfile, getToken } from '../auth'

function ProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const loadProfile = async () => {
      const token = getToken()
      if (!token) {
        navigate('/login')
        return
      }

      try {
        const data = await getProfile(token)
        setUser(data.user)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const logout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Authenticated User</p>
      <h1>Profile</h1>

      {loading && <p className="sub">Loading profile...</p>}

      {!loading && error && (
        <>
          <p className="error-box">{error}</p>
          <p className="switch-auth">
            Try <Link to="/login">logging in again</Link>.
          </p>
        </>
      )}

      {!loading && user && (
        <div className="profile-grid">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      )}
    </section>
  )
}

export default ProfilePage
