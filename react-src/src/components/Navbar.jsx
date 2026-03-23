import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Globe, Bot, BarChart3, ChevronDown, Menu } from 'lucide-react'
import { Session } from '../utils/session'

export default function Navbar() {
  const [modosOpen,  setModosOpen]  = useState(false)
  const [adminOpen,  setAdminOpen]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate  = useNavigate()

  // Re-render con valores frescos de sesión en cada cambio de ruta
  const name = Session.playerName()
  const role = Session.playerRole()

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('#dd-modos')) setModosOpen(false)
      if (!e.target.closest('#dd-admin')) setAdminOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Cerrar menú móvil al cambiar ruta
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  function logout() {
    Session.clear()
    navigate('/login')
  }

  const active = (path) => location.pathname === path ? 'active' : undefined

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">

          <Link className="navbar-logo" to="/">
            <img className="logo-main" src="/images/logo.png" alt="Trivial Travel" />
            <img className="logo-eu"   src="/images/eu-logo.png"      alt="Co-funded by EU" />
          </Link>

          <ul className="navbar-links">
            <li><Link to="/modos" className={active('/modos')}>Jugar</Link></li>
            <li><a href="/trivial-ranking.html">Ranking</a></li>
            <li><a href="/trivial-eventos.html">Eventos</a></li>

            {role === 'admin' && (
              <li id="dd-admin" className={adminOpen ? 'open' : undefined}>
                <button onClick={(e) => { e.stopPropagation(); setAdminOpen(o => !o); setModosOpen(false) }}>
                  Admin
                  <ChevronDown className="chevron" size={10} />
                </button>
                <ul className="navbar-dropdown">
                  <li>
                    <a href="/trivial-admin.html">
                      <BarChart3 size={13} /> Panel Admin
                    </a>
                  </li>
                </ul>
              </li>
            )}
          </ul>

          <div className="navbar-right">
            {name && name !== 'Invitado' ? (
              <>
                <div className="navbar-user-info">
                  <div className="navbar-avatar">{name.charAt(0).toUpperCase()}</div>
                  <span>{name}</span>
                </div>
                <button className="navbar-btn navbar-btn-ghost" onClick={logout}>Salir</button>
              </>
            ) : name === 'Invitado' ? (
              <>
                <div className="navbar-user-info">
                  <div className="navbar-avatar" style={{ background: '#8892b0' }}>?</div>
                  <span>Invitado</span>
                </div>
                <Link className="navbar-btn navbar-btn-primary" to="/login">Registrarse</Link>
              </>
            ) : (
              <>
                <Link className="navbar-btn navbar-btn-ghost"   to="/login">Iniciar sesión</Link>
                <Link className="navbar-btn navbar-btn-primary" to="/login">Registrarse</Link>
              </>
            )}
          </div>

          <button className="navbar-burger" onClick={() => setMobileOpen(o => !o)}>
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <div className={`navbar-mobile${mobileOpen ? ' open' : ''}`}>
        <Link to="/modos">Jugar</Link>
        <a href="/trivial-ranking.html">Ranking</a>
        <a href="/trivial-eventos.html">Eventos</a>
        <Link to="/lobby" className="mobile-sub"><Globe size={13} /> Online</Link>
        <a href="/trivial-ia-nivel.html" className="mobile-sub"><Bot size={13} /> vs IA</a>
        <div className="mobile-divider" />
        {name ? (
          <button onClick={logout}>Cerrar sesión ({name})</button>
        ) : (
          <Link to="/login">Iniciar sesión</Link>
        )}
        {role === 'admin' && (
          <a href="/trivial-admin.html">Panel Admin</a>
        )}
      </div>
    </>
  )
}
