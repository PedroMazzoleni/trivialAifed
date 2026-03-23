import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
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
  const [msg,          setMsg]          = useState(null)   // { text, type }

  // Login form
  const [loginEmail,   setLoginEmail]   = useState('')
  const [loginPass,    setLoginPass]    = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form
  const [regName,      setRegName]      = useState('')
  const [regEmail,     setRegEmail]     = useState('')
  const [regPass,      setRegPass]      = useState('')
  const [regLoading,   setRegLoading]   = useState(false)
  const [strength,     setStrength]     = useState(-1)   // -1 = hidden

  function switchTab(t) {
    setTab(t)
    setMsg(null)
  }

  async function handleLogin() {
    setMsg(null)
    if (!loginEmail.trim()) return setMsg({ text: 'Introduce tu correo o usuario', type: 'error' })
    if (!loginPass)          return setMsg({ text: 'Introduce tu contraseña',        type: 'error' })

    setLoginLoading(true)
    try {
      const data = await apiPost('/api/login', { email: loginEmail.trim(), password: loginPass })
      setLoginLoading(false)
      if (!data.ok) return setMsg({ text: data.msg || 'Error al iniciar sesión', type: 'error' })

      Session.set('player_name',  data.name)
      Session.set('player_role',  data.role)
      Session.set('player_email', loginEmail.trim())

      setMsg({ text: 'Sesión iniciada. Redirigiendo...', type: 'success' })
      setTimeout(() => {
        if (data.role === 'admin') window.location.href = '/trivial-admin.html'
        else navigate('/modos')
      }, 800)
    } catch {
      setLoginLoading(false)
      setMsg({ text: 'No se puede conectar al servidor', type: 'error' })
    }
  }

  async function handleRegister() {
    setMsg(null)
    if (!regName.trim())               return setMsg({ text: 'Elige un nombre de usuario',                  type: 'error' })
    if (regName.trim().length < 3)     return setMsg({ text: 'El nombre debe tener al menos 3 caracteres', type: 'error' })
    if (!regEmail.trim())              return setMsg({ text: 'Introduce tu correo electrónico',              type: 'error' })
    if (!regEmail.includes('@'))       return setMsg({ text: 'Correo electrónico no válido',                 type: 'error' })
    if (!regPass)                      return setMsg({ text: 'Crea una contraseña',                         type: 'error' })
    if (regPass.length < 6)            return setMsg({ text: 'La contraseña debe tener al menos 6 caracteres', type: 'error' })

    setRegLoading(true)
    try {
      const data = await apiPost('/api/register', { name: regName.trim(), email: regEmail.trim(), password: regPass })
      setRegLoading(false)
      if (!data.ok) return setMsg({ text: data.msg || 'Error al registrarse', type: 'error' })

      setMsg({ text: `Cuenta creada. Bienvenido, ${regName.trim()}`, type: 'success' })
      setTimeout(() => switchTab('login'), 1500)
    } catch {
      setRegLoading(false)
      setMsg({ text: 'No se puede conectar al servidor', type: 'error' })
    }
  }

  function handleGuest() {
    Session.set('player_name', 'Invitado')
    Session.set('player_role', 'guest')
    setMsg({ text: 'Entrando como invitado...', type: 'success' })
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

          <div className="card-header">
            <div className="brand">Trivial</div>
            <h1>{tab === 'login' ? 'Acceder' : 'Crear cuenta'}</h1>
            <p>{tab === 'login'
              ? 'Introduce tus datos para continuar'
              : 'Rellena el formulario para registrarte'}
            </p>
          </div>

          <div className="tabs">
            <button className={`tab${tab === 'login'    ? ' active' : ''}`} onClick={() => switchTab('login')}>Iniciar sesión</button>
            <button className={`tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>Registrarse</button>
          </div>

          <div className="card-body">
            {msg && <div className={`msg ${msg.type} show`}>{msg.text}</div>}

            {tab === 'login' ? (
              <>
                <div className="field">
                  <label>Correo electrónico</label>
                  <input type="text" placeholder="tu@correo.com o usuario" autoComplete="email"
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Contraseña</label>
                  <input type="password" placeholder="Contraseña" autoComplete="current-password"
                    value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                </div>

                <div className="form-extras">
                  <label className="remember">
                    <input type="checkbox" />
                    <span>Recordarme</span>
                  </label>
                  <a className="forgot" href="#">¿Olvidaste la contraseña?</a>
                </div>

                <button className={`btn btn-primary btn-full${loginLoading ? ' loading' : ''}`}
                  onClick={handleLogin} disabled={loginLoading}>
                  <span className="btn-label">Entrar</span>
                  <div className="spinner" />
                </button>

                <div className="divider"><hr /><span>o</span><hr /></div>

                <button className="btn btn-secondary btn-full" onClick={handleGuest}>
                  Entrar como invitado
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Nombre de usuario</label>
                  <input type="text" placeholder="Tu nombre en el juego" maxLength={20}
                    value={regName} onChange={e => setRegName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Correo electrónico</label>
                  <input type="email" placeholder="tu@correo.com"
                    value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Contraseña</label>
                  <input type="password" placeholder="Mínimo 6 caracteres"
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
                  <span className="btn-label">Crear cuenta</span>
                  <div className="spinner" />
                </button>
              </>
            )}
          </div>

          <div className="card-footer">
            {tab === 'login'
              ? <>¿No tienes cuenta? <a onClick={() => switchTab('register')}>Regístrate</a></>
              : <>¿Ya tienes cuenta? <a onClick={() => switchTab('login')}>Inicia sesión</a></>
            }
          </div>

          <div className="ranking-link">
            <a href="/trivial-ranking.html">
              <Trophy size={14} /> Ver Ranking Global
            </a>
          </div>

        </div>
      </div>
    </>
  )
}
