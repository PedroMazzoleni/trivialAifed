import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Bot, Trophy, BarChart3, ArrowRight, ChevronLeft, User } from 'lucide-react'
import Navbar from '../components/Navbar'
import { Session } from '../utils/session'
import { apiGet } from '../utils/api'
import './ModosPage.css'

export default function ModosPage() {
  const [playerName, setPlayerName] = useState('')
  const [wins,       setWins]       = useState(0)
  const [showWins,   setShowWins]   = useState(false)
  const isAdmin = Session.isAdmin()

  useEffect(() => {
    const name = Session.playerName()
    if (name && name !== 'Invitado') {
      setPlayerName(name)
      apiGet(`/api/wins/${encodeURIComponent(name)}`)
        .then(d => { if (d.wins > 0) { setWins(d.wins); setShowWins(true) } })
        .catch(() => {})
    }
  }, [])

  function selectMode(mode) {
    if (mode === 'online')  return (window.location.href = '/lobby')
    if (mode === 'ia')      return (window.location.href = '/trivial-ia-nivel.html')
    if (mode === 'admin')   return (window.location.href = '/trivial-admin.html')
    if (mode === 'ranking') return (window.location.href = '/trivial-ranking.html')
  }

  return (
    <>
      <Navbar />

      {/* Fondo animado */}
      <div className="modos-bg" aria-hidden="true">
        <div className="modos-orb modos-orb-1" />
        <div className="modos-orb modos-orb-2" />
        <div className="modos-orb modos-orb-3" />
        <div className="modos-orb modos-orb-4" />
        <div className="modos-grid" />
      </div>

      <Link className="btn-back" to="/login">
        <ChevronLeft size={14} />
        Volver
      </Link>

      <div className="page">

        <div className="header">
          <div className="header-logo-row">
            <img src="/images/logo-trivial.png" alt="Logo" className="header-logo-img" />
            <span className="brand" style={{ marginBottom: 0 }}>Trivial Travel</span>
          </div>
          <h1>Elige el modo<br />de juego</h1>
          <p>¿Contra quién quieres competir hoy?</p>

          {playerName && (
            <div className="player-info">
              <span className="player-name-display">
                <User size={13} /> {playerName}
              </span>
              {showWins && (
                <div className="wins-badge-modos">
                  <Trophy size={12} /> {wins} victorias
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cards">

          {/* ONLINE */}
          <div className="mode-card" onClick={() => selectMode('online')}>
            <div className="icon-box">
              <Globe size={22} />
            </div>
            <div>
              <div className="mode-title">Jugar online</div>
              <div className="mode-desc">Compite en tiempo real contra otros jugadores. Crea una sala o únete con un código.</div>
            </div>
            <div className="mode-tags">
              <span className="tag">Hasta 6 jugadores</span>
              <span className="tag">Tiempo real</span>
              <span className="tag">Multijugador</span>
            </div>
            <div className="mode-arrow"><ArrowRight size={18} /></div>
          </div>

          {/* VS IA */}
          <div className="mode-card" onClick={() => selectMode('ia')}>
            <div className="icon-box">
              <Bot size={22} />
            </div>
            <div>
              <div className="mode-title">Jugar vs IA</div>
              <div className="mode-desc">Entrena y pon a prueba tus conocimientos contra la inteligencia artificial.</div>
            </div>
            <div className="mode-tags">
              <span className="tag">1 jugador</span>
              <span className="tag">3 dificultades</span>
              <span className="tag">Sin espera</span>
            </div>
            <div className="mode-arrow"><ArrowRight size={18} /></div>
          </div>

          {/* RANKING */}
          <div className="mode-card mode-card-wide" onClick={() => selectMode('ranking')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
              <div className="icon-box">
                <Trophy size={20} />
              </div>
              <div>
                <div className="mode-title" style={{ fontSize: 16 }}>Ranking Global</div>
                <div className="mode-desc"  style={{ fontSize: 12 }}>Los mejores jugadores de todas las partidas</div>
              </div>
              <div className="mode-arrow" style={{ position: 'relative', bottom: 'auto', right: 'auto', opacity: 1, transform: 'none', marginLeft: 'auto' }}>
                <ArrowRight size={18} />
              </div>
            </div>
          </div>

          {/* ADMIN (solo admin) */}
          {isAdmin && (
            <div className="mode-card mode-card-wide" onClick={() => selectMode('admin')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                <div className="icon-box">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="mode-title" style={{ fontSize: 16 }}>Panel de administración</div>
                  <div className="mode-desc"  style={{ fontSize: 12 }}>Gestiona categorías, preguntas y dificultades</div>
                </div>
                <div className="mode-arrow" style={{ position: 'relative', bottom: 'auto', right: 'auto', opacity: 1, transform: 'none', marginLeft: 'auto' }}>
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
