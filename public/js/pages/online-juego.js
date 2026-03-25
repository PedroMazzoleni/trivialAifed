// pages/online-juego.js
// Requiere: utils.js

// online-juego.js
// SERVER viene de utils.js
const params    = new URLSearchParams(window.location.search);
const ROOM_CODE = params.get('room')   || '';
const MY_NAME   = params.get('player') || 'Jugador';
const IS_HOST   = params.get('host')   === 'true';
const LETTERS   = ['A','B','C','D'];
const TIME_LIMIT = 15;

let socket, roomState, myPlayer;
let isSpinning = false;
let spinAngle  = 0;
let timerInterval;
let sbCountdownInterval = null;

let categories = [
  { id:'sports',  name:'Sports',    color:'#18c25a', emoji:'⚽' },
  { id:'geo',     name:'Geography', color:'#3B9EFF', emoji:'🌍' },
  { id:'culture', name:'Culture',   color:'#f5a623', emoji:'🎭' },
  { id:'history', name:'Historia',  color:'#e84545', emoji:'📜' },
  { id:'eu',      name:'EU',        color:'#a259ff', emoji:'🇪🇺' },
  { id:'doble',   name:'x2 Pts',   color:'#FFD700', emoji:'⚡', special:true },
  { id:'robo',    name:'Robo',      color:'#ff4dff', emoji:'💸', special:true },
  { id:'bomba',   name:'Bomba',     color:'#ff6600', emoji:'💣', special:true },
  { id:'skip',    name:'SKIP',      color:'#00e5ff', emoji:'⏭️', special:true },
  { id:'suerte',  name:'Suerte',    color:'#00ff88', emoji:'🍀', special:true },
];

const CAT_BACKGROUNDS = {
  sports:  'images/bg-sport.jpg',
  geo:     'images/bg-geography.jpg',
  culture: 'images/bg-culture.jpg',
  history: 'images/bg-history.jpg',
  eu:      'images/bg-eu.jpg',
};

// ── AUDIO ─────────────────────────────────────────────────────────────────────
const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, type, vol, dur, delay = 0) {
    try {
      const c   = getCtx();
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

  function noise(vol, dur, delay = 0) {
    try {
      const c   = getCtx();
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src    = c.createBufferSource();
      const gain   = c.createGain();
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      src.buffer = buf;
      src.connect(filter); filter.connect(gain); gain.connect(c.destination);
      gain.gain.setValueAtTime(vol, c.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      src.start(c.currentTime + delay);
      src.stop(c.currentTime + delay + dur + 0.05);
    } catch(e) {}
  }

  return {
    spinTick()       { tone(600, 'square', 0.08, 0.04); },
    spinSlowing()    { tone(400, 'square', 0.1, 0.06); },
    categoryReveal() { tone(523,'sine',0.3,0.12,0); tone(659,'sine',0.3,0.12,0.1); tone(784,'sine',0.35,0.22,0.2); },
    correct()        { tone(523,'sine',0.25,0.15,0); tone(659,'sine',0.25,0.15,0.08); tone(784,'sine',0.28,0.25,0.16); tone(1047,'sine',0.22,0.3,0.28); },
    wrong()          { tone(300,'sawtooth',0.2,0.15,0); tone(220,'sawtooth',0.2,0.2,0.15); },
    timeout()        { tone(880,'square',0.15,0.08,0); tone(440,'square',0.15,0.08,0.1); tone(880,'square',0.15,0.08,0.2); tone(220,'square',0.2,0.3,0.3); },
    scoreboard()     { tone(200,'sine',0.15,0.08,0); tone(400,'sine',0.15,0.08,0.05); tone(600,'sine',0.12,0.12,0.1); },
    countdownTick()  { tone(1000,'square',0.12,0.05); },
    victory()        { [523,659,784,1047,1319].forEach((f,i) => tone(f,'sine',0.25,0.3,i*0.12)); },
    click()          { tone(800,'sine',0.1,0.06); noise(0.05,0.04,0); },
    playerJoin()     { tone(440,'sine',0.15,0.1,0); tone(550,'sine',0.15,0.12,0.08); },
  };
})();

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  drawWheel(categories, 0);
  connectSocket();
});

// ── SOCKET ────────────────────────────────────────────────────────────────────
function connectSocket() {
  socket = io(SERVER, { transports: ['polling'], reconnection: true, timeout: 8000 });

  socket.on('connect', () => {
    socket.emit('room:rejoin', { code: ROOM_CODE, playerName: MY_NAME });
  });

  socket.on('room:update', (room) => {
    roomState = room;
    myPlayer  = room.players.find(p => p.name === MY_NAME);
    handleRoomUpdate(room);
  });

  socket.on('game:doSpin', ({ catId, diff, special, extra }) => {
    if (!roomState) return;
    const cp      = roomState.players[roomState.currentPlayerIdx];
    const isMeTurn = myPlayer && cp && cp.id === myPlayer.id;
    doSpin(catId, diff, special, isMeTurn, extra);
  });

  socket.on('error', (data) => {
    if (data && data.msg && data.msg.includes('Sala no encontrada')) {
      setTimeout(() => { goTo('trivial-lobby.html'); }, 1500);
    }
  });

  socket.on('connect_error', (err) => console.log('❌ Error conexión:', err.message));
  socket.on('disconnect',    (reason) => console.log('🔌 Desconectado:', reason));

  // ── CHAT ──────────────────────────────────────────────────────────────────
  socket.on('chat:message', ({ playerName, message }) => {
    addChatMsg(playerName, message, false);
  });
  socket.on('chat:system', ({ message }) => {
    addChatMsg('', message, true);
  });
}

// ── ROOM UPDATE ───────────────────────────────────────────────────────────────
function handleRoomUpdate(room) {
  if (room.categories && room.categories.length > categories.length) categories = room.categories;
  switch (room.state) {
    case 'waiting':
    case 'lobby':
      showWaiting(room);
      setTimeout(() => {
        if (roomState && (roomState.state === 'lobby' || roomState.state === 'waiting')) {
          socket.emit('room:rejoin', { code: ROOM_CODE, playerName: MY_NAME });
        }
      }, 2000);
      break;
    case 'spinning': showSpin(room);     break;
    case 'question': showQuestion(room); break;
    case 'answer':   showAnswer(room);   break;
    case 'finished': showResults(room);  break;
  }
}

// ── WAITING ───────────────────────────────────────────────────────────────────
function showWaiting(room) {
  showScreen('waiting');
  document.getElementById('wait-players').innerHTML = room.players.map(p => `
    <div class="wait-player">
      <div class="wait-dot" style="background:${p.color}"></div>
      <span class="wait-name">${p.name}</span>
      ${p.name === MY_NAME ? '<span class="wait-you">Tú</span>' : ''}
    </div>
  `).join('');
}

// ── SPIN ─────────────────────────────────────────────────────────────────────
function showSpin(room) {
  showScreen('spin');
  const cp = room.players[room.currentPlayerIdx];
  document.getElementById('turn-name').textContent        = cp ? cp.name : '—';
  document.getElementById('spin-round-badge').textContent = `Ronda ${room.currentRound||1} / ${room.totalRounds||6}`;
  drawWheel(categories, spinAngle);
  document.getElementById('cat-reveal').classList.remove('show');

  const myTurn   = myPlayer && cp && cp.id === myPlayer.id;
  const controls = document.getElementById('spin-controls');
  const waitEl   = document.getElementById('spin-wait');
  const btnSpin  = document.getElementById('btn-spin');

  if (myTurn && !isSpinning) {
    // Mi turno y la ruleta no está girando → mostrar botón
    controls.style.display = 'flex';
    btnSpin.disabled = false;
    waitEl.classList.remove('show');
  } else if (myTurn && isSpinning) {
    // Mi turno pero ya está girando (acabo de pulsar) → mantener oculto
    controls.style.display = 'none';
    waitEl.classList.remove('show');
  } else {
    // No es mi turno
    controls.style.display = 'none';
    waitEl.classList.add('show');
    document.getElementById('spin-wait-text').textContent = `${cp ? cp.name : '—'} está girando...`;
  }

  renderMiniScores(room);
}

function spinWheel() {
  if (isSpinning) return;
  // Deshabilitar botón inmediatamente para evitar doble click
  // pero NO poner isSpinning = true — lo hace doSpin cuando llega game:doSpin
  document.getElementById('btn-spin').disabled = true;
  document.getElementById('spin-controls').style.display = 'none';
  socket.emit('game:startSpin', { catId: null });
}

function doSpin(catId, diff, special, isMeTurn, extra) {
  if (isSpinning) return;
  isSpinning = true;

  const cat = categories.find(c => c.id === catId);
  if (!cat) { isSpinning = false; return; }

  const n      = categories.length;
  const catIdx = categories.findIndex(c => c.id === catId);
  const slice  = (2 * Math.PI) / n;

  // ── Ángulo objetivo (puntero a la DERECHA = 0 rad) ───────────────────────
  // Con ctx.rotate(angle), el sector i tiene su centro en:
  //   angle + (-π/2 + i*slice + slice/2)
  // Para que el centro del sector catIdx quede en 0:
  //   angle = π/2 - catIdx*slice - slice/2
  const targetOffset = Math.PI / 2 - catIdx * slice - slice / 2;
  // Normalizar a 0..2π
  const tgtMod = ((targetOffset % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // ── Ángulo final acumulado ───────────────────────────────────────────────
  // Para que la animación sea continua (sin salto), necesitamos llegar a
  // un valor acumulado cuyo mod 2π sea exactamente tgtMod.
  // Partimos del spinAngle actual y calculamos cuánto hay que avanzar.
  const curMod   = ((spinAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  // Diferencia residual hacia adelante (siempre 0..2π, nunca negativa)
  const residual = ((tgtMod - curMod) + Math.PI * 2) % (Math.PI * 2);
  // Si residual es casi 0 (ya estamos en el target), forzar una vuelta completa
  const safeResidual = residual < 0.01 ? Math.PI * 2 : residual;

  const extraRots  = extra || (5 + Math.random() * 3);
  // totalDelta: vueltas completas + diferencia residual
  // Con esto, finalAngle mod 2π === tgtMod SIEMPRE, sin importar spinAngle
  const totalDelta = Math.floor(extraRots) * Math.PI * 2 + safeResidual;
  // No normalizamos finalAngle — spinAngle sigue siendo acumulado
  const finalAngle = spinAngle + totalDelta;

  // ── Animación ────────────────────────────────────────────────────────────
  const DUR       = 5500;
  const startAng  = spinAngle;
  const startTime = performance.now();
  // easeOutQuint: deceleración muy suave y larga
  const ease = t => 1 - Math.pow(1 - t, 5);

  let lastSector = -1;
  let afId;

  function frame(now) {
    const t     = Math.min((now - startTime) / DUR, 1);
    const eased = ease(t);

    spinAngle = startAng + totalDelta * eased;

    // Tick de sonido al cruzar sector
    const mod = ((spinAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sec = Math.floor(mod / slice) % n;
    if (sec !== lastSector) {
      lastSector = sec;
      if (t < 0.97) Audio.spinTick();
    }

    drawWheel(categories, spinAngle);

    if (t < 1) {
      afId = requestAnimationFrame(frame);
      return;
    }

    // ── Fin: spinAngle === finalAngle, su mod 2π === tgtMod ──────────────
    // NO normalizamos — evita cualquier salto visual
    isSpinning = false;
    drawWheel(categories, spinAngle, catId);
    _bounceReveal(catId, diff, special, isMeTurn, cat);
  }

  afId = requestAnimationFrame(frame);
}

// ── Rebote suave al parar + reveal ───────────────────────────────────────────
function _bounceReveal(catId, diff, special, isMeTurn, cat) {
  const BOUNCE_ANGLE = 0.035; // ~2°
  const BOUNCE_DUR   = 400;
  const baseAngle    = spinAngle; // ángulo acumulado, sin normalizar
  const bounceStart  = performance.now();

  function bounceFrame(now) {
    const t   = Math.min((now - bounceStart) / BOUNCE_DUR, 1);
    // Seno amortiguado: va hacia atrás y vuelve al punto exacto
    const osc = Math.sin(t * Math.PI) * BOUNCE_ANGLE * (1 - t * 0.6);
    drawWheel(categories, baseAngle - osc, catId);
    if (t < 1) { requestAnimationFrame(bounceFrame); return; }

    // Asegurar posición final exacta
    drawWheel(categories, baseAngle, catId);
    Audio.categoryReveal();
    showReveal(cat, diff, special);

    if (isMeTurn) {
      setTimeout(() => {
        socket.emit('game:spinResult', {
          categoryId: catId,
          difficulty:  diff,
          special:     special || null,
        });
      }, 2200);
    }
  }

  requestAnimationFrame(bounceFrame);
}

function showReveal(cat, diff, special) {
  const reveal = document.getElementById('cat-reveal');
  reveal.style.background  = hexToRgba(cat.color, 0.15);
  reveal.style.borderColor = hexToRgba(cat.color, 0.6);
  reveal.style.color       = cat.color;

  let nameText = cat.name.toUpperCase();
  if (special) {
    const specialNames = { doble:'⚡ x2 Puntos', robo:'💸 Robo', bomba:'💣 Bomba', skip:'⏭️ SKIP', suerte:'🍀 Suerte' };
    nameText = specialNames[special] || cat.name.toUpperCase();
  }
  document.getElementById('cat-reveal-name').textContent = nameText;

  let badge = document.getElementById('cat-diff-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'cat-diff-badge';
    badge.style.cssText = 'font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:2px;margin-top:4px;';
    reveal.appendChild(badge);
  }

  if (special) {
    const specialDesc = { doble:'Pregunta vale el doble', robo:'Si aciertas, robas puntos al líder', bomba:'Si fallas pierdes puntos', skip:'Turno perdido', suerte:'+6 puntos gratis 🎉' };
    badge.textContent = specialDesc[special] || '';
    badge.style.background = hexToRgba(cat.color, 0.2);
    badge.style.color = cat.color;
  } else {
    const diffLabel = { easy:'Fácil +3', medium:'Medio +6', hard:'Difícil +12' }[diff] || '';
    const diffColor = { easy:'#18c25a', medium:'#f5a623', hard:'#e84545' }[diff] || '#fff';
    badge.textContent      = diffLabel;
    badge.style.background = hexToRgba(diffColor, 0.2);
    badge.style.color      = diffColor;
  }

  reveal.classList.add('show');
  setTimeout(() => reveal.classList.remove('show'), 2500);
}

// ── WHEEL DRAWING ─────────────────────────────────────────────────────────────
function drawWheel(cats, angle, highlightId = null) {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;

  const W   = canvas.width;
  const H   = canvas.height;
  const ctx = canvas.getContext('2d');
  const cx  = W / 2;
  const cy  = H / 2;
  const r   = W / 2 - 6;
  const n   = cats.length;
  const slice = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, W, H);

  // ── Rotar todo el canvas desde el centro ────────────────────────────────
  // Más eficiente que recalcular cada sector individualmente
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);

  cats.forEach((cat, i) => {
    const s         = -Math.PI / 2 + i * slice;
    const e         = s + slice;
    const highlight = highlightId === cat.id;

    // ── Sector ──────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, highlight ? r + 5 : r, s, e);
    ctx.closePath();

    if (highlight) {
      // Sector ganador: gradiente radial para efecto de brillo
      const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r + 5);
      grad.addColorStop(0, lightenColor(cat.color, 80));
      grad.addColorStop(1, cat.color);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = cat.color;
    }
    ctx.fill();

    // Borde entre sectores
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── Texto (emoji + nombre) ───────────────────────────────────────────
    const mid      = s + slice / 2;
    const emojiR   = r * 0.70;
    const nameR    = r * 0.42;
    const emojiSz  = Math.max(11, Math.min(18, Math.floor(r * slice / 2.4)));
    const nameSz   = Math.max(7,  Math.min(11, Math.floor(r * slice / 4)));

    // Emoji
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * emojiR, cy + Math.sin(mid) * emojiR);
    ctx.rotate(mid + Math.PI / 2);
    ctx.font          = `${emojiSz}px serif`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = '#fff';
    ctx.fillText(cat.emoji || '', 0, 0);
    ctx.restore();

    // Nombre corto
    const shortName = cat.name.length > 6 ? cat.name.slice(0, 6) : cat.name;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * nameR, cy + Math.sin(mid) * nameR);
    ctx.rotate(mid + Math.PI / 2);
    ctx.font         = `bold ${nameSz}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'rgba(255,255,255,0.92)';
    ctx.fillText(shortName.toUpperCase(), 0, 0);
    ctx.restore();
  });

  ctx.restore(); // deshace la rotación global

  // ── Anillo exterior ──────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(45,125,210,0.6)';
  ctx.lineWidth   = 5;
  ctx.stroke();

  // ── Círculo central ──────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1130';
  ctx.fill();
  ctx.strokeStyle = 'rgba(45,125,210,0.8)';
  ctx.lineWidth   = 3;
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

// ── QUESTION ─────────────────────────────────────────────────────────────────
function setCategoryBg(catId) {
  const img = CAT_BACKGROUNDS[catId] || 'images/bg-sport.jpg';
  const el  = document.getElementById('screen-question');
  el.style.backgroundImage    = `url('${img}')`;
  el.style.backgroundSize     = 'cover';
  el.style.backgroundPosition = 'center';
  el.style.backgroundRepeat   = 'no-repeat';
}

function showQuestion(room) {
  showScreen('question');
  const q      = room.currentQuestion;
  const cat    = categories.find(c => c.id === room.currentCategory);
  const cp     = room.players[room.currentPlayerIdx];
  const myTurn = myPlayer && cp && cp.id === myPlayer.id;

  setCategoryBg(room.currentCategory);

  document.getElementById('q-counter').textContent = `Ronda ${room.currentRound||1} / ${room.totalRounds||6}`;

  const catName = cat ? cat.name : '—';
  const specialBadges = { doble:'⚡ DOBLE PUNTOS', robo:'💸 ROBO', bomba:'💣 BOMBA' };
  const specialLabel  = room.specialEffect && specialBadges[room.specialEffect]
    ? `${catName} · ${specialBadges[room.specialEffect]}`
    : catName;
  document.getElementById('q-cat').textContent  = specialLabel;
  document.getElementById('q-text').textContent = q ? q.q : '—';

  const myScore = room.players.find(p => p.name === MY_NAME);
  document.getElementById('my-score-hud').textContent = `${myScore ? myScore.score : 0} pts`;

  const myAnswer     = room.allAnswers && room.allAnswers.find(a => a.playerName === MY_NAME);
  const iHaveAnswered = !!myAnswer;

  const grid = document.getElementById('q-options');
  grid.innerHTML = '';
  if (q) {
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);
    shuffled.forEach((opt, i) => {
      const cleanOpt = opt.trim();
      const btn      = document.createElement('button');
      btn.className  = 'opt-btn';
      const letter   = document.createElement('span');
      letter.className    = 'opt-letter';
      letter.textContent  = LETTERS[i] || String.fromCharCode(65 + i);
      btn.appendChild(letter);
      btn.appendChild(document.createTextNode(cleanOpt));

      if (!myTurn || iHaveAnswered) {
        btn.disabled = true;
        if (iHaveAnswered) {
          if (cleanOpt === q.a.trim()) btn.classList.add('correct');
          else if (myAnswer && cleanOpt === myAnswer.answer.trim() && myAnswer.answer.trim() !== q.a.trim()) btn.classList.add('wrong');
        }
      } else {
        btn.onclick = () => submitAnswer(cleanOpt, q.a);
      }
      grid.appendChild(btn);
    });
  }

  document.getElementById('q-feedback').className = 'q-feedback';

  const waitEl  = document.getElementById('q-waiting');
  const waitTxt = document.getElementById('q-waiting-text');
  waitEl.className = 'q-waiting show';
  if (myTurn && !iHaveAnswered) {
    waitTxt.textContent  = '¡Es tu turno! Responde...';
    waitEl.className     = 'q-waiting';
  } else if (!myTurn) {
    waitTxt.textContent  = `Turno de ${cp ? cp.name : '—'} — espera tu turno`;
  } else {
    waitTxt.textContent  = 'Respuesta enviada, esperando...';
  }

  clearInterval(timerInterval);
  let t = TIME_LIMIT;
  updateTimer(t);
  if (myTurn && !iHaveAnswered) {
    timerInterval = setInterval(() => {
      t--;
      updateTimer(t);
      if (t <= 0) {
        clearInterval(timerInterval);
        submitAnswer('__timeout__', q ? q.a : '');
      }
    }, 1000);
  }
}

function updateTimer(t) {
  const fill = document.getElementById('timer-fill');
  fill.style.width      = `${(t / TIME_LIMIT) * 100}%`;
  fill.style.background = t <= 4 ? '#e84545' : t <= 8 ? '#f5a623' : 'var(--blue)';
  document.getElementById('timer-num').textContent = t;
  if (t <= 5 && t > 0) Audio.countdownTick();
}

function submitAnswer(answer, correctA) {
  clearInterval(timerInterval);
  const cleanAnswer  = (answer || '').trim();
  const cleanCorrect = (correctA || '').trim();
  const isCorrect    = cleanAnswer === cleanCorrect && cleanAnswer !== '';
  if (isCorrect)               Audio.correct();
  else if (answer === '__timeout__') Audio.timeout();
  else                         Audio.wrong();

  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.disabled = true;
    const txt = btn.textContent.replace(/^[A-D]/, '').trim();
    if (txt === cleanCorrect) btn.classList.add('correct');
    else if (txt === cleanAnswer && cleanAnswer !== cleanCorrect) btn.classList.add('wrong');
  });
  setTimeout(() => socket.emit('game:answer', { answer: cleanAnswer }), 400);
}

function showAnswer(room) {
  clearInterval(timerInterval);
  showScoreboard(room);
}

// ── SCOREBOARD ────────────────────────────────────────────────────────────────
function showScoreboard(room) {
  showScreen('scoreboard');
  clearInterval(sbCountdownInterval);
  Audio.scoreboard();

  const la           = room.lastAnswer;
  const q            = room.currentQuestion;
  const cp           = room.players[room.currentPlayerIdx];
  const currentRound = room.currentRound || 1;
  const totalRounds  = room.totalRounds || 6;
  const remaining    = totalRounds - currentRound;

  document.getElementById('sb-round').textContent = `Ronda ${currentRound} de ${totalRounds}`;
  document.getElementById('sb-sub').textContent   = remaining > 0
    ? `Quedan ${remaining} ronda${remaining !== 1 ? 's' : ''}`
    : 'Última ronda';

  const isSkip     = la && la.special === 'skip';
  const isCorrect  = la && la.correct && !isSkip;
  const isSuerte   = la && la.special === 'suerte';
  const diffPtsMap = { easy: 3, medium: 6, hard: 12 };
  const basePts    = diffPtsMap[room.currentDifficulty] || 6;
  const actualPts  = isCorrect ? (room.specialEffect === 'doble' ? basePts * 2 : basePts) : 0;
  const banner     = document.getElementById('sb-banner');

  if (isSkip) {
    banner.className = 'sb-answer-banner wrong';
    document.getElementById('sb-icon').textContent          = '⏭️';
    document.getElementById('sb-banner-title').textContent  = 'SKIP — Turno perdido';
    document.getElementById('sb-banner-detail').textContent = `${cp ? cp.name : '—'} ha perdido su turno`;
    document.getElementById('sb-banner-pts').style.display  = 'none';
  } else if (isSuerte) {
    banner.className = 'sb-answer-banner correct';
    document.getElementById('sb-icon').textContent          = '🍀';
    document.getElementById('sb-banner-title').textContent  = '¡Suerte! +6 puntos';
    document.getElementById('sb-banner-detail').textContent = `${cp ? cp.name : '—'} ha tenido suerte`;
    document.getElementById('sb-banner-pts').textContent    = '+6';
    document.getElementById('sb-banner-pts').style.display  = 'block';
  } else {
    const roboSteal = isCorrect && room.specialEffect === 'robo';
    banner.className = `sb-answer-banner ${isCorrect ? 'correct' : 'wrong'}`;
    document.getElementById('sb-icon').textContent          = isCorrect ? (roboSteal ? '💸' : '+') : '—';
    document.getElementById('sb-banner-title').textContent  = isCorrect ? (roboSteal ? '¡Robo! Puntos robados al líder' : 'Correcto') : 'Incorrecto';
    document.getElementById('sb-banner-detail').textContent = q ? `Respuesta correcta: ${q.a}` : '—';
    document.getElementById('sb-banner-pts').textContent    = isCorrect ? `+${actualPts}` : '';
    document.getElementById('sb-banner-pts').style.display  = isCorrect ? 'block' : 'none';
  }

  const playerList = (room.players && room.players.length > 0)
    ? room.players
    : (roomState && roomState.players ? roomState.players : []);
  const sorted   = [...playerList].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0] ? sorted[0].score : 1;

  document.getElementById('sb-list').innerHTML = sorted.map((p, i) => {
    const isMe     = p.name === MY_NAME;
    const isLeader = i === 0 && p.score > 0;
    const barW     = maxScore > 0 ? Math.round((p.score / maxScore) * 100) : 0;
    const playerAnswer    = room.allAnswers && room.allAnswers.find(a => a.playerName === p.name);
    const answered        = !!playerAnswer;
    const answeredCorrect = playerAnswer && playerAnswer.correct;
    const answerIndicator = answered
      ? `<span style="font-size:13px;margin-left:4px">${answeredCorrect ? '✓' : '✗'}</span>`
      : `<span style="font-size:11px;color:rgba(255,255,255,0.3);margin-left:4px">—</span>`;

    return `
      <div class="sb-row ${isLeader ? 'leader' : ''} ${isMe ? 'is-me' : ''}" style="--bar:${barW}%">
        <div class="sb-pos ${i === 0 ? 'first' : ''}">${i + 1}</div>
        <div class="sb-dot" style="background:${p.color}"></div>
        <span class="sb-name">${p.name} ${answerIndicator}</span>
        ${isMe ? '<span class="sb-you">Tú</span>' : ''}
        <span class="sb-score" style="color:${p.color}">${p.score}</span>
      </div>`;
  }).join('');

  document.getElementById('sb-btn-next').classList.add('visible');

  let t = 5;
  const fill   = document.getElementById('sb-fill');
  const cdText = document.getElementById('sb-countdown-text');
  fill.style.width      = '100%';
  fill.style.transition = 'none';

  sbCountdownInterval = setInterval(() => {
    t--;
    fill.style.transition = 'width 1s linear';
    fill.style.width      = `${(t / 5) * 100}%`;
    cdText.textContent    = t > 0 ? `Siguiente en ${t}s...` : 'Cargando...';
    if (t <= 3 && t > 0) Audio.countdownTick();
    if (t <= 0) {
      clearInterval(sbCountdownInterval);
      proceedNextTurn();
    }
  }, 1000);
}

function proceedNextTurn() {
  clearInterval(sbCountdownInterval);
  isSpinning = false;
  socket.emit('game:nextTurn');
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults(room) {
  clearInterval(timerInterval);
  showScreen('results');
  setTimeout(() => Audio.victory(), 300);

  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const medals = ['🥇','🥈','🥉'];
  const winner = sorted[0];

  document.getElementById('res-title').innerHTML = `<span>${winner ? winner.score : 0}</span> pts`;
  document.getElementById('res-msg').textContent = winner ? `${winner.name} gana la partida` : 'Partida terminada';

  document.getElementById('podium').innerHTML = sorted.map((p, i) => `
    <div class="podium-row">
      <div class="podium-rank ${i === 0 ? 'gold' : ''}">${medals[i] || i+1}</div>
      <div class="podium-dot" style="background:${p.color}"></div>
      <span class="podium-name">${p.name}</span>
      ${p.name === MY_NAME ? '<span class="podium-you">Tú</span>' : ''}
      <span class="podium-pts" style="color:${p.color}">${p.score}</span>
    </div>
  `).join('');

  // Abrir chat al terminar la partida
  setTimeout(() => {
    const panel = document.getElementById('chat-panel');
    if (panel) {
      panel.classList.remove('collapsed');
      _chatOpen = true;
      addChatMsg('', '🏁 ¡Partida terminada! Chatea con tus rivales.', true);
    }
  }, 800);
}

// ── MINI SCORES ───────────────────────────────────────────────────────────────
function renderMiniScores(room) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  document.getElementById('mini-scores').innerHTML = sorted.map(p => `
    <div class="mini-score-chip">
      <div class="dot" style="background:${p.color}"></div>
      <span style="font-size:12px">${p.name}</span>
      <span class="mini-score-pts">${p.score}</span>
    </div>
  `).join('');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
// showScreen viene de utils.js
function _showScreen_unused(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
}

function playAgain() { goTo('trivial-lobby.html'); }
function goHome()    { goTo('trivial-modos.html'); }

// ── CHAT ──────────────────────────────────────────────────────────────────────
let _chatOpen = false;
let _unread   = 0;

function toggleChat() {
  _chatOpen = !_chatOpen;
  document.getElementById('chat-panel').classList.toggle('collapsed', !_chatOpen);
  if (_chatOpen) {
    _unread = 0;
    const badge = document.getElementById('chat-unread');
    badge.style.display = 'none';
    // Scroll to bottom
    const msgs = document.getElementById('chat-messages');
    msgs.scrollTop = msgs.scrollHeight;
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
  const isMe  = playerName === MY_NAME;
  const div   = document.createElement('div');

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

  // Badge si chat está cerrado
  if (!_chatOpen && !isSystem) {
    _unread++;
    const badge = document.getElementById('chat-unread');
    if (badge) { badge.textContent = _unread; badge.style.display = 'inline-flex'; }
  }
}

let muted = false;
function toggleMute() {
  muted = !muted;
  const btn   = document.getElementById('mute-btn');
  if (btn) btn.classList.toggle('muted', muted);
  const onEl  = document.getElementById('mute-icon-on');
  const offEl = document.getElementById('mute-icon-off');
  if (onEl)  onEl.style.display  = muted ? 'none'  : 'block';
  if (offEl) offEl.style.display = muted ? 'block' : 'none';
  Object.keys(Audio).forEach(k => {
    if (typeof Audio[k] === 'function') {
      if (muted) { Audio['_' + k] = Audio[k]; Audio[k] = () => {}; }
      else if (Audio['_' + k]) { Audio[k] = Audio['_' + k]; }
    }
  });
}
