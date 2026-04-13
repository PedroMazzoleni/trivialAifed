import { useState, useEffect, useRef } from 'react'
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
  const bgRef   = useRef(null)

  // Track cursor to illuminate background dots
  useEffect(() => {
    function handleMove(e) {
      bgRef.current?.style.setProperty('--mx', e.clientX + 'px')
      bgRef.current?.style.setProperty('--my', e.clientY + 'px')
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  useEffect(() => {
    const name = Session.playerName()
    if (name && name !== 'Guest') {
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
      <div className="modos-bg" ref={bgRef} aria-hidden="true">
        <div className="modos-orb modos-orb-1" />
        <div className="modos-orb modos-orb-2" />
        <div className="modos-orb modos-orb-3" />
        <div className="modos-orb modos-orb-4" />
        <div className="modos-grid" />
        <div className="modos-cursor-glow" />
      </div>

      <Link className="btn-back" to="/login">
        <ChevronLeft size={14} />
        Back
      </Link>

      <div className="page">

        <div className="header">
          <div className="header-logo-row">
            <img src="/images/logo.png" alt="Logo" className="header-logo-img" />
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
                  <Trophy size={12} /> {wins} wins
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
              <div className="mode-title">Play online</div>
              <div className="mode-desc">Compete in real time against other players. Create a room or join with a code.</div>
            </div>
            <div className="mode-tags">
              <span className="tag">Up to 6 players</span>
              <span className="tag">Real time</span>
              <span className="tag">Multiplayer</span>
            </div>
            <div className="mode-arrow"><ArrowRight size={18} /></div>
          </div>

          {/* VS IA */}
          <div className="mode-card" onClick={() => selectMode('ia')}>
            <div className="icon-box">
              <Bot size={22} />
            </div>
            <div>
              <div className="mode-title">Play vs AI</div>
              <div className="mode-desc">Train and test your knowledge against artificial intelligence.</div>
            </div>
            <div className="mode-tags">
              <span className="tag">1 player</span>
              <span className="tag">3 difficulty levels</span>
              <span className="tag">No waiting</span>
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
                <div className="mode-title" style={{ fontSize: 16 }}>Global Ranking</div>
                <div className="mode-desc"  style={{ fontSize: 12 }}>The best players across all games</div>
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
                  <div className="mode-title" style={{ fontSize: 16 }}>Admin panel</div>
                  <div className="mode-desc"  style={{ fontSize: 12 }}>Manage categories, questions and difficulty levels</div>
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
