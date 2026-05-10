import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader, Lock, Mail, User } from 'lucide-react'

function RegisterPage() {
  const navigate = useNavigate()
  const { registerUser } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setFieldErrors((previous) => ({ ...previous, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}
    if (form.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email address'
    if (form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')
    try {
      await registerUser(form)
      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-10 justify-center">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-container flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/20">
            S
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-primary leading-none">SIBMS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mt-0.5">
              Kinetic Archive v1.0
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/10 overflow-hidden">
          <div className="p-8">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Create Account</p>
            <h2 className="text-3xl font-black tracking-tight text-on-surface mb-1">Register</h2>
            <p className="text-sm text-on-surface-variant mb-8">Start by creating your user account.</p>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="Alex Mercer"
                    className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 pl-11 text-sm font-medium outline-none focus:ring-2 transition-all ${
                      fieldErrors.name ? 'ring-2 ring-error' : 'focus:ring-primary/30'
                    }`}
                  />
                </div>
                {fieldErrors.name && <p className="text-[11px] text-error font-bold">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="you@company.com"
                    className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 pl-11 text-sm font-medium outline-none focus:ring-2 transition-all ${
                      fieldErrors.email ? 'ring-2 ring-error' : 'focus:ring-primary/30'
                    }`}
                  />
                </div>
                {fieldErrors.email && <p className="text-[11px] text-error font-bold">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="Min. 6 characters"
                    minLength={6}
                    className={`w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 pl-11 pr-12 text-sm font-medium outline-none focus:ring-2 transition-all ${
                      fieldErrors.password ? 'ring-2 ring-error' : 'focus:ring-primary/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-[11px] text-error font-bold">{fieldErrors.password}</p>}
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm font-medium text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-b from-primary to-primary-container text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>

          <div className="border-t border-outline-variant/10 bg-surface-container-low/50 px-8 py-5 text-center">
            <p className="text-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
