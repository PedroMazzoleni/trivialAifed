// js/pages/evento-juego.js
// Event Game client — unlimited players, all answer same question, podium at end
// Requires: utils.js, socket.io

const params     = new URLSearchParams(window.location.search);
const EVENT_ID   = params.get('event')  || '';
const MY_NAME    = params.get('player') || 'Player';
const EVENT_TITLE   = decodeURIComponent(params.get('title')    || 'Event');
const EVENT_CAT     = params.get('cat')      || 'mixed';
const EVENT_ROUNDS  = parseInt(params.get('rounds') || '6');

const LETTERS    = ['A','B','C','D'];
const TIME_LIMIT = 15;

let socket, myPlayer, isHost = false, roomState = null;
let timerInterval = null;
let sbCountdown   = null;
let spinAngle     = 0;
let isSpinning    = false;
let iAnswered     = false;

const categories = [
  { id:'sports',  name:'Sports',    color:'#18c25a', emoji:'⚽' },
  { id:'geo',     name:'Geography', color:'#3B9EFF', emoji:'🌍' },
  { id:'culture', name:'Culture',   color:'#f5a623', emoji:'🎭' },
  { id:'history', name:'History',   color:'#e84545', emoji:'📜' },
  { id:'eu',      name:'EU',        color:'#a259ff', emoji:'🇪🇺' },
  { id:'kenya',   name:'Kenya',     color:'#cc2200', emoji:'🦒' },
  { id:'mixed',   name:'Mixed',     color:'#9b59b6', emoji:'🎲' },
  { id:'doble',   name:'x2 Pts',    color:'#FFD700', emoji:'⚡', special:true },
  { id:'robo',    name:'Steal',     color:'#ff4dff', emoji:'💸', special:true },
  { id:'bomba',   name:'Bomb',      color:'#ff6600', emoji:'💣', special:true },
  { id:'skip',    name:'SKIP',      color:'#00e5ff', emoji:'⏭️', special:true },
  { id:'suerte',  name:'Lucky',     color:'#00ff88', emoji:'🍀', special:true },
];

// Dynamic wheel categories — updated from room state so Kenya sub-cats etc. work
let wheelCats = [...categories];

const CAT_BACKGROUNDS = {
  sports:  'images/bg-sport.jpg',
  geo:     'images/bg-geography.jpg',
  culture: 'images/bg-culture.jpg',
  history: 'images/bg-history.jpg',
  eu:      'images/bg-eu.jpg',
  kenya:   'images/bg-kenya.jpg',
};

// ── INIT ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Set lobby header
  el('ev-title-display').textContent = EVENT_TITLE;
  el('ev-meta').innerHTML = `
    <span class="ev-meta-chip">🎡 ${EVENT_CAT === 'mixed' ? 'Mixed' : EVENT_CAT}</span>
    <span class="ev-meta-chip">${EVENT_ROUNDS} rounds</span>
    <span class="ev-meta-chip">Unlimited players</span>
  `;

  drawWheel(categories, 0);
  connectSocket();
});

// ── SOCKET ─────────────────────────────────────────────────────────────────────
function connectSocket() {
  socket = io(SERVER, { transports: ['polling'], reconnection: true, timeout: 8000 });

  socket.on('connect', () => {
    socket.emit('event:join', {
      eventId: EVENT_ID,
      playerName: MY_NAME,
      eventData: {
        title:    EVENT_TITLE,
        category: EVENT_CAT,
        rounds:   EVENT_ROUNDS,
      }
    });
  });

  socket.on('event:joined', ({ isHost: host, player }) => {
    isHost   = host;
    myPlayer = player;
    renderLobbyControls();
  });

  socket.on('event:update', (room) => {
    roomState = room;
    handleUpdate(room);
  });

  socket.on('event:doSpin', ({ catId, diff, extra }) => {
    doSpin(catId, diff, extra);
  });

  socket.on('connect_error', () => {
    el('ev-title-display').textContent = 'Connection error. Please refresh.';
  });

  // ── Grupos ────────────────────────────────────────────────────────────────
  socket.on('event:groupAssigned', ({ groupKey, groupNumber, totalGroups, players }) => {
    addChatMsg('', `⚡ Has sido asignado al Grupo ${groupNumber} de ${totalGroups} (${players.length} jugadores)`, true);
  });

  socket.on('event:lobbyUpdate', ({ players, totalPlayers }) => {
    if (roomState && roomState.state === 'waiting') {
      el('ev-players-count').textContent = totalPlayers;
      el('ev-player-list').innerHTML = players.map(p => `
        <div class="ev-player-row">
          <span class="ev-player-name">${p.name}</span>
          ${p.name === MY_NAME ? '<span class="player-you">You</span>' : ''}
        </div>`).join('');
    }
  });

  // ── Ranking global ────────────────────────────────────────────────────────
  socket.on('event:globalRanking', ({ ranking }) => {
    showGlobalRanking(ranking);
  });

  // ── Chat listeners ────────────────────────────────────────────────────────
  socket.on('chat:message', ({ playerName, message }) => {
    addChatMsg(playerName, message, false);
  });
  socket.on('chat:system', ({ message }) => {
    addChatMsg('', message, true);
  });
}

// ── STATE MACHINE ─────────────────────────────────────────────────────────────
function handleUpdate(room) {
  // Sync wheel categories from server so event-specific sectors (kenya sub-cats etc.) work
  if (room.categories && room.categories.length) wheelCats = room.categories;

  // Update round progress bar
  const pct = ((room.currentRound - 1) / room.totalRounds) * 100;
  el('ev-progress-fill').style.width = pct + '%';

  switch (room.state) {
    case 'waiting': showScreen('lobby'); renderLobby(room); break;
    case 'spinning': showScreen('spin');  renderSpin(room);  break;
    case 'question': showScreen('question'); renderQuestion(room); break;
    case 'answer':   showScreen('scoreboard'); renderScoreboard(room); break;
    case 'finished': showScreen('results');    renderResults(room);   break;
  }

  el('ev-progress-bar').style.display = room.state !== 'waiting' ? 'block' : 'none';
}

// ── LOBBY ─────────────────────────────────────────────────────────────────────
function renderLobby(room) {
  const players = room.players || [];
  el('ev-players-count').textContent = players.length;
  el('ev-player-list').innerHTML = players.map(p => `
    <div class="ev-player-row">
      <div class="ev-player-dot" style="background:${p.color}"></div>
      <span class="ev-player-name">${p.name}</span>
      ${p.name === MY_NAME ? '<span class="player-you">You</span>' : ''}
      ${p.id === room.host ? '<span class="player-host" style="font-size:10px;color:var(--muted);font-family:var(--font-cond);font-weight:700;letter-spacing:1px;text-transform:uppercase">Host</span>' : ''}
    </div>
  `).join('');
  renderLobbyControls();
}

function renderLobbyControls() {
  // Start button removed — admin controls game start from admin panel
  el('btn-ev-start').style.display  = 'none';
  el('ev-guest-wait').style.display = 'block';
  el('ev-guest-wait').innerHTML = `
    <div class="dots"><span></span><span></span><span></span></div>
    Esperando a que el administrador inicie el evento...
  `;
}

function startEventGame() {
  if (socket) socket.emit('event:start');
}

// ── SPIN ──────────────────────────────────────────────────────────────────────
function renderSpin(room) {
  el('ev-spin-round').textContent = `Round ${room.currentRound} / ${room.totalRounds}`;
  renderMiniScores(room, 'mini-scores-spin');
  drawWheel(wheelCats, spinAngle);
  el('cat-reveal').classList.remove('show');
}

function doSpin(catId, diff, extra) {
  if (isSpinning) return;
  isSpinning = true;
  iAnswered  = false;

  const cat    = wheelCats.find(c => c.id === catId);
  if (!cat) { isSpinning = false; return; }

  const n      = wheelCats.length;
  const catIdx = wheelCats.findIndex(c => c.id === catId);
  const slice  = (2 * Math.PI) / n;

  const targetOffset = Math.PI / 2 - catIdx * slice - slice / 2;
  const tgtMod = ((targetOffset % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const curMod = ((spinAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const residual = ((tgtMod - curMod) + Math.PI * 2) % (Math.PI * 2);
  const safeResidual = residual < 0.01 ? Math.PI * 2 : residual;
  const totalDelta = Math.floor(extra || 6) * Math.PI * 2 + safeResidual;
  const finalAngle = spinAngle + totalDelta;

  const DUR      = 5500;
  const startAng = spinAngle;
  const startTime = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 5);
  let lastSector = -1;

  function frame(now) {
    const t     = Math.min((now - startTime) / DUR, 1);
    spinAngle   = startAng + totalDelta * ease(t);
    const mod   = ((spinAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sec   = Math.floor(mod / slice) % n;
    if (sec !== lastSector) { lastSector = sec; }
    drawWheel(wheelCats, spinAngle);
    if (t < 1) { requestAnimationFrame(frame); return; }
    isSpinning = false;
    drawWheel(wheelCats, spinAngle, catId);
    _bounceReveal(catId, cat);
  }
  requestAnimationFrame(frame);
}

function _bounceReveal(catId, cat) {
  const BOUNCE_ANGLE = 0.035;
  const BOUNCE_DUR   = 400;
  const baseAngle    = spinAngle;
  const bounceStart  = performance.now();

  function bounceFrame(now) {
    const t   = Math.min((now - bounceStart) / BOUNCE_DUR, 1);
    const osc = Math.sin(t * Math.PI) * BOUNCE_ANGLE * (1 - t * 0.6);
    drawWheel(wheelCats, baseAngle - osc, catId);
    if (t < 1) { requestAnimationFrame(bounceFrame); return; }
    drawWheel(wheelCats, baseAngle, catId);
    // Show reveal
    const reveal = el('cat-reveal');
    reveal.style.background  = hexToRgba(cat.color, 0.15);
    reveal.style.borderColor = hexToRgba(cat.color, 0.6);
    reveal.style.color       = cat.color;
    el('cat-reveal-name').textContent = cat.name.toUpperCase();
    reveal.classList.add('show');
    setTimeout(() => reveal.classList.remove('show'), 2200);
  }
  requestAnimationFrame(bounceFrame);
}

// ── QUESTION ──────────────────────────────────────────────────────────────────
function renderQuestion(room) {
  const q   = room.currentQuestion;
  const cat = wheelCats.find(c => c.id === room.currentCategory);

  // Background
  const bgEl = el('screen-question');
  const bg   = CAT_BACKGROUNDS[room.currentCategory] || 'images/bg-ia.png';
  bgEl.style.backgroundImage    = `url('${bg}')`;
  bgEl.style.backgroundSize     = 'cover';
  bgEl.style.backgroundPosition = 'center';

  el('q-counter').textContent = `Round ${room.currentRound} / ${room.totalRounds}`;
  el('q-cat').textContent     = cat ? cat.name : '—';
  el('q-text').textContent    = q ? q.q : '—';

  const me = room.players.find(p => p.name === MY_NAME);
  el('my-score-hud').textContent = `${me ? me.score : 0} pts`;

  // Options
  const alreadyAnswered = room.allAnswers && room.allAnswers.find(a => a.playerName === MY_NAME);
  const grid = el('q-options');
  grid.innerHTML = '';

  if (q) {
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    shuffled.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      const letter = document.createElement('span');
      letter.className = 'opt-letter';
      letter.textContent = LETTERS[i];
      btn.appendChild(letter);
      btn.appendChild(document.createTextNode(opt.trim()));

      if (alreadyAnswered || iAnswered) {
        btn.disabled = true;
        if (opt.trim() === q.a.trim()) btn.classList.add('correct');
        else if (alreadyAnswered && alreadyAnswered.answer.trim() === opt.trim() && opt.trim() !== q.a.trim()) btn.classList.add('wrong');
      } else {
        btn.onclick = () => submitAnswer(opt.trim(), q.a.trim(), shuffled);
      }
      grid.appendChild(btn);
    });
  }

  // Feedback
  if (alreadyAnswered) {
    const fb = el('q-feedback');
    fb.className = `q-feedback show ${alreadyAnswered.correct ? 'correct-fb' : 'wrong-fb'}`;
    el('fb-title').textContent = alreadyAnswered.correct ? 'Correct!' : 'Wrong';
    el('fb-detail').textContent = alreadyAnswered.correct ? '' : `Correct answer: ${q ? q.a : ''}`;
  } else {
    el('q-feedback').className = 'q-feedback';
  }

  // Waiting indicator
  const waitEl = el('q-waiting');
  waitEl.className = alreadyAnswered || iAnswered ? 'q-waiting show' : 'q-waiting';
  el('q-waiting-text').textContent = 'Waiting for other players...';

  // Answered dots
  renderAnsweredDots(room);

  // Timer
  clearInterval(timerInterval);
  if (!alreadyAnswered && !iAnswered) {
    let t = TIME_LIMIT;
    updateTimer(t);
    timerInterval = setInterval(() => {
      t--;
      updateTimer(t);
      if (t <= 0) {
        clearInterval(timerInterval);
        if (!iAnswered) submitAnswer('', q ? q.a : '');
      }
    }, 1000);
  }
}

function renderAnsweredDots(room) {
  const players = room.players || [];
  const answers = room.allAnswers || [];
  const answeredIds = new Set(answers.map(a => a.playerName));

  el('ev-answered-text').textContent = `${answers.length} / ${players.length} answered`;
  el('ev-answered-dots').innerHTML = players.map(p => {
    const done  = answeredIds.has(p.name);
    const isMe  = p.name === MY_NAME;
    return `<div class="ev-answered-dot ${done ? (isMe ? 'me-done' : 'done') : ''}" title="${p.name}" style="background:${done ? p.color : 'transparent'};border-color:${done ? p.color : 'rgba(255,255,255,0.2)'}"></div>`;
  }).join('');
}

function submitAnswer(answer, correctA, _shuffled) {
  if (iAnswered) return;
  iAnswered = true;
  clearInterval(timerInterval);

  const isCorrect = answer.trim() !== '' && answer.trim() === correctA.trim();

  // Visual feedback on buttons
  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.disabled = true;
    const txt = btn.textContent.replace(/^[A-D]/, '').trim();
    if (txt === correctA.trim()) btn.classList.add('correct');
    else if (txt === answer.trim() && !isCorrect) btn.classList.add('wrong');
  });

  const fb = el('q-feedback');
  fb.className = `q-feedback show ${isCorrect ? 'correct-fb' : 'wrong-fb'}`;
  el('fb-title').textContent  = isCorrect ? 'Correct!' : (answer === '' ? 'Time\'s up!' : 'Wrong');
  el('fb-detail').textContent = isCorrect ? '' : `Correct answer: ${correctA}`;
  el('q-waiting').className   = 'q-waiting show';

  socket.emit('event:answer', { answer: answer.trim() });
}

function updateTimer(t) {
  const fill = el('timer-fill');
  fill.style.width      = `${(t / TIME_LIMIT) * 100}%`;
  fill.style.background = t <= 5 ? '#e84545' : t <= 10 ? '#f5a623' : 'var(--blue)';
  el('timer-num').textContent = t;
}

// ── SCOREBOARD ────────────────────────────────────────────────────────────────
function renderScoreboard(room) {
  clearInterval(timerInterval);
  clearInterval(sbCountdown);

  const q       = room.currentQuestion;
  const answers = room.allAnswers || [];
  const players = room.players || [];
  const sorted  = [...players].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0] ? sorted[0].score : 1;

  // Round info
  el('sb-round').textContent = `Ronda ${room.currentRound} de ${room.totalRounds}`;
  const remaining = room.totalRounds - room.currentRound;
  el('sb-sub').textContent   = remaining > 0 ? `Quedan ${remaining} ronda${remaining !== 1 ? 's' : ''}` : 'Última ronda';

  // Banner: show correct answer
  const banner = el('sb-banner');
  banner.className = 'sb-answer-banner correct';
  el('sb-icon').textContent          = '✓';
  el('sb-banner-title').textContent  = 'Round complete';
  el('sb-banner-detail').textContent = q ? `Correct answer: ${q.a}` : '—';

  // Scores with answer indicators
  el('sb-list').innerHTML = sorted.map((p, i) => {
    const barW  = maxScore > 0 ? Math.round((p.score / maxScore) * 100) : 0;
    const ans   = answers.find(a => a.playerName === p.name);
    const indicator = ans
      ? `<span style="font-size:13px;margin-left:4px">${ans.correct ? '✓' : '✗'}</span>`
      : `<span style="font-size:11px;color:rgba(255,255,255,0.3);margin-left:4px">—</span>`;
    const isMe = p.name === MY_NAME;
    return `
      <div class="sb-row ${i===0?'leader':''} ${isMe?'is-me':''}" style="--bar:${barW}%">
        <div class="sb-pos ${i===0?'first':''}">${i+1}</div>
        <div class="sb-dot" style="background:${p.color}"></div>
        <span class="sb-name">${p.name} ${indicator}</span>
        ${isMe ? '<span class="sb-you">You</span>' : ''}
        <span class="sb-score" style="color:${p.color}">${p.score}</span>
      </div>`;
  }).join('');

  // Admin controls next round — no button for players
  el('sb-btn-next').style.display = 'none';

  // Simple countdown display — server controls actual timing
  let t = 5;
  el('sb-fill').style.width      = '100%';
  el('sb-fill').style.transition = 'none';
  el('sb-countdown-text').textContent = `Siguiente en ${t}s...`;

  clearInterval(sbCountdown);
  sbCountdown = setInterval(() => {
    t--;
    el('sb-fill').style.transition = 'width 1s linear';
    el('sb-fill').style.width      = `${Math.max(0, (t / 5)) * 100}%`;
    el('sb-countdown-text').textContent = t > 0 ? `Siguiente en ${t}s...` : 'Cargando...';
    if (t <= 0) clearInterval(sbCountdown);
  }, 1000);
}

function hostNextRound() {
  clearInterval(sbCountdown);
  if (socket) socket.emit('event:nextRound');
}

// ── RESULTS / PODIUM ─────────────────────────────────────────────────────────
function renderResults(room) {
  clearInterval(timerInterval);
  clearInterval(sbCountdown);

  const sorted = [...(room.players||[])].sort((a, b) => b.score - a.score);
  const medals = ['🥇','🥈','🥉'];
  const rankClasses = ['gold','silver','bronze'];

  el('ev-podium-sub').textContent = sorted[0]
    ? `${sorted[0].name} wins with ${sorted[0].score} points!`
    : 'Game over';

  el('ev-podium-list').innerHTML = sorted.map((p, i) => `
    <div class="ev-podium-row" style="animation-delay:${i*0.07}s">
      <div class="ev-podium-rank ${rankClasses[i]||''}">${medals[i]||i+1}</div>
      <div class="ev-podium-dot" style="background:${p.color}"></div>
      <span class="ev-podium-name">${p.name}</span>
      ${p.name === MY_NAME ? '<span class="ev-podium-you">You</span>' : ''}
      <span class="ev-podium-score" style="color:${p.color}">${p.score}</span>
    </div>
  `).join('');
}

// ── MINI SCORES ───────────────────────────────────────────────────────────────
function renderMiniScores(room, containerId) {
  const sorted = [...(room.players||[])].sort((a, b) => b.score - a.score);
  const el_c = el(containerId);
  if (!el_c) return;
  el_c.innerHTML = sorted.map(p => `
    <div class="mini-score-chip">
      <div class="dot" style="background:${p.color}"></div>
      <span style="font-size:12px">${p.name}</span>
      <span class="mini-score-pts">${p.score}</span>
    </div>
  `).join('');
}

// ── WHEEL DRAW (same as online-juego.js) ─────────────────────────────────────
function drawWheel(cats, angle, highlightId = null) {
  const canvas = el('wheel-canvas');
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const cx = W/2, cy = H/2;
  const r  = W/2 - 6;
  const n  = cats.length;
  const slice = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);

  cats.forEach((cat, i) => {
    const s = -Math.PI/2 + i*slice;
    const e = s + slice;
    const highlight = highlightId === cat.id;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, highlight ? r+5 : r, s, e);
    ctx.closePath();
    if (highlight) {
      const grad = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r+5);
      grad.addColorStop(0, lightenColor(cat.color, 80));
      grad.addColorStop(1, cat.color);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = cat.color;
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const mid    = s + slice/2;
    const emojiR = r * 0.70;
    const nameR  = r * 0.42;
    const emojiSz = Math.max(11, Math.min(18, Math.floor(r * slice / 2.4)));
    const nameSz  = Math.max(7,  Math.min(11, Math.floor(r * slice / 4)));

    ctx.save();
    ctx.translate(cx + Math.cos(mid)*emojiR, cy + Math.sin(mid)*emojiR);
    ctx.rotate(mid + Math.PI/2);
    ctx.font = `${emojiSz}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(cat.emoji || '', 0, 0);
    ctx.restore();

    const shortName = cat.name.length > 6 ? cat.name.slice(0,6) : cat.name;
    ctx.save();
    ctx.translate(cx + Math.cos(mid)*nameR, cy + Math.sin(mid)*nameR);
    ctx.rotate(mid + Math.PI/2);
    ctx.font = `bold ${nameSz}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(shortName.toUpperCase(), 0, 0);
    ctx.restore();
  });

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(45,125,210,0.6)';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI*2);
  ctx.fillStyle = '#0d1130';
  ctx.fill();
  ctx.strokeStyle = 'rgba(45,125,210,0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function lightenColor(hex, amount = 60) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amount);
  return `rgb(${r},${g},${b})`;
}

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(100,100,100,${alpha})`;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function goToEvents() { goTo('trivial-eventos.html'); }
function goHome()     { goTo('trivial-modos.html'); }

// ── RANKING GLOBAL ────────────────────────────────────────────────────────────
function showGlobalRanking(ranking) {
  clearInterval(timerInterval);
  clearInterval(sbCountdown);
  showScreen('global-ranking');

  const myEntry = ranking.find(p => p.name === MY_NAME);
  const myPos   = myEntry ? myEntry.position : ranking.length;
  const myScore = myEntry ? myEntry.score : 0;
  const top10   = ranking.slice(0, 10);

  // Cabecera personal
  const grHeader = el('gr-my-result');
  if (grHeader) {
    if (myPos <= 10) {
      const medals = ['🥇','🥈','🥉'];
      grHeader.innerHTML = `
        <div class="gr-my-pos top">${medals[myPos-1] || '#' + myPos}</div>
        <div class="gr-my-name">${MY_NAME}</div>
        <div class="gr-my-score">${myScore} pts</div>`;
      grHeader.className = 'gr-my-result top10';
    } else {
      grHeader.innerHTML = `
        <div class="gr-my-text">Has acabado en el puesto <strong>#${myPos}</strong> con <strong>${myScore} puntos</strong></div>`;
      grHeader.className = 'gr-my-result outside';
    }
  }

  // Top 10
  const list = el('gr-top10-list');
  if (list) {
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = top10.map((p, i) => {
      const isMe   = p.name === MY_NAME;
      const medal  = medals[i] || '';
      // Detectar empates
      const tied   = top10.filter(x => x.score === p.score).length > 1;
      return `
        <div class="gr-row ${isMe ? 'is-me' : ''} ${tied ? 'tied' : ''}">
          <div class="gr-pos">${medal || p.position}</div>
          <div class="gr-name">${p.name} ${isMe ? '<span class="player-you">Tú</span>' : ''}</div>
          ${tied ? '<div class="gr-tied">EMPATE</div>' : ''}
          <div class="gr-score">${p.score} pts</div>
        </div>`;
    }).join('');
  }
}

// ── AUDIO ─────────────────────────────────────────────────────────────────────
const EventAudio = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, type, vol, dur, delay = 0) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      gain.gain.setValueAtTime(0, c.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + dur + 0.05);
    } catch(e) {}
  }
  return {
    chatMsg() { tone(880, 'sine', 0.08, 0.06, 0); tone(1100, 'sine', 0.06, 0.08, 0.05); },
  };
})();

// ── CHAT ──────────────────────────────────────────────────────────────────────
let _chatOpen = false;
let _unread   = 0;

function toggleChat() {
  _chatOpen = !_chatOpen;
  document.getElementById('chat-panel').classList.toggle('collapsed', !_chatOpen);
  if (_chatOpen) {
    _unread = 0;
    const badge = document.getElementById('chat-unread');
    if (badge) badge.style.display = 'none';
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const msg   = (input.value || '').trim();
  if (!msg || !socket) return;
  socket.emit('chat:send', { message: msg, playerName: MY_NAME });
  input.value = '';
}

function addChatMsg(playerName, message, isSystem = false) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const isMe = playerName === MY_NAME;
  const div  = document.createElement('div');

  if (isSystem) {
    div.className = 'chat-msg system';
    div.innerHTML = `<span class="chat-msg-text">${message}</span>`;
  } else {
    div.className = `chat-msg${isMe ? ' is-me' : ''}`;
    div.innerHTML = `
      <span class="chat-msg-name${isMe ? ' me' : ''}">${isMe ? 'Tú' : playerName}</span>
      <span class="chat-msg-text">${message}</span>`;
  }

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;

  if (!isSystem) EventAudio.chatMsg();
  if (!_chatOpen && !isSystem) {
    _unread++;
    const badge = document.getElementById('chat-unread');
    if (badge) { badge.textContent = _unread; badge.style.display = 'inline-flex'; }
  }
}
