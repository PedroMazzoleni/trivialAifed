import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Lock, Copy, Check, ChevronLeft, Trophy } from 'lucide-react'
import { io } from 'socket.io-client'
import Navbar from '../components/Navbar'
import { Session } from '../utils/session'
import { apiGet } from '../utils/api'
import './LobbyPage.css'

const PLAYER_COLORS = ['#2d7dd2','#e84545','#f5a623','#18c25a','#a259ff','#ff6b6b','#3B9EFF','#f5c842']
const playerColor = (i) => PLAYER_COLORS[i % PLAYER_COLORS.length]

export default function LobbyPage() {
  // ── Refs (valores usados en callbacks de socket) ──
  const socketRef      = useRef(null)
  const myPlayerRef    = useRef(null)
  const isHostRef      = useRef(false)
  const roomCodeRef    = useRef(null)

  // ── Estado de sesión ──
  const [playerName,    setPlayerName]    = useState('')
  const [wins,          setWins]          = useState(0)
  const [showWins,      setShowWins]      = useState(false)

  // ── Estado de pantalla ──
  const [screen,        setScreen]        = useState('join')  // 'join' | 'room'

  // ── Estado del lobby (pantalla join) ──
  const [createTab,     setCreateTab]     = useState('public')
  const [codePanelOpen, setCodePanelOpen] = useState(false)
  const [joinCode,      setJoinCode]      = useState('')
  const [rooms,         setRooms]         = useState([])
  const [msg,           setMsg]           = useState(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [joinLoading,   setJoinLoading]   = useState(false)

  // ── Estado de la sala ──
  const [roomCode,      setRoomCode]      = useState(null)
  const [isHost,        setIsHost]        = useState(false)
  const [roomIsPrivate, setRoomIsPrivate] = useState(false)
  const [roomData,      setRoomData]      = useState(null)
  const [selectedRounds,setSelectedRounds]= useState(6)
  const [countdown,     setCountdown]     = useState(null)
  const [copied,        setCopied]        = useState(false)

  // ── Socket ──
  const [statusText,    setStatusText]    = useState('Conectando...')
  const [statusOnline,  setStatusOnline]  = useState(false)

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    const name = Session.playerName()
    if (name) setPlayerName(name)
    if (name && name !== 'Invitado') {
      apiGet(`/api/wins/${encodeURIComponent(name)}`)
        .then(d => { if (d.wins > 0) { setWins(d.wins); setShowWins(true) } })
        .catch(() => {})
    }
    connectSocket()
    return () => { socketRef.current?.disconnect() }
  }, []) // eslint-disable-line

  function connectSocket() {
    const socket = io(window.location.origin, { transports: ['polling'], reconnection: true, timeout: 8000 })
    socketRef.current = socket

    socket.on('connect', () => {
      setStatusText('Conectado al servidor')
      setStatusOnline(true)
      socket.emit('rooms:list')
    })
    socket.on('disconnect',    () => { setStatusText('Reconectando...');            setStatusOnline(false) })
    socket.on('connect_error', () => { setStatusText('Sin conexión al servidor');   setStatusOnline(false) })
    socket.on('rooms:list',    (list) => setRooms(list || []))

    socket.on('room:created', ({ code, player, isPrivate }) => {
      myPlayerRef.current = player
      isHostRef.current   = true
      roomCodeRef.current = code
      setRoomCode(code); setIsHost(true); setRoomIsPrivate(!!isPrivate)
      setCreateLoading(false); setMsg(null); setScreen('room')
    })

    socket.on('room:joined', ({ code, player }) => {
      myPlayerRef.current = player
      isHostRef.current   = false
      roomCodeRef.current = code
      setRoomCode(code); setIsHost(false); setRoomIsPrivate(false)
      setJoinLoading(false); setCreateLoading(false); setMsg(null); setScreen('room')
    })

    socket.on('room:update',     (room) => setRoomData(room))
    socket.on('game:countdown',  ({ seconds }) => setCountdown(seconds))

    socket.on('game:start', ({ roomCode: rc }) => {
      const code  = rc || roomCodeRef.current
      const pname = myPlayerRef.current?.name || ''
      const host  = isHostRef.current
      window.location.href = `/trivial-online-juego.html?room=${code}&player=${encodeURIComponent(pname)}&host=${host}`
    })

    socket.on('error', ({ msg: m }) => {
      setMsg({ text: m, type: 'error' })
      setCreateLoading(false)
      setJoinLoading(false)
    })
  }

  // ── Countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const t = setTimeout(() => setCountdown(n => (n !== null && n > 0) ? n - 1 : 0), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ── Acciones ──────────────────────────────────────────────────
  function createRoom() {
    if (!playerName.trim()) return setMsg({ text: 'Introduce tu nombre', type: 'error' })
    const socket = socketRef.current
    if (!socket?.connected) return setMsg({ text: 'Conectando al servidor...', type: 'error' })
    setMsg(null); setCreateLoading(true)
    socket.emit('room:create', { playerName: playerName.trim(), tenantId: 'default', isPrivate: createTab === 'private' })
  }

  function joinRoomByCard(code) {
    if (!playerName.trim()) return setMsg({ text: 'Introduce tu nombre primero', type: 'error' })
    const socket = socketRef.current
    if (!socket?.connected) return setMsg({ text: 'Conectando al servidor...', type: 'error' })
    setMsg(null); setCreateLoading(true)
    socket.emit('room:join', { code, playerName: playerName.trim(), tenantId: 'default' })
  }

  function joinByCode() {
    const code = joinCode.trim().toUpperCase()
    if (!playerName.trim())        return setMsg({ text: 'Introduce tu nombre', type: 'error' })
    if (!code || code.length < 4)  return setMsg({ text: 'Introduce el código de sala', type: 'error' })
    const socket = socketRef.current
    if (!socket?.connected) return setMsg({ text: 'Conectando al servidor...', type: 'error' })
    setMsg(null); setJoinLoading(true)
    socket.emit('room:join', { code, playerName: playerName.trim(), tenantId: 'default' })
  }

  function leaveRoom() {
    socketRef.current?.disconnect()
    socketRef.current   = null
    myPlayerRef.current = null
    isHostRef.current   = false
    roomCodeRef.current = null
    setScreen('join'); setRoomCode(null); setIsHost(false)
    setRoomIsPrivate(false); setRoomData(null); setCountdown(null)
    setCreateTab('public'); setMsg(null); setJoinCode('')
    connectSocket()
  }

  function selectRounds(n) { setSelectedRounds(n) }
  function startGame()     { socketRef.current?.emit('game:start', { rounds: selectedRounds }) }

  function copyCode() {
    navigator.clipboard.writeText(roomCode || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <Navbar />

      <Link className="btn-back" to="/modos">
        <ChevronLeft size={14} />
        Volver
      </Link>

      <div className="page">

        {/* ══════════ PANTALLA: JOIN ══════════ */}
        {screen === 'join' && (
          <div className="screen active" id="screen-join">

            <div className="header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                <img src="/images/logo.png" alt="Logo" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                <span className="brand" style={{ marginBottom: 0 }}>Trivial Travel</span>
              </div>
              <h1>Jugar Online</h1>
              <p>Únete a una sala o crea una nueva · 6 jugadores por partida</p>
              {showWins && (
                <div id="wins-badge" style={{ display: 'inline-block', marginTop: 8 }}>
                  <Trophy size={13} /> <span>{wins}</span> partidas ganadas
                </div>
              )}
            </div>

            {/* Tabs pública / privada */}
            <div className="create-tabs">
              <button
                className={`create-tab${createTab === 'public' ? ' active' : ''}`}
                onClick={() => setCreateTab('public')}
              >
                <span className="create-tab-icon"><Globe size={20} /></span>
                <span className="create-tab-title">Pública</span>
                <span className="create-tab-note">Visible para todos</span>
              </button>
              <button
                className={`create-tab${createTab === 'private' ? ' active' : ''}`}
                onClick={() => setCreateTab('private')}
              >
                <span className="create-tab-icon"><Lock size={20} /></span>
                <span className="create-tab-title">Privada</span>
                <span className="create-tab-note">Solo por código</span>
              </button>
            </div>

            {/* Nombre del jugador */}
            <div className="rooms-section">
              <div className="rooms-header">
                <span className="rooms-title">Tu nombre</span>
              </div>
              <div className="card">
                <div className="card-body" style={{ padding: '12px 14px' }}>
                  <input type="text" placeholder="¿Cómo te llaman?" maxLength={20}
                    value={playerName} onChange={e => setPlayerName(e.target.value)}
                    style={{ marginBottom: 0 }} />
                </div>
              </div>
            </div>

            {/* Browser de salas */}
            <div className="rooms-section">
              <div className="rooms-header">
                <span className="rooms-title">Salas disponibles</span>
                <span className="rooms-live"><span className="live-dot" />En directo</span>
              </div>
              <div id="rooms-list">
                {rooms.length === 0 ? (
                  <div className="rooms-empty">
                    <span>No hay salas abiertas</span>
                    <small>Crea una nueva para empezar</small>
                  </div>
                ) : rooms.map(r => {
                  const pct  = (r.players / 6) * 100
                  const full = r.players >= 6
                  return (
                    <div key={r.code} className={`room-card${full ? ' room-full' : ''}`}>
                      <div className="room-card-info">
                        <span className="room-card-code">{r.code}</span>
                        <span className="room-card-count">{r.players}/6 jugadores</span>
                        <div className="room-card-bar">
                          <div className="room-card-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {full
                        ? <span className="room-card-label-full">Llena</span>
                        : <button className="btn-join-card" onClick={() => joinRoomByCard(r.code)}>Unirse →</button>
                      }
                    </div>
                  )
                })}
              </div>
            </div>

            {msg && <div className={`msg ${msg.type} show`} style={{ marginBottom: 12 }}>{msg.text}</div>}

            {/* Crear sala */}
            <button
              className={`btn btn-primary btn-full${createLoading ? ' loading' : ''}`}
              onClick={createRoom} disabled={createLoading}
              style={{ marginBottom: 10 }}
            >
              <span className="btn-label">
                {createTab === 'private' ? '+ Crear sala privada' : '+ Crear sala pública'}
              </span>
              <div className="spinner" />
            </button>

            {/* Unirse con código */}
            <button className="btn-code-toggle" onClick={() => setCodePanelOpen(o => !o)}>
              Tengo un código de sala
            </button>
            <div className={`code-panel${codePanelOpen ? ' open' : ''}`}>
              <div>
                <input
                  type="text" className="code-input" placeholder="XXXXXX" maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  style={{ marginTop: 10 }}
                />
                <button
                  className={`btn btn-secondary${joinLoading ? ' loading' : ''}`}
                  onClick={joinByCode} disabled={joinLoading}
                  style={{ marginTop: 10, width: '100%' }}
                >
                  <span className="btn-label">Unirse</span>
                  <div className="spinner" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ══════════ PANTALLA: SALA DE ESPERA ══════════ */}
        {screen === 'room' && (
          <div className="screen active" id="screen-room">

            <div className="room-header">
              <span className="room-code-label">Código de sala</span>
              <div className="room-code">{roomCode}</div>
              {roomIsPrivate && (
                <div className="room-private-badge">
                  <Lock size={11} /> Sala privada
                </div>
              )}
              <button className="copy-btn" onClick={copyCode} style={{ marginTop: 8 }}>
                {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar código</>}
              </button>
            </div>

            <div className="status-bar">
              <div className="status-dot" style={{ background: statusOnline ? 'var(--blue)' : '#e84545' }} />
              <span className="status-text">{statusText}</span>
              <span className="status-connected" style={{ color: statusOnline ? 'var(--blue)' : '#e84545' }}>
                {statusOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
              </span>
            </div>

            <div className="players-section">
              <div className="players-header">
                <span className="players-title">Jugadores en la sala</span>
                <span className="players-count">{roomData?.players?.length ?? 1} / 6</span>
              </div>
              <div className="players-list">
                {roomData?.players?.map((p, i) => {
                  const isMe       = myPlayerRef.current && p.id === myPlayerRef.current.id
                  const isRoomHost = p.id === roomData.host
                  return (
                    <div key={p.id} className="player-row">
                      <div className="player-dot" style={{ background: p.color || playerColor(i) }} />
                      <span className="player-name">{p.name}</span>
                      {isMe       && <span className="player-you">Tú</span>}
                      {isRoomHost && <span className="player-host">Anfitrión</span>}
                    </div>
                  )
                })}
                {(roomData?.players?.length ?? 0) < 6 && (
                  <div className="waiting-row">
                    <div className="dots"><span /><span /><span /></div>
                    Esperando jugadores ({roomData?.players?.length ?? 1}/6)...
                  </div>
                )}
              </div>
            </div>

            {/* Host controls */}
            {isHost && (
              <div className="host-controls visible">
                <div className="round-selector">
                  <span className="round-label">Número de rondas</span>
                  <div className="round-btns">
                    {[4, 6, 8, 10].map(n => (
                      <button
                        key={n}
                        className={`round-btn${selectedRounds === n ? ' selected' : ''}`}
                        onClick={() => selectRounds(n)}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                <button className="btn-start ready" onClick={startGame}>
                  Empezar partida
                </button>
              </div>
            )}

            {!isHost && (
              <div className="waiting-host visible">
                <div className="dots" style={{ marginBottom: 8 }}><span /><span /><span /></div>
                Esperando a que el anfitrión empiece la partida...
              </div>
            )}

            <button className="btn-leave" onClick={leaveRoom}>Abandonar sala</button>

            {/* Cuenta atrás */}
            {countdown !== null && countdown > 0 && (
              <div className="countdown-overlay visible">
                <div className="countdown-box">
                  <div className="countdown-title">¡Sala completa!</div>
                  <div className="countdown-num">{countdown}</div>
                  <div className="countdown-sub">Comenzando partida...</div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </>
  )
}
