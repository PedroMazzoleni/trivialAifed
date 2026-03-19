// pages/lobby.js
// Requiere: utils.js

let socket         = null;
let myPlayer       = null;
let roomCode       = null;
let isHost         = false;
let players        = [];
let selectedRounds = 6;

// ── WINS ──────────────────────────────────────────────────────────────────────
async function loadWins() {
  const name = Session.playerName();
  if (!name || name === 'Invitado') return;
  el('create-name').value = name;
  el('join-name').value   = name;
  try {
    const data = await apiGet(`/api/wins/${encodeURIComponent(name)}`);
    setText('wins-count', data.wins || 0);
    el('wins-badge').style.display = 'inline-block';
  } catch {}
}

window.addEventListener('DOMContentLoaded', loadWins);

// ── SOCKET ────────────────────────────────────────────────────────────────────
function initSocket(callback) {
  if (socket && socket.connected) { callback(); return; }

  socket = io(SERVER, { transports: ['polling'], reconnection: true, timeout: 8000 });

  socket.on('connect',       ()    => { setStatus('Conectado al servidor', true); callback(); });
  socket.on('disconnect',    ()    => setStatus('Reconectando...', false));
  socket.on('connect_error', ()    => {
    setStatus('Sin conexión al servidor', false);
    setLoading('btn-create', false);
    setLoading('btn-join', false);
    showMsg('No se puede conectar al servidor.', 'error');
  });

  socket.on('error',       ({ msg }) => showMsg(msg, 'error'));

  socket.on('room:created', ({ code, player }) => {
    myPlayer = player; roomCode = code; isHost = true;
    setLoading('btn-create', false);
    showRoom(code);
  });

  socket.on('room:joined', ({ code, player }) => {
    myPlayer = player; roomCode = code; isHost = false;
    setLoading('btn-join', false);
    showRoom(code);
  });

  socket.on('room:update', (room) => {
    players = room.players;
    renderPlayers(room);
    updateStartBtn(room);
  });

  socket.on('game:start', ({ roomCode: rc }) => {
    const code = rc || roomCode;
    goTo(`trivial-online-juego.html?room=${code}&player=${encodeURIComponent(myPlayer.name)}&host=${isHost}`);
  });
}

// ── ACCIONES ──────────────────────────────────────────────────────────────────
function createRoom() {
  const name = el('create-name').value.trim();
  if (!name) return showMsg('Introduce tu nombre');
  hideMsg();
  setLoading('btn-create', true);
  initSocket(() => socket.emit('room:create', { playerName: name, tenantId: 'default' }));
}

function joinRoom() {
  const name = el('join-name').value.trim();
  const code = el('join-code').value.trim().toUpperCase();
  if (!name)                    return showMsg('Introduce tu nombre');
  if (!code || code.length < 4) return showMsg('Introduce el código de sala');
  hideMsg();
  setLoading('btn-join', true);
  initSocket(() => socket.emit('room:join', { code, playerName: name, tenantId: 'default' }));
}

function selectRounds(n) {
  selectedRounds = n;
  qsAll('.round-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent) === n);
  });
}

function startGame()  { if (socket) socket.emit('game:start', { rounds: selectedRounds }); }

function leaveRoom() {
  if (socket) socket.disconnect();
  socket = null;
  showScreen('join');
  myPlayer = null; roomCode = null; isHost = false; players = [];
}

// ── UI ────────────────────────────────────────────────────────────────────────
function showRoom(code) {
  setHTML('room-code-display', code);
  el('host-controls').classList.toggle('visible', isHost);
  el('waiting-host').classList.toggle('visible', !isHost);
  showScreen('room');
}

function renderPlayers(room) {
  const list = el('players-list');
  list.innerHTML = '';
  setText('players-count', `${room.players.length} / 6`);

  room.players.forEach(p => {
    const row        = document.createElement('div');
    row.className    = 'player-row';
    const isMe       = myPlayer && p.id === myPlayer.id;
    const isRoomHost = p.id === room.host;
    row.innerHTML = `
      <div class="player-dot" style="background:${p.color}"></div>
      <span class="player-name">${p.name}</span>
      ${isMe       ? '<span class="player-you">Tú</span>'       : ''}
      ${isRoomHost ? '<span class="player-host">Anfitrión</span>' : ''}
    `;
    list.appendChild(row);
  });

  if (room.players.length < 6) {
    const waiting = document.createElement('div');
    waiting.className = 'waiting-row';
    waiting.innerHTML = `<div class="dots"><span></span><span></span><span></span></div> Esperando jugadores...`;
    list.appendChild(waiting);
  }
}

function updateStartBtn(room) {
  el('btn-start').classList.toggle('ready', room.players.length >= 1);
  const note = el('min-note');
  if (note) note.style.display = 'none';
}

function setStatus(text, online) {
  setText('status-text', text);
  const conn = el('status-conn');
  conn.textContent = online ? 'EN LÍNEA' : 'DESCONECTADO';
  conn.style.color = online ? 'var(--blue)' : '#e84545';
  const dot = qs('.status-dot');
  if (dot) dot.style.background = online ? 'var(--blue)' : '#e84545';
}

function copyCode() {
  navigator.clipboard.writeText(roomCode || '').then(() => {
    const btn  = qs('.copy-btn');
    const orig = btn.innerHTML;
    btn.innerHTML   = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Copiado';
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
  });
}

function switchTab(tab) {
  el('tab-create').classList.toggle('active', tab === 'create');
  el('tab-join').classList.toggle('active', tab === 'join');
  el('panel-create').classList.toggle('active', tab === 'create');
  el('panel-join').classList.toggle('active', tab === 'join');
  hideMsg();
}

// Auto uppercase en código
el('join-code').addEventListener('input', function () {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});