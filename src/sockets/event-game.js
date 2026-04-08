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

const CUSTOM_CAT_COLORS = ['#e67e22','#1abc9c','#9b59b6','#e74c3c','#2980b9','#f39c12','#16a085','#8e44ad'];

function buildWheelFromQuestions(eventQuestions) {
  let usedCatIds = [...new Set(eventQuestions.map(q => q.cat).filter(Boolean))];
  if (!usedCatIds.length) usedCatIds = ALL_NORMAL_CATS.map(c => c.id);
  let customColorIdx = 0;
  return usedCatIds.map(id => {
    const known = ALL_NORMAL_CATS.find(c => c.id === id);
    if (known) return known;
    // Custom category — assign a color from the palette
    const color = CUSTOM_CAT_COLORS[customColorIdx++ % CUSTOM_CAT_COLORS.length];
    // Capitalise first letter for display
    const name  = id.charAt(0).toUpperCase() + id.slice(1);
    return { id, name, color, emoji: '🎯' };
  });
}

function getCatQueue(room, catId) {
  if (!room.catQueues)     room.catQueues     = {};
  if (!room.catLastUsed)   room.catLastUsed   = {};
  const questions = (room.eventQuestions || []).filter(q => q.cat === catId);
  if (!questions.length) return null;
  // Only fill the queue once — when it runs out, keep returning the last used question
  if (!room.catQueues[catId]) {
    room.catQueues[catId] = shuffleIndices(questions.length);
  }
  return { queue: room.catQueues[catId], questions, lastUsed: room.catLastUsed[catId] ?? null };
}

function pickCategoryFromWheel(room) {
  const cats = room.categories;
  if (!cats || !cats.length) return ALL_NORMAL_CATS[0];
  if (!room.usedCatsRound) room.usedCatsRound = [];

  // Only consider categories that have questions
  const catsWithQuestions = room.eventQuestions && room.eventQuestions.length
    ? cats.filter(c => room.eventQuestions.some(q => q.cat === c.id))
    : cats;
  const pool = catsWithQuestions.length ? catsWithQuestions : cats;

  const uniqueIds = [...new Set(pool.map(c => c.id))];
  let available = uniqueIds.filter(id => !room.usedCatsRound.includes(id));
  if (!available.length) { room.usedCatsRound = []; available = uniqueIds; }
  const pickedId = available[Math.floor(Math.random() * available.length)];
  room.usedCatsRound.push(pickedId);
  return pool.find(c => c.id === pickedId) || pool[0];
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
    timerSeconds: 20,
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
      diff: q.difficulty || 'medio', cat: q.category || null, image_url: q.image_url || null,
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

  console.log(`✅ Evento ${eventId}: ${groups.length} groups, ${players.length} players`);
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
  console.log(`🏆 Ranking global emitido — event ${eventId}, ${ranking.length} players`);
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
    if (lobby.started) { socket.emit('event:error', { msg: 'Event has already started' }); return; }

    let existing = lobby.players.find(p => p.name === playerName);
    if (existing) { existing.id = socket.id; }
    else { lobby.players.push({ id: socket.id, name: playerName, score: 0, color: COLORS[lobby.players.length % COLORS.length] }); }

    // Leave old group room if rejoining after finish
    if (socket.data.groupKey) socket.leave('group:' + socket.data.groupKey);
    socket.join('event:' + eid);
    socket.data.eventId  = eid;
    socket.data.groupKey = null;

    socket.emit('event:joined', {
      eventId: eid,
      isHost: lobby.players[0]?.name === playerName,
      player: lobby.players.find(p => p.name === playerName),
      totalPlayers: lobby.players.length,
      players: lobby.players,
    });

    io.to('event:' + eid).emit('event:lobbyUpdate', { players: lobby.players, totalPlayers: lobby.players.length });
    io.to('event:' + eid).emit('chat:system', { message: `${playerName} joined (${lobby.players.length} players)` });
    // Notificar al admin cuántos jugadores hay en el lobby
    io.to('admin:events').emit('admin:eventStatus', {
      eventId: eid, players: lobby.players.length,
      state: 'waiting', currentRound: 0, totalRounds: lobby.eventData?.rounds || 6,
    });
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

    const correct = answer.trim().toLowerCase() === room.currentQuestion.a.trim().toLowerCase();
    const diffPts = { easy: 3, medium: 6, hard: 12 };
    const pts     = diffPts[room.currentDifficulty] || 6;

    if (correct) {
      room.scores[socket.id] = (room.scores[socket.id] || 0) + pts;
      player.score = room.scores[socket.id];
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
    if (!lobby) { socket.emit('error', { msg: 'No players in the room yet.' }); return; }
    if (lobby.started) { socket.emit('error', { msg: 'Event already in progress' }); return; }
    if (!lobby.players.length) { socket.emit('error', { msg: 'No players' }); return; }
    lobby.started = true;
    if (!lobby.eventQuestions?.length) lobby.eventQuestions = await loadEventQuestions(eid);
    createGroups(io, eid, lobby);
  });

  socket.on('admin:resetLobby', async ({ eventId }) => {
    const eid = String(eventId);
    const prevData = eventLobbies[eid]?.eventData || {};
    const questions = await loadEventQuestions(eid);
    eventLobbies[eid] = {
      eventId: eid, eventData: prevData, players: [],
      started: false, groups: [], doneGroups: 0, globalScores: {}, eventQuestions: questions,
    };
    io.to('event:' + eid).emit('event:lobbyUpdate', { players: [], totalPlayers: 0 });
    console.log(`🔄 Lobby reset by admin — event ${eid}, ${questions.length} questions reloaded`);
  });

  socket.on('admin:finishEvent', async ({ eventId }) => {
    const eid   = String(eventId);
    const lobby = eventLobbies[eid];

    // Mark all running groups as finished and broadcast — triggers ranking screen on clients
    (lobby?.groups || []).forEach(gk => {
      const room = eventRooms[gk];
      if (room) {
        clearTimeout(room._questionTimer);
        clearTimeout(room._autoAdvanceTimer);
        room.state = 'finished';
        broadcastGroup(io, gk);
      }
    });

    // Emit global ranking — clients will show the ranking screen
    setTimeout(() => emitGlobalRanking(io, eid), 800);

    // Reload fresh questions from DB and reset lobby after ranking is shown
    const questions = await loadEventQuestions(eid);
    const prevData  = lobby?.eventData || {};

    setTimeout(() => {
      eventLobbies[eid] = {
        eventId: eid, eventData: prevData, players: [],
        started: false, groups: [], doneGroups: 0, globalScores: {},
        eventQuestions: questions,
      };
      io.to('event:' + eid).emit('event:lobbyUpdate', { players: [], totalPlayers: 0 });
      io.to('admin:events').emit('admin:eventStatus', {
        eventId: eid, players: 0, state: 'waiting', currentRound: 0,
        totalRounds: prevData?.rounds || 6,
      });
      console.log(`✅ Event ${eid} finished by admin — lobby ready for new session`);
    }, 3000);
  });

  socket.on('admin:stopEvent', ({ eventId }) => {
    const eid   = String(eventId);
    const lobby = eventLobbies[eid];
    if (!lobby) return;

    // Stop all running groups
    (lobby.groups || []).forEach(gk => {
      const room = eventRooms[gk];
      if (room) { clearTimeout(room._questionTimer); clearTimeout(room._autoAdvanceTimer); room.state = 'finished'; broadcastGroup(io, gk); }
    });
    setTimeout(() => emitGlobalRanking(io, eid), 1000);

    // Reset lobby so it can be reopened cleanly
    setTimeout(() => {
      eventLobbies[eid] = {
        eventId: eid,
        eventData: lobby.eventData || {},
        players: [],
        started: false,
        groups: [],
        doneGroups: 0,
        globalScores: {},
        eventQuestions: lobby.eventQuestions || [],
      };
      io.to('event:' + eid).emit('event:lobbyUpdate', { players: [], totalPlayers: 0 });
      console.log(`🔄 Event ${eid} lobby reset — ready for new session`);
    }, 3000);
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
      io.to('admin:events').emit('admin:eventStatus', {
        eventId: eid, players: eventLobbies[eid].players.length,
        state: 'waiting', currentRound: 0, totalRounds: eventLobbies[eid].eventData?.rounds || 6,
      });
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


function _loadQuestion(io, room, categoryId, difficulty) {
  let q = null;
  if (room.eventQuestions && room.eventQuestions.length > 0) {
    // Use per-category queue so each category cycles through its own questions
    const catData = getCatQueue(room, categoryId);
    if (catData) {
      if (catData.queue.length > 0) {
        // Still questions left in this category — pick the next one
        const localIdx = catData.queue.shift();
        q = catData.questions[localIdx];
        room.catLastUsed[categoryId] = q;  // remember it
      } else if (catData.lastUsed !== null) {
        // Queue exhausted — repeat the last question shown for this category
        q = catData.lastUsed;
      } else {
        // Edge case: queue empty and no lastUsed (shouldn't happen) — fallback
        q = catData.questions[0];
      }
    } else {
      // Category has no questions at all — fallback to global pool
      if (!room.eventQQueue || room.eventQQueue.length === 0) room.eventQQueue = shuffleIndices(room.eventQuestions.length);
      q = room.eventQuestions[room.eventQQueue.shift()];
    }
  } else {
    const diffMap = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
    q = getUniqueQuestion(room, categoryId, diffMap[difficulty] || 'medio');
  }
  room.currentCategory = categoryId; room.currentDifficulty = difficulty;
  room.currentQuestion = q; room.specialEffect = null;
  room.state = 'question'; room.allAnswers = [];
  broadcastGroup(io, room.groupKey);

  clearTimeout(room._questionTimer);
  room._questionTimer = setTimeout(() => {
    if (room.state !== 'question') return;
    clearTimeout(room._autoAdvanceTimer);
    room.state = 'answer';
    broadcastGroup(io, room.groupKey);
    room._autoAdvanceTimer = setTimeout(() => _advanceRound(io, room), 5000);
  }, 25000);
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
