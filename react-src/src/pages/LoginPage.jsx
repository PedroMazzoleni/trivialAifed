import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Session } from '../utils/session'
import { apiPost } from '../utils/api'
import './LoginPage.css'

const STRENGTH_LEVELS = [
  { w: '20%',  c: '#ef4444' },
  { w: '40%',  c: '#f97316' },
  { w: '60%',  c: '#eab308' },
  { w: '80%',  c: '#84cc16' },
  { w: '100%', c: '#22c55e' },
]

function calcStrength(val) {
  let s = 0
  if (val.length >= 6)           s++
  if (val.length >= 10)          s++
  if (/[A-Z]/.test(val))         s++
  if (/[0-9]/.test(val))         s++
  if (/[^A-Za-z0-9]/.test(val))  s++
  return Math.min(s, 4)
}

export default function LoginPage() {
  const navigate = useNavigate()

  const [tab,          setTab]          = useState('login')
  const [msg,          setMsg]          = useState(null)

  const [loginEmail,   setLoginEmail]   = useState('')
  const [loginPass,    setLoginPass]    = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [regName,      setRegName]      = useState('')
  const [regEmail,     setRegEmail]     = useState('')
  const [regPass,      setRegPass]      = useState('')
  const [regLoading,   setRegLoading]   = useState(false)
  const [strength,     setStrength]     = useState(-1)

  function switchTab(t) { setTab(t); setMsg(null) }

  async function handleLogin() {
    setMsg(null)
    if (!loginEmail.trim()) return setMsg({ text: 'Enter your email or username', type: 'error' })
    if (!loginPass)          return setMsg({ text: 'Enter your password',          type: 'error' })

    setLoginLoading(true)
    try {
      const data = await apiPost('/api/login', { email: loginEmail.trim(), password: loginPass })
      setLoginLoading(false)
      if (!data.ok) return setMsg({ text: data.msg || 'Login failed', type: 'error' })

      Session.set('player_name',  data.name)
      Session.set('player_role',  data.role)
      Session.set('player_email', loginEmail.trim())

      setMsg({ text: 'Logged in. Redirecting...', type: 'success' })
      setTimeout(() => {
        if (data.role === 'admin') window.location.href = '/trivial-admin.html'
        else navigate('/modos')
      }, 800)
    } catch {
      setLoginLoading(false)
      setMsg({ text: 'Cannot connect to server', type: 'error' })
    }
  }

  async function handleRegister() {
    setMsg(null)
    if (!regName.trim())               return setMsg({ text: 'Choose a username',                        type: 'error' })
    if (regName.trim().length < 3)     return setMsg({ text: 'Name must be at least 3 characters',      type: 'error' })
    if (!regEmail.trim())              return setMsg({ text: 'Enter your email address',                 type: 'error' })
    if (!regEmail.includes('@'))       return setMsg({ text: 'Invalid email address',                    type: 'error' })
    if (!regPass)                      return setMsg({ text: 'Create a password',                        type: 'error' })
    if (regPass.length < 6)            return setMsg({ text: 'Password must be at least 6 characters',  type: 'error' })

    setRegLoading(true)
    try {
      const data = await apiPost('/api/register', { name: regName.trim(), email: regEmail.trim(), password: regPass })
      setRegLoading(false)
      if (!data.ok) return setMsg({ text: data.msg || 'Registration failed', type: 'error' })

      setMsg({ text: `Account created. Welcome, ${regName.trim()}!`, type: 'success' })
      setTimeout(() => switchTab('login'), 1500)
    } catch {
      setRegLoading(false)
      setMsg({ text: 'Cannot connect to server', type: 'error' })
    }
  }

  function handleGuest() {
    Session.set('player_name', 'Guest')
    Session.set('player_role', 'guest')
    setMsg({ text: 'Continuing as guest...', type: 'success' })
    setTimeout(() => navigate('/modos'), 600)
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return
    if (tab === 'login') handleLogin()
    else handleRegister()
  }

  const strengthLevel = STRENGTH_LEVELS[strength] || null

  return (
    <>
      <Navbar />
      <div className="page" onKeyDown={handleKeyDown}>
        <div className="card">

          <div className="card-header" style={{ textAlign: 'center' }}>
            <img
              src="/images/logometaversing.png"
              alt="Metaversing"
              style={{ width: 180, height: 180, objectFit: 'contain', marginBottom: 4 }}
            />
          </div>

          <div className="tabs">
            <button className={`tab${tab === 'login'    ? ' active' : ''}`} onClick={() => switchTab('login')}>Log in</button>
            <button className={`tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>Sign up</button>
          </div>

          <div className="card-body">
            {msg && <div className={`msg ${msg.type} show`}>{msg.text}</div>}

            {tab === 'login' ? (
              <>
                <div className="field">
                  <label>Email address</label>
                  <input type="text" placeholder="your@email.com or username" autoComplete="email"
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="Password" autoComplete="current-password"
                    value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                </div>

                <div className="form-extras">
                  <label className="remember">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a className="forgot" href="#">Forgot your password?</a>
                </div>

                <button className={`btn btn-primary btn-full${loginLoading ? ' loading' : ''}`}
                  onClick={handleLogin} disabled={loginLoading}>
                  <span className="btn-label">Enter</span>
                  <div className="spinner" />
                </button>

                <div className="divider"><hr /><span>or</span><hr /></div>

                <button className="btn btn-secondary btn-full" onClick={handleGuest}
                  style={{ background:'rgba(45,125,210,0.15)', border:'1.5px solid rgba(45,125,210,0.6)', color:'#7ab4e8', fontWeight:700, letterSpacing:'1px', boxShadow:'0 0 16px rgba(45,125,210,0.2)' }}>
                  Continue as guest
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Username</label>
                  <input type="text" placeholder="Your in-game name" maxLength={20}
                    value={regName} onChange={e => setRegName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" placeholder="your@email.com"
                    value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="At least 6 characters"
                    value={regPass}
                    onChange={e => { setRegPass(e.target.value); setStrength(e.target.value ? calcStrength(e.target.value) : -1) }} />
                  {strength >= 0 && strengthLevel && (
                    <div className="strength-bar show">
                      <div className="strength-fill" style={{ width: strengthLevel.w, background: strengthLevel.c }} />
                    </div>
                  )}
                </div>

                <button className={`btn btn-primary btn-full${regLoading ? ' loading' : ''}`}
                  onClick={handleRegister} disabled={regLoading}>
                  <span className="btn-label">Create account</span>
                  <div className="spinner" />
                </button>
              </>
            )}
          </div>

          <div className="card-footer" style={{ display: 'none' }}></div>

        </div>
      </div>
    </>
  )
}
