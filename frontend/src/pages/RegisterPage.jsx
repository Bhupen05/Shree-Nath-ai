import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormField from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
  const navigate = useNavigate()
  const { registerUser } = useAuth()
  const [form, setForm] = useState({
    name: '',
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

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters'
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address'
    }

    if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters'
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
      await registerUser(form)
      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Create Account</p>
      <h1>Register</h1>
      <p className="sub">Start by creating your user account.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <FormField
          label="Name"
          name="name"
          value={form.name}
          onChange={onChange}
          error={fieldErrors.name}
          required
        />

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
          minLength={6}
          required
        />

        {error && <p className="error-box">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="switch-auth">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </section>
  )
}

export default RegisterPage
