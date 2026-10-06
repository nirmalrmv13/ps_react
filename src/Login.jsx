import { useState } from 'react'
import { apiPost } from './api.js'
import logo from './assets/logo.png'
import spaRoom from './assets/spa-room.png'
import { BRAND } from './brand.js'
import {
  AppleIcon,
  EyeIcon,
  EyeOffIcon,
  FacebookIcon,
  GoogleIcon,
  LeafBranch,
  LockIcon,
} from './Icons.jsx'
import './Login.css'

function Brand() {
  return (
    <div className="brand">
      <img className="brand-logo" src={logo} alt="" />
      <div className="brand-text">
        <span className="brand-name">{BRAND.name}</span>
        <span className="brand-tagline">{BRAND.tagline}</span>
      </div>
    </div>
  )
}

function Login({ onLogin, message = '' }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(message)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const data = await apiPost('/api/login', { identifier, password })
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function showComingSoon(feature) {
    setError('')
    setNotice(`${feature} is coming soon.`)
  }

  return (
    <main className="auth-page">
      <LeafBranch className="leaf leaf-page" />

      <section className="auth-intro">
        <Brand />
        <h1 className="auth-heading">Welcome Back</h1>
        <img
          className="auth-photo"
          src={spaRoom}
          alt="A calm spa treatment room with a massage table, candles and plants"
        />
      </section>

      <section className="auth-card">
        <LeafBranch className="leaf leaf-card" />

        <h2 className="card-title">Log in to {BRAND.shortName}</h2>
        <p className="card-subtitle">Access your appointments &amp; profile.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="identifier">
            Username or Email
          </label>
          <input
            id="identifier"
            className="field-input"
            type="text"
            placeholder="e.g., serene_guest"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <div className="field-input password-field">
            <LockIcon className="field-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>

          <button
            type="button"
            className="link-button forgot-link"
            onClick={() => showComingSoon('Password reset')}
          >
            Forgot Password?
          </button>

          {error && (
            <p className="form-message form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-message form-notice" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Logging in…' : `Log In to ${BRAND.shortName}`}
          </button>
        </form>

        <p className="social-label">Or continue with:</p>
        <div className="social-buttons">
          <button
            type="button"
            className="social-button"
            aria-label="Continue with Google"
            onClick={() => showComingSoon('Google login')}
          >
            <GoogleIcon />
          </button>
          <button
            type="button"
            className="social-button social-facebook"
            aria-label="Continue with Facebook"
            onClick={() => showComingSoon('Facebook login')}
          >
            <FacebookIcon />
          </button>
          <button
            type="button"
            className="social-button"
            aria-label="Continue with Apple"
            onClick={() => showComingSoon('Apple login')}
          >
            <AppleIcon />
          </button>
        </div>

        <p className="signup-text">
          New to {BRAND.shortName}?{' '}
          <button
            type="button"
            className="link-button signup-link"
            onClick={() => showComingSoon('Sign up')}
          >
            Sign Up
          </button>
        </p>
      </section>
    </main>
  )
}

export default Login
