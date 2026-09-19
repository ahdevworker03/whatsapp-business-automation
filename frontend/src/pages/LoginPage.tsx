import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import Button from '../components/Button'

// Single shared credential pair (docs/architecture/05-api-design.md section 11) —
// no forgot-password, no registration, no "remember me" beyond ordinary
// session-cookie persistence, per docs/development-milestones/
// 08.5-authentication.md section 7.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card panel" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <div className="page-subtitle">WhatsApp Outreach Dashboard</div>

        <div className="form-group">
          <label htmlFor="login-email" className="token-label">Email</label>
          <input
            id="login-email"
            type="email"
            className="token-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="token-label">Password</label>
          <input
            id="login-password"
            type="password"
            className="token-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
