// ─── event-game.js ─────────────────────────────────────────────────────────────
const { getTenantData, getUniqueQuestion, defaultCategories } = require('../store');
const { updateUserStats } = require('../db');

const eventRooms   = {};  // groupKey -> groupRoom
const eventLobbies = {};  // eventId  -> lobby

const COLORS = ['#E84545','#3B9EFF','#F5A623','#A259FF','#2ECC71','#FF6B6B','#f5c842','#18c25a','#ff4dff','#00e5ff'];

const ALL_NORMAL_CATS = [
  { id: 'sports',  name: 'Sports',    color: '#18c25a', emoji: '⚽' },
  { id: 'geo',     name: 'Geography', color: '#3B9EFF', emoji: '🌍' },
  { id: 'culture', name: 'Culture',   color: '#f5a623', emoji: '🎭' },
  { id: 'history', name: 'History',   color: '#e84545', emoji: '📜' },
  { id: 'eu',      name: 'EU',        color: '#a259ff', emoji: '🇪🇺' },
];

const SPECIAL_CATS_LIST = [
  { id: 'doble',  name: 'x2 Pts', color: '#FFD700', emoji: '⚡', special: true },
  { id: 'robo',   name: 'Robo',   color: '#ff4dff', emoji: '💸', special: true },
  { id: 'bomba',  name: 'Bomba',  color: '#ff6600', emoji: '💣', special: true },
  { id: 'skip',   name: 'SKIP',   color: '#00e5ff', emoji: '⏭️', special: true },
  { id: 'suerte', name: 'Suerte', color: '#00ff88', emoji: '🍀', special: true },
];

function buildWheelFromQuestions(eventQuestions) {
  let usedCatIds = [...new Set(eventQuestions.map(q => q.cat).filter(Boolean))];
  if (!usedCatIds.length) usedCatIds = ALL_NORMAL_CATS.map(c => c.id);
  const normalCats = usedCatIds.map(id => ALL_NORMAL_CATS.find(c => c.id === id) || { id, name: id, color: '#888', emoji: '❓' });
  const result = [];
  for (let i = 0; i < Math.max(normalCats.length, SPECIAL_CATS_LIST.length); i++) {
    result.push({ ...normalCats[i % normalCats.length] });
    if (SPECIAL_CATS_LIST[i]) result.push(SPECIAL_CATS_LIST[i]);
  }
  return result;
}

function pickCategoryFromWheel(room) {
  const normalCats = room.categories.filter(c => !c.special);
  if (!normalCats.length) return room.categories[0];
  if (!room.usedCatsRound) room.usedCatsRound = [];
  const uniqueIds = [...new Set(normalCats.map(c => c.id))];
  let available = uniqueIds.filter(id => !room.usedCatsRound.includes(id));
  if (!available.length) { room.usedCatsRound = []; available = uniqueIds; }
  const pickedId = available[Math.floor(Math.random() * available.length)];
  room.usedCatsRound.push(pickedId);
  return normalCats.find(c => c.id === pickedId) || normalCats[0];
}

function buildGroupPayload(room) {
  return {
    groupKey: room.groupKey, eventId: room.eventId, eventTitle: room.eventTitle,
    categories: room.categories, state: room.state, players: room.players,
    currentRound: room.currentRound, totalRounds: room.totalRounds,
    currentCategory: room.currentCategory, currentQuestion: room.currentQuestion,
    currentDifficulty: room.currentDifficulty, specialEffect: room.specialEffect || null,
    allAnswers: room.allAnswers || [], answeredCount: (room.allAnswers || []).length,
    spinCatId: room.spinCatId || null, spinExtra: room.spinExtra || null,
    timerSeconds: 15,
  };
}

function broadcastGroup(io, groupKey) {
  const room = eventRooms[groupKey];
  if (!room) return;
  io.to('group:' + groupKey).emit('event:update', buildGroupPayload(room));
  const lobby = eventLobbies[room.eventId];
  if (lobby) {
    io.to('admin:events').emit('admin:eventStatus', {
      eventId: room.eventId, players: lobby.players.length,
      state: room.state, currentRound: room.currentRound, totalRounds: room.totalRounds,
    });
  }
}

async function loadEventQuestions(eventId) {
  try {
    const { getDB } = require('../db');
    const db = getDB();
    if (!db) return [];
    const result = await db.query('SELECT * FROM event_questions WHERE event_id = $1 ORDER BY id', [eventId]);
    return result.rows.map(q => ({
      q: q.question, a: q.answer, opts: JSON.parse(q.options),
      diff: q.difficulty || 'medio', cat: q.category || null,
    }));
  } catch(e) { console.error('Error loading event questions:', e.message); return []; }
}

function shuffleIndices(len) {
  const indices = Array.from({ length: len }, (_, i) => i);
  for (let i = len - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function createGroups(io, eventId, lobby) {
  const players = [...lobby.players];
  const MAX = 10;
  const groups = [];
  for (let i = 0; i < players.length; i += MAX) groups.push(players.slice(i, i + MAX));

  lobby.groups = [];
  lobby.doneGroups = 0;
  lobby.globalScores = {};

  const wheel = buildWheelFromQuestions(lobby.eventQuestions);

  groups.forEach((groupPlayers, idx) => {
    const groupKey = `${eventId}_g${idx + 1}`;
    lobby.groups.push(groupKey);

    eventRooms[groupKey] = {
      groupKey, eventId, eventTitle: lobby.eventData.title || 'Event',
      totalRounds: lobby.eventData.rounds || 6,
      categories: wheel, eventQuestions: lobby.eventQuestions,
      eventQQueue: shuffleIndices(lobby.eventQuestions.length),
      state: 'spinning',
      players: groupPlayers.map((p, i) => ({ ...p, score: 0, color: COLORS[i % COLORS.length] })),
      scores: Object.fromEntries(groupPlayers.map(p => [p.id, 0])),
      currentRound: 1, currentQuestion: null, currentCategory: null,
      currentDifficulty: null, specialEffect: null, allAnswers: [],
      usedCatsRound: [], spinCatId: null, spinExtra: null,
      host: groupPlayers[0]?.id || null,
    };

    groupPlayers.forEach(p => {
      const sock = io.sockets.sockets.get(p.id);
      if (sock) {
        sock.leave('event:' + eventId);
        sock.join('group:' + groupKey);
        sock.data.groupKey = groupKey;
        sock.data.eventId  = eventId;
      }
    });

    io.to('group:' + groupKey).emit('event:groupAssigned', {
      groupKey, groupNumber: idx + 1, totalGroups: groups.length,
      players: eventRooms[groupKey].players,
    });

    setTimeout(() => _doSpin(io, eventRooms[groupKey]), 2000);
  });

  console.log(`✅ Evento ${eventId}: ${groups.length} grupos, ${players.length} jugadores`);
}

function computeGlobalRanking(lobby) {
  const allScores = [];
  (lobby.groups || []).forEach(gk => {
    const room = eventRooms[gk];
    if (room) room.players.forEach(p => allScores.push({ name: p.name, score: p.score }));
  });
  Object.entries(lobby.globalScores || {}).forEach(([name, score]) => {
    if (!allScores.find(p => p.name === name)) allScores.push({ name, score });
  });
  allScores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let pos = 1;
  return allScores.map((p, i) => {
    if (i > 0 && p.score < allScores[i - 1].score) pos = i + 1;
    return { ...p, position: pos };
  });
}

function emitGlobalRanking(io, eventId) {
  const lobby = eventLobbies[eventId];
  if (!lobby) return;
  const ranking = computeGlobalRanking(lobby);
  const top10   = ranking.slice(0, 10);
  ranking.forEach((p, i) => updateUserStats(p.name, p.score, i === 0));
  (lobby.groups || []).forEach(gk => io.to('group:' + gk).emit('event:globalRanking', { ranking, top10 }));
  io.to('event:' + eventId).emit('event:globalRanking', { ranking, top10 });
  console.log(`🏆 Ranking global emitido — evento ${eventId}, ${ranking.length} jugadores`);
}

function checkAllGroupsDone(io, eventId) {
  const lobby = eventLobbies[eventId];
  if (!lobby) return;
  const allDone = (lobby.groups || []).every(gk => !eventRooms[gk] || eventRooms[gk].state === 'finished');
  if (allDone) setTimeout(() => emitGlobalRanking(io, eventId), 2000);
}

function registerEventGameHandlers(io, socket) {

  socket.on('event:join', async ({ eventId, playerName, eventData }) => {
    const eid = String(eventId);
    if (!eventLobbies[eid]) {
      const questions = await loadEventQuestions(eid);
      eventLobbies[eid] = {
        eventId: eid, eventData: eventData || {}, players: [],
        started: false, groups: [], doneGroups: 0, globalScores: {}, eventQuestions: questions,
      };
    }
    const lobby = eventLobbies[eid];
    if (lobby.started) { socket.emit('event:error', { msg: 'El evento ya ha comenzado' }); return; }

    let existing = lobby.players.find(p => p.name === playerName);
    if (existing) { existing.id = socket.id; }
    else { lobby.players.push({ id: socket.id, name: playerName, score: 0 }); }

    socket.join('event:' + eid);
    socket.data.eventId  = eid;
    socket.data.groupKey = null;

    socket.emit('event:joined', {
      eventId: eid,
      isHost: lobby.players[0]?.name === playerName,
      player: lobby.players.find(p => p.name === playerName),
      totalPlayers: lobby.players.length,
    });

    io.to('event:' + eid).emit('event:lobbyUpdate', { players: lobby.players, totalPlayers: lobby.players.length });
    io.to('event:' + eid).emit('chat:system', { message: `${playerName} se ha unido (${lobby.players.length} jugadores)` });
  });

  socket.on('event:start', async () => {
    const eid   = socket.data.eventId;
    const lobby = eventLobbies[eid];
    if (!lobby || lobby.started || lobby.players.length < 1) return;
    lobby.started = true;
    if (!lobby.eventQuestions?.length) lobby.eventQuestions = await loadEventQuestions(eid);
    createGroups(io, eid, lobby);
  });

  socket.on('event:answer', ({ answer }) => {
    const groupKey = socket.data.groupKey;
    const room     = groupKey ? eventRooms[groupKey] : null;
    if (!room || room.state !== 'question' || !room.currentQuestion) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || room.allAnswers.find(a => a.playerId === socket.id)) return;

    const correct  = answer.trim().toLowerCase() === room.currentQuestion.a.trim().toLowerCase();
    const diffPts  = { easy: 3, medium: 6, hard: 12 };
    const basePts  = diffPts[room.currentDifficulty] || 6;
    const myWc     = (room.privateWildcards || {})[socket.id] || null;
    let resultMsg  = null;

    if (myWc === 'suerte') {
      // Suerte: siempre +basePts sin importar la respuesta
      room.scores[socket.id] = (room.scores[socket.id] || 0) + basePts;
      player.score = room.scores[socket.id];
      resultMsg = `🍀 ¡Suerte! +${basePts} pts garantizados. Total: ${player.score} pts`;
    } else if (myWc === 'skip') {
      // Skip: sin cambio de puntos
      resultMsg = `⏭️ SKIP activado — sin cambios esta ronda.`;
    } else if (correct) {
      let pts = basePts;
      if (myWc === 'doble') pts *= 2;
      if (myWc === 'robo') {
        // Robar al líder
        const leader = [...room.players].sort((a,b) => b.score - a.score).find(p => p.id !== socket.id);
        const stolen = leader ? Math.min(pts, leader.score) : 0;
        if (leader && stolen > 0) {
          leader.score = leader.score - stolen;
          room.scores[leader.id] = leader.score;
          pts = stolen;
          resultMsg = `💸 ¡Robo exitoso! +${stolen} pts robados. Total: ${(room.scores[socket.id]||0) + pts} pts`;
        }
      }
      room.scores[socket.id] = (room.scores[socket.id] || 0) + pts;
      player.score = room.scores[socket.id];
      if (!resultMsg && myWc === 'doble') resultMsg = `⚡ ¡x2 activado! +${pts} pts. Total: ${player.score} pts`;
    } else {
      // Falló
      if (myWc === 'bomba') {
        room.scores[socket.id] = Math.max(0, (room.scores[socket.id] || 0) - basePts);
        player.score = room.scores[socket.id];
        resultMsg = `💣 ¡Bomba! Fallaste y pierdes ${basePts} pts. Total: ${player.score} pts`;
      }
    }

    // Enviar resultado del comodín solo al jugador afectado
    if (resultMsg) {
      const sock = io.sockets.sockets.get(socket.id);
      if (sock) sock.emit('event:wildcardResult', { message: resultMsg });
    }

    room.allAnswers.push({ playerId: socket.id, playerName: player.name, answer, correct });
    broadcastGroup(io, groupKey);

    if (room.allAnswers.length >= room.players.length) {
      clearTimeout(room._questionTimer);
      clearTimeout(room._autoAdvanceTimer);
      room._questionTimer = null;
      room.state = 'answer';
      broadcastGroup(io, groupKey);
      room._autoAdvanceTimer = setTimeout(() => _advanceRound(io, room), 5000);
    }
  });

  socket.on('event:nextRound', () => {
    const groupKey = socket.data.groupKey;
    const room     = groupKey ? eventRooms[groupKey] : null;
    if (!room || room.state !== 'answer') return;
    clearTimeout(room._autoAdvanceTimer);
    clearTimeout(room._questionTimer);
    _advanceRound(io, room);
  });

  socket.on('admin:watchEvents', () => {
    socket.join('admin:events');
    Object.values(eventLobbies).forEach(lobby => {
      socket.emit('admin:eventStatus', {
        eventId: lobby.eventId, players: lobby.players.length,
        state: lobby.started ? 'playing' : 'waiting',
        currentRound: 0, totalRounds: lobby.eventData?.rounds || 6,
      });
    });
  });

  socket.on('admin:startEvent', async ({ eventId }) => {
    const eid   = String(eventId);
    const lobby = eventLobbies[eid];
    if (!lobby) { socket.emit('error', { msg: 'No hay jugadores en la sala todavía.' }); return; }
    if (lobby.started) { socket.emit('error', { msg: 'El evento ya está en curso' }); return; }
    if (!lobby.players.length) { socket.emit('error', { msg: 'No hay jugadores' }); return; }
    lobby.started = true;
    if (!lobby.eventQuestions?.length) lobby.eventQuestions = await loadEventQuestions(eid);
    createGroups(io, eid, lobby);
  });

  socket.on('admin:stopEvent', ({ eventId }) => {
    const eid   = String(eventId);
    const lobby = eventLobbies[eid];
    if (!lobby) return;
    (lobby.groups || []).forEach(gk => {
      const room = eventRooms[gk];
      if (room) { clearTimeout(room._questionTimer); clearTimeout(room._autoAdvanceTimer); room.state = 'finished'; broadcastGroup(io, gk); }
    });
    setTimeout(() => emitGlobalRanking(io, eid), 1000);
  });

  socket.on('chat:send', ({ message, playerName }) => {
    const groupKey = socket.data.groupKey;
    const eid      = socket.data.eventId;
    if (!message) return;
    const clean   = String(message).trim().slice(0, 100);
    if (!clean) return;
    const channel = groupKey ? 'group:' + groupKey : eid ? 'event:' + eid : null;
    if (channel) io.to(channel).emit('chat:message', { playerName, message: clean });
  });

  socket.on('disconnect', () => {
    const eid      = socket.data.eventId;
    const groupKey = socket.data.groupKey;
    if (eid && eventLobbies[eid] && !eventLobbies[eid].started) {
      eventLobbies[eid].players = eventLobbies[eid].players.filter(p => p.id !== socket.id);
      io.to('event:' + eid).emit('event:lobbyUpdate', { players: eventLobbies[eid].players, totalPlayers: eventLobbies[eid].players.length });
    }
    if (groupKey && eventRooms[groupKey]) {
      const room = eventRooms[groupKey];
      room.players = room.players.filter(p => p.id !== socket.id);
      if (!room.players.length) return;
      if (room.host === socket.id) room.host = room.players[0].id;
      if (room.state !== 'finished') broadcastGroup(io, groupKey);
    }
  });
}

function _doSpin(io, room) {
  if (!room) return;
  room.state = 'spinning'; room.allAnswers = []; room.specialEffect = null;
  const cat   = pickCategoryFromWheel(room);
  const diffs = ['easy', 'medium', 'hard'];
  const diff  = diffs[Math.floor(Math.random() * diffs.length)];
  const extra = 5 + Math.random() * 3;
  room.spinCatId = cat.id; room.spinExtra = extra;
  broadcastGroup(io, room.groupKey);
  io.to('group:' + room.groupKey).emit('event:doSpin', { catId: cat.id, diff, extra });
  setTimeout(() => _loadQuestion(io, room, cat.id, diff), 6500);
}

function _assignPrivateWildcards(io, room) {
  const WILDCARDS = ['doble', 'robo', 'bomba', 'skip', 'suerte'];
  const players   = [...room.players];
  if (!players.length) return;

  // Entre 1 y 3 jugadores al azar (sin repetir)
  const count = Math.min(1 + Math.floor(Math.random() * 3), players.length);
  const shuffled = players.sort(() => Math.random() - 0.5).slice(0, count);

  room.privateWildcards = {}; // socketId -> wildcardId

  shuffled.forEach(player => {
    const wc = WILDCARDS[Math.floor(Math.random() * WILDCARDS.length)];
    room.privateWildcards[player.id] = wc;

    // Notificación privada solo a ese jugador
    const labels = {
      doble:  '⚡ ¡Te ha tocado x2! Si aciertas, ganas el doble de puntos.',
      robo:   '💸 ¡Te ha tocado Robo! Si aciertas, robas puntos al líder.',
      bomba:  '💣 ¡Te ha tocado Bomba! Si fallas, perderás puntos extra.',
      skip:   '⏭️ ¡Te ha tocado SKIP! Esta ronda no suma ni resta nada.',
      suerte: '🍀 ¡Te ha tocado Suerte! Aciertes o no, ganas puntos gratis.',
    };

    const sock = io.sockets.sockets.get(player.id);
    if (sock) sock.emit('event:privateWildcard', { wildcard: wc, message: labels[wc] });
  });
}

function _loadQuestion(io, room, categoryId, difficulty) {
  let q = null;
  if (room.eventQuestions && room.eventQuestions.length > 0) {
    if (!room.eventQQueue || room.eventQQueue.length === 0) room.eventQQueue = shuffleIndices(room.eventQuestions.length);
    q = room.eventQuestions[room.eventQQueue.shift()];
  } else {
    const diffMap = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
    q = getUniqueQuestion(room, categoryId, diffMap[difficulty] || 'medio');
  }
  room.currentCategory = categoryId; room.currentDifficulty = difficulty;
  room.currentQuestion = q; room.specialEffect = null;
  room.state = 'question'; room.allAnswers = [];
  room.privateWildcards = {};
  _assignPrivateWildcards(io, room);
  broadcastGroup(io, room.groupKey);

  clearTimeout(room._questionTimer);
  room._questionTimer = setTimeout(() => {
    if (room.state !== 'question') return;
    clearTimeout(room._autoAdvanceTimer);
    room.state = 'answer';
    broadcastGroup(io, room.groupKey);
    room._autoAdvanceTimer = setTimeout(() => _advanceRound(io, room), 5000);
  }, 15000);
}

function _advanceRound(io, room) {
  if (room.state !== 'answer') return;
  clearTimeout(room._autoAdvanceTimer); clearTimeout(room._questionTimer);
  room._autoAdvanceTimer = null; room._questionTimer = null;

  if (room.currentRound >= room.totalRounds) {
    room.state = 'finished';
    broadcastGroup(io, room.groupKey);
    const lobby = eventLobbies[room.eventId];
    if (lobby) {
      room.players.forEach(p => { lobby.globalScores[p.name] = (lobby.globalScores[p.name] || 0) + p.score; });
      lobby.doneGroups = (lobby.doneGroups || 0) + 1;
      checkAllGroupsDone(io, room.eventId);
    }
    setTimeout(() => { delete eventRooms[room.groupKey]; }, 600000);
    return;
  }

  room.currentRound++;
  room.allAnswers = []; room.spinCatId = null; room.spinExtra = null;
  setTimeout(() => { if (room.state !== 'finished') _doSpin(io, room); }, 1000);
}

module.exports = { registerEventGameHandlers };
