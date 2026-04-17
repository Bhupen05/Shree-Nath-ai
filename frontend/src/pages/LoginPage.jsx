import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormField from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { loginUser } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setFieldErrors((previous) => ({ ...previous, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await loginUser(form)
      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Welcome Back</p>
      <h1>Login</h1>
      <p className="sub">Use your credentials to continue.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          error={fieldErrors.email}
          required
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
          required
        />

        {error && <p className="error-box">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="switch-auth">
        New here? <Link to="/register">Create account</Link>
      </p>
    </section>
  )
}

export default LoginPage
