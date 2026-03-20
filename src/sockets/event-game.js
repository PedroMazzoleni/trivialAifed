// ─── event-game.js ─────────────────────────────────────────────────────────────
// Socket.IO handlers for Event Game mode:
//   - Unlimited players join an event room
//   - Each round: wheel spins (server-side), ALL players answer the same question
//   - Points awarded per correct answer
//   - Podium shown at end

const { getTenantData, getUniqueQuestion, defaultCategories } = require('../store');
const { updateUserStats } = require('../db');

// In-memory event rooms: eventId -> eventRoom
const eventRooms = {};

function getEventRoom(eventId) {
  return eventRooms[String(eventId)] || null;
}

function broadcastEventRoom(io, eventId) {
  const room = getEventRoom(eventId);
  if (!room) return;
  io.to('event:' + eventId).emit('event:update', buildEventPayload(room));
}

function buildEventPayload(room) {
  return {
    eventId:          room.eventId,
    eventTitle:       room.eventTitle,
    eventCategory:    room.eventCategory,
    state:            room.state,
    players:          room.players,
    currentRound:     room.currentRound,
    totalRounds:      room.totalRounds,
    currentCategory:  room.currentCategory,
    currentQuestion:  room.currentQuestion,
    currentDifficulty:room.currentDifficulty,
    specialEffect:    room.specialEffect || null,
    allAnswers:       room.allAnswers || [],
    answeredCount:    (room.allAnswers || []).length,
    spinCatId:        room.spinCatId || null,
    spinExtra:        room.spinExtra || null,
  };
}

// ── Special categories (same as main game) ─────────────────────────────────
const SPECIAL_CATS = ['doble','robo','bomba','skip','suerte'];

function pickRandomCategory(room) {
  // For mixed category events, pick from all normal cats; otherwise use event category
  const eventCat = room.eventCategory;
  const allCats = room.categories || defaultCategories;
  const normalCats = allCats.filter(c => !c.special);

  if (eventCat === 'mixed') {
    // Pick any normal category
    if (!room.usedCatsRound) room.usedCatsRound = [];
    let available = normalCats.filter(c => !room.usedCatsRound.includes(c.id));
    if (!available.length) { room.usedCatsRound = []; available = normalCats; }
    const picked = available[Math.floor(Math.random() * available.length)];
    room.usedCatsRound.push(picked.id);
    return picked;
  } else {
    // Find the specific category
    const found = allCats.find(c => c.id === eventCat);
    return found || normalCats[0];
  }
}

function registerEventGameHandlers(io, socket) {

  // ── Join event room ─────────────────────────────────────────────────────────
  socket.on('event:join', ({ eventId, playerName, eventData }) => {
    const eid = String(eventId);

    // Create room if it doesn't exist
    if (!eventRooms[eid]) {
      const td = getTenantData('default');
      eventRooms[eid] = {
        eventId:       eid,
        eventTitle:    eventData?.title    || 'Event',
        eventCategory: eventData?.category || 'mixed',
        totalRounds:   eventData?.rounds   || 6,
        categories:    td.categories || defaultCategories,
        state:         'waiting',
        players:       [],
        scores:        {},
        currentRound:  1,
        currentQuestion: null,
        currentCategory: null,
        currentDifficulty: null,
        specialEffect: null,
        allAnswers:    [],
        usedQuestions: {},
        usedCatsRound: [],
        host:          null,
        spinCatId:     null,
        spinExtra:     null,
      };
    }

    const room = eventRooms[eid];

    // Add player if not already in
    let existing = room.players.find(p => p.name === playerName);
    if (existing) {
      // Reconnect: update socket id
      const oldId = existing.id;
      existing.id = socket.id;
      if (room.host === oldId) room.host = socket.id;
      if (room.scores[oldId] !== undefined) {
        room.scores[socket.id] = room.scores[oldId];
        delete room.scores[oldId];
      }
    } else {
      const colors = ['#E84545','#3B9EFF','#F5A623','#A259FF','#2ECC71','#FF6B6B','#f5c842','#18c25a','#ff4dff','#00e5ff'];
      const player = {
        id:    socket.id,
        name:  playerName,
        score: 0,
        color: colors[room.players.length % colors.length],
      };
      room.players.push(player);
      room.scores[socket.id] = 0;
    }

    // First player becomes host
    if (!room.host) room.host = socket.id;

    socket.join('event:' + eid);
    socket.data.eventId = eid;

    socket.emit('event:joined', {
      eventId: eid,
      isHost: room.host === socket.id,
      player: room.players.find(p => p.id === socket.id),
    });

    broadcastEventRoom(io, eid);
  });

  // ── Start event game (host only) ────────────────────────────────────────────
  socket.on('event:start', () => {
    const eid  = socket.data.eventId;
    const room = getEventRoom(eid);
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 1) return;

    room.state        = 'spinning';
    room.currentRound = 1;
    room.allAnswers   = [];
    room.usedQuestions = {};
    room.usedCatsRound = [];

    // Server picks the category & spins
    _doSpin(io, room);
  });

  // ── All answer the same question ────────────────────────────────────────────
  socket.on('event:answer', ({ answer }) => {
    const eid  = socket.data.eventId;
    const room = getEventRoom(eid);
    if (!room || room.state !== 'question' || !room.currentQuestion) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Don't allow double answers
    if (room.allAnswers.find(a => a.playerId === socket.id)) return;

    const correct = answer.trim().toLowerCase() === room.currentQuestion.a.trim().toLowerCase();

    if (correct) {
      const diffPts = { easy: 3, medium: 6, hard: 12 };
      let pts = diffPts[room.currentDifficulty] || 6;
      if (room.specialEffect === 'doble') pts *= 2;
      room.scores[socket.id] = (room.scores[socket.id] || 0) + pts;
      player.score = room.scores[socket.id];
    } else if (room.specialEffect === 'bomba') {
      const diffPts = { easy: 3, medium: 6, hard: 12 };
      const penalty = diffPts[room.currentDifficulty] || 6;
      room.scores[socket.id] = Math.max(0, (room.scores[socket.id] || 0) - penalty);
      player.score = room.scores[socket.id];
    }

    room.allAnswers.push({
      playerId:   socket.id,
      playerName: player.name,
      answer,
      correct,
    });

    // Broadcast updated answer count immediately (live progress)
    broadcastEventRoom(io, eid);

    // If ALL players have answered, auto-advance after a short delay
    if (room.allAnswers.length >= room.players.length) {
      clearTimeout(room._autoAdvanceTimer);
      room._autoAdvanceTimer = setTimeout(() => {
        _advanceRound(io, room);
      }, 4000);
    }
  });

  // ── Host manually advances round ────────────────────────────────────────────
  socket.on('event:nextRound', () => {
    const eid  = socket.data.eventId;
    const room = getEventRoom(eid);
    if (!room || room.host !== socket.id) return;
    if (room.state !== 'answer') return;
    clearTimeout(room._autoAdvanceTimer);
    _advanceRound(io, room);
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const eid = socket.data.eventId;
    if (!eid || !eventRooms[eid]) return;
    const room = eventRooms[eid];

    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) {
      delete eventRooms[eid];
      return;
    }
    if (room.host === socket.id) room.host = room.players[0].id;
    broadcastEventRoom(io, eid);
  });
}

// ── Internal: server-side spin ────────────────────────────────────────────────
function _doSpin(io, room) {
  room.state = 'spinning';
  room.allAnswers = [];
  room.specialEffect = null;

  const cat = pickRandomCategory(room);
  const diffs = ['easy', 'medium', 'hard'];
  const diff  = diffs[Math.floor(Math.random() * diffs.length)];
  const extra = 5 + Math.random() * 3;

  room.spinCatId = cat.id;
  room.spinExtra = extra;

  // Broadcast spin command to all clients so they animate the wheel
  io.to('event:' + room.eventId).emit('event:doSpin', {
    catId: cat.id,
    diff,
    extra,
  });

  // After spin animation (~5.5s), load question
  setTimeout(() => {
    _loadQuestion(io, room, cat.id, diff);
  }, 6500);
}

function _loadQuestion(io, room, categoryId, difficulty) {
  const diffMap = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
  const q = getUniqueQuestion(room, categoryId, diffMap[difficulty] || 'medio');

  room.currentCategory   = categoryId;
  room.currentDifficulty = difficulty;
  room.currentQuestion   = q;
  room.specialEffect     = null;
  room.state             = 'question';
  room.allAnswers        = [];

  broadcastEventRoom(io, room.eventId);

  // Auto-advance after 20 seconds (time limit) even if not all answered
  clearTimeout(room._questionTimer);
  room._questionTimer = setTimeout(() => {
    if (room.state === 'question') {
      room.state = 'answer';
      broadcastEventRoom(io, room.eventId);
      // Auto-advance round after 4s
      clearTimeout(room._autoAdvanceTimer);
      room._autoAdvanceTimer = setTimeout(() => _advanceRound(io, room), 4000);
    }
  }, 20000);
}

function _advanceRound(io, room) {
  // Show answer state briefly
  room.state = 'answer';
  broadcastEventRoom(io, room.eventId);

  room.currentRound++;

  if (room.currentRound > room.totalRounds) {
    // Game over
    setTimeout(() => {
      room.state = 'finished';
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      sorted.forEach((player, idx) => updateUserStats(player.name, player.score, idx === 0));
      broadcastEventRoom(io, room.eventId);
      // Clean up room after 10 minutes
      setTimeout(() => { delete eventRooms[room.eventId]; }, 600000);
    }, 3000);
    return;
  }

  // Next spin after scoreboard display
  setTimeout(() => {
    room.allAnswers = [];
    room.spinCatId  = null;
    room.spinExtra  = null;
    _doSpin(io, room);
  }, 5000);
}

module.exports = { registerEventGameHandlers };