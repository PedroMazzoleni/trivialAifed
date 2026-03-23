// pages/lobby.js
// Requiere: utils.js

let socket         = null;
let myPlayer       = null;
let roomCode       = null;
let isHost         = false;
let roomIsPrivate  = false;
let players        = [];
let selectedRounds = 6;
let createTabMode  = 'public';

// ── WINS ──────────────────────────────────────────────────────────────────────
async function loadWins() {
  const name = Session.playerName();
  if (!name || name === 'Invitado') return;
  el('player-name').value = name;
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

  socket.on('connect', () => {
    setStatus('Conectado al servidor', true);
    socket.emit('rooms:list');
    callback();
  });

  socket.on('disconnect',    ()    => setStatus('Reconectando...', false));
  socket.on('connect_error', ()    => {
    setStatus('Sin conexión al servidor', false);
    setLoading('btn-create', false);
    setLoading('btn-join',   false);
    showMsg('No se puede conectar al servidor.', 'error');
  });

  socket.on('error',      ({ msg }) => showMsg(msg, 'error'));

  // Lista de salas en tiempo real
  socket.on('rooms:list', (list) => renderRoomsList(list));

  socket.on('room:created', ({ code, player, isPrivate }) => {
    myPlayer = player; roomCode = code; isHost = true; roomIsPrivate = !!isPrivate;
    setLoading('btn-create', false);
    showRoom(code);
  });

  socket.on('room:joined', ({ code, player }) => {
    myPlayer = player; roomCode = code; isHost = false; roomIsPrivate = false;
    setLoading('btn-join',   false);
    setLoading('btn-create', false);
    showRoom(code);
  });

  socket.on('room:update', (room) => {
    players = room.players;
    renderPlayers(room);
    updateStartBtn(room);
  });

  // Cuenta atrás cuando llegan 6 jugadores
  socket.on('game:countdown', ({ seconds }) => showCountdown(seconds));

  socket.on('game:start', ({ roomCode: rc }) => {
    const code = rc || roomCode;
    goTo(`trivial-online-juego.html?room=${code}&player=${encodeURIComponent(myPlayer.name)}&host=${isHost}`);
  });
}

// Conectar en modo solo-lectura para ver salas (sin entrar a ninguna aún)
function connectReadonly() {
  if (socket && socket.connected) return;
  socket = io(SERVER, { transports: ['polling'], reconnection: true, timeout: 8000 });
  socket.on('connect',       ()     => { setStatus('Conectado al servidor', true); socket.emit('rooms:list'); });
  socket.on('disconnect',    ()     => setStatus('Reconectando...', false));
  socket.on('connect_error', ()     => setStatus('Sin conexión al servidor', false));
  socket.on('rooms:list',    (list) => renderRoomsList(list));
  socket.on('room:created', ({ code, player, isPrivate }) => { myPlayer = player; roomCode = code; isHost = true; roomIsPrivate = !!isPrivate; setLoading('btn-create', false); showRoom(code); });
  socket.on('room:joined',  ({ code, player }) => { myPlayer = player; roomCode = code; isHost = false; roomIsPrivate = false; setLoading('btn-join', false); setLoading('btn-create', false); showRoom(code); });
  socket.on('room:update',  (room)  => { players = room.players; renderPlayers(room); updateStartBtn(room); });
  socket.on('game:countdown',({ seconds }) => showCountdown(seconds));
  socket.on('game:start',   ({ roomCode: rc }) => { const code = rc || roomCode; goTo(`trivial-online-juego.html?room=${code}&player=${encodeURIComponent(myPlayer.name)}&host=${isHost}`); });
  socket.on('error',        ({ msg }) => showMsg(msg, 'error'));
}

window.addEventListener('DOMContentLoaded', () => { loadWins(); connectReadonly(); });

// ── ACCIONES ──────────────────────────────────────────────────────────────────
function selectCreateTab(mode) {
  createTabMode = mode;
  el('tab-public').classList.toggle('active', mode === 'public');
  el('tab-private').classList.toggle('active', mode === 'private');
  el('btn-create-label').textContent = mode === 'private' ? '🔒 Crear sala privada' : '+ Crear sala pública';
}

function createRoom() {
  const name      = el('player-name').value.trim();
  const isPrivate = createTabMode === 'private';
  if (!name) return showMsg('Introduce tu nombre');
  hideMsg();
  setLoading('btn-create', true);
  initSocket(() => socket.emit('room:create', { playerName: name, tenantId: 'default', isPrivate }));
}

function joinRoomByCard(code) {
  const name = el('player-name').value.trim();
  if (!name) return showMsg('Introduce tu nombre primero');
  hideMsg();
  setLoading('btn-create', true);
  initSocket(() => socket.emit('room:join', { code, playerName: name, tenantId: 'default' }));
}

function joinByCode() {
  const name = el('player-name').value.trim();
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
  myPlayer = null; roomCode = null; isHost = false; roomIsPrivate = false; players = [];
  el('room-private').checked = false;
  updateCreateBtn();
  connectReadonly();
}

// ── UI ────────────────────────────────────────────────────────────────────────
function showRoom(code) {
  setHTML('room-code-display', code);
  el('host-controls').classList.toggle('visible', isHost);
  el('waiting-host').classList.toggle('visible', !isHost);
  el('room-private-badge').style.display = roomIsPrivate ? 'inline-flex' : 'none';
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
      ${isMe       ? '<span class="player-you">Tú</span>'         : ''}
      ${isRoomHost ? '<span class="player-host">Anfitrión</span>' : ''}
    `;
    list.appendChild(row);
  });

  if (room.players.length < 6) {
    const waiting = document.createElement('div');
    waiting.className = 'waiting-row';
    waiting.innerHTML = `<div class="dots"><span></span><span></span><span></span></div> Esperando jugadores (${room.players.length}/6)...`;
    list.appendChild(waiting);
  }
}

function renderRoomsList(list) {
  const container = el('rooms-list');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="rooms-empty">
        <span>No hay salas abiertas</span>
        <small>Crea una nueva para empezar</small>
      </div>`;
    return;
  }

  container.innerHTML = list.map(r => {
    const pct  = (r.players / 6) * 100;
    const full = r.players >= 6;
    return `
      <div class="room-card ${full ? 'room-full' : ''}">
        <div class="room-card-info">
          <span class="room-card-code">${r.code}</span>
          <span class="room-card-count">${r.players}/6 jugadores</span>
          <div class="room-card-bar"><div class="room-card-fill" style="width:${pct}%"></div></div>
        </div>
        ${full
          ? '<span class="room-card-label-full">Llena</span>'
          : `<button class="btn-join-card" onclick="joinRoomByCard('${r.code}')">Unirse →</button>`
        }
      </div>`;
  }).join('');
}

function showCountdown(total) {
  const overlay = el('countdown-overlay');
  const numEl   = el('countdown-num');
  overlay.classList.add('visible');
  let n = total;
  numEl.textContent = n;
  const iv = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(iv); return; }
    numEl.textContent = n;
    numEl.classList.remove('pop');
    void numEl.offsetWidth; // reflow
    numEl.classList.add('pop');
  }, 1000);
}

function updateStartBtn(room) {
  el('btn-start').classList.toggle('ready', room.players.length >= 1);
  const note = el('min-note');
  if (note) note.style.display = 'none';
}

function toggleCodePanel() {
  const panel = el('code-panel');
  panel.classList.toggle('open');
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

// Auto uppercase en código
window.addEventListener('DOMContentLoaded', () => {
  const jc = el('join-code');
  if (jc) jc.addEventListener('input', function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
});
