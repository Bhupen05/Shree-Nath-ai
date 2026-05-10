import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiCall } from '../lib/apiClient'
import { User, Mail, Shield, Calendar, LogOut, RefreshCw, Loader } from 'lucide-react'

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
      const data = await apiCall('/auth/me')
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

  const profileData = user || authUser

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium text-on-surface-variant">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profileData) {
    return (
      <div className="flex-1 flex items-center justify-center h-full p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-error" />
          </div>
          <h3 className="text-xl font-black text-on-surface">Unable to load profile</h3>
          <p className="text-sm text-on-surface-variant">{error}</p>
          <button
            onClick={loadProfile}
            className="flex items-center gap-2 text-primary font-bold text-sm hover:underline mx-auto"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    )
  }

  const avatarSeed = encodeURIComponent(profileData?.name || 'default')

  return (
    <div className="flex-1 p-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-4xl font-black tracking-tighter text-on-surface">My Profile</h1>
        <p className="text-sm text-on-surface-variant mt-1">Your account details and access information.</p>
      </div>

      {/* Profile Card */}
      <div className="grid grid-cols-12 gap-6">
        {/* Avatar Section */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-primary text-white rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-xl shadow-primary/20">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-4">
              <img
                src={`https://picsum.photos/seed/${avatarSeed}/200/200`}
                alt={profileData?.name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-lg mx-auto"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-xl font-black tracking-tight">{profileData?.name || 'Unknown User'}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200/60 mt-1">
                  {profileData?.role || 'No Role Assigned'}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-xl border border-white/10 mx-auto"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/10">
            <h3 className="text-lg font-black text-on-surface tracking-tight mb-6">Account Details</h3>
            <div className="space-y-5">
              {[
                { icon: User, label: 'Full Name', value: profileData?.name || '—' },
                { icon: Mail, label: 'Email Address', value: profileData?.email || '—' },
                { icon: Shield, label: 'Role', value: profileData?.role || 'No role assigned' },
                {
                  icon: Calendar,
                  label: 'Member Since',
                  value: profileData?.created_at
                    ? new Date(profileData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—',
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-on-surface mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          {profileData?.permissions && profileData.permissions.length > 0 && (
            <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/10">
              <h3 className="text-lg font-black text-on-surface tracking-tight mb-4">Permissions</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1.5 rounded-lg"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
