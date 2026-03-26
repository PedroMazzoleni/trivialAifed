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

  // Also notify admin watchers
  io.to('admin:events').emit('admin:eventStatus', {
    eventId:      room.eventId,
    players:      room.players.length,
    state:        room.state,
    currentRound: room.currentRound,
    totalRounds:  room.totalRounds,
  });
}

function buildEventPayload(room) {
  return {
    eventId:          room.eventId,
    eventTitle:       room.eventTitle,
    eventCategory:    room.eventCategory,
    categories:       room.categories,
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

// All available normal categories with their metadata
const ALL_NORMAL_CATS = [
  { id: 'sports',  name: 'Sports',    color: '#18c25a', emoji: '⚽' },
  { id: 'geo',     name: 'Geography', color: '#3B9EFF', emoji: '🌍' },
  { id: 'culture', name: 'Culture',   color: '#f5a623', emoji: '🎭' },
  { id: 'history', name: 'History',   color: '#e84545', emoji: '📜' },
  { id: 'eu',      name: 'EU',        color: '#a259ff', emoji: '🇪🇺' },
  { id: 'kenya',   name: 'Kenya',     color: '#cc2200', emoji: '🦒' },
];

const SPECIAL_CATS_LIST = [
  { id: 'doble',  name: 'x2 Pts', color: '#FFD700', emoji: '⚡', special: true },
  { id: 'robo',   name: 'Robo',   color: '#ff4dff', emoji: '💸', special: true },
  { id: 'bomba',  name: 'Bomba',  color: '#ff6600', emoji: '💣', special: true },
  { id: 'skip',   name: 'SKIP',   color: '#00e5ff', emoji: '⏭️', special: true },
  { id: 'suerte', name: 'Suerte', color: '#00ff88', emoji: '🍀', special: true },
];

/**
 * Build a custom wheel for an event.
 * - If category is 'mixed': use all normal cats + specials (default wheel)
 * - If category is specific (e.g. 'kenya'): replace all normal cat slots
 *   with multiple sectors of that category (5 sectors) + specials
 */
function buildEventCategories(eventCategory) {
  if (!eventCategory || eventCategory === 'mixed') {
    return [...ALL_NORMAL_CATS, ...SPECIAL_CATS_LIST];
  }

  const cat = ALL_NORMAL_CATS.find(c => c.id === eventCategory);
  if (!cat) return [...ALL_NORMAL_CATS, ...SPECIAL_CATS_LIST];

  // Interleave: category, special, category, special...
  const result = [];
  for (let i = 0; i < SPECIAL_CATS_LIST.length; i++) {
    result.push({ ...cat });
    result.push(SPECIAL_CATS_LIST[i]);
  }
  return result; // [Cat, Doble, Cat, Robo, Cat, Bomba, Cat, SKIP, Cat, Suerte]
}

function pickRandomCategory(room) {
  const eventCat  = room.eventCategory;
  const allCats   = room.categories || defaultCategories;
  const normalCats = allCats.filter(c => !c.special);

  if (eventCat === 'mixed') {
    // Pick any normal category avoiding recent repeats
    if (!room.usedCatsRound) room.usedCatsRound = [];
    // Get unique ids of available categories
    const uniqueIds = [...new Set(normalCats.map(c => c.id))];
    let availableIds = uniqueIds.filter(id => !room.usedCatsRound.includes(id));
    if (!availableIds.length) { room.usedCatsRound = []; availableIds = uniqueIds; }
    const pickedId = availableIds[Math.floor(Math.random() * availableIds.length)];
    room.usedCatsRound.push(pickedId);
    return normalCats.find(c => c.id === pickedId) || normalCats[0];
  } else {
    // Specific category event — always return that category
    return normalCats.find(c => c.id === eventCat) || normalCats[0];
  }
}

function registerEventGameHandlers(io, socket) {

  // ── Join event room ─────────────────────────────────────────────────────────
  socket.on('event:join', async ({ eventId, playerName, eventData }) => {
    const eid = String(eventId);

    // Create room if it doesn't exist
    if (!eventRooms[eid]) {
      const eventCategory = eventData?.category || 'mixed';
      const eventCategories = buildEventCategories(eventCategory);

      // Load event questions from DB
      let eventQuestions = [];
      try {
        const { getDB } = require('../db');
        const db = getDB();
        if (db) {
          const result = await db.query(
            'SELECT * FROM event_questions WHERE event_id = $1 ORDER BY id',
            [eid]
          );
          eventQuestions = result.rows.map(q => ({
            q:    q.question,
            a:    q.answer,
            opts: JSON.parse(q.options),
            diff: q.difficulty || 'medio',
          }));
        }
      } catch(e) {
        console.error('Error loading event questions:', e.message);
      }

      eventRooms[eid] = {
        eventId:         eid,
        eventTitle:      eventData?.title    || 'Event',
        eventCategory,
        totalRounds:     eventData?.rounds   || 6,
        categories:      eventCategories,
        eventQuestions,               // preguntas exclusivas del evento
        usedEventQIdx:   [],          // índices ya usados
        state:           'waiting',
        players:         [],
        scores:          {},
        currentRound:    1,
        currentQuestion: null,
        currentCategory: null,
        currentDifficulty: null,
        specialEffect:   null,
        allAnswers:      [],
        usedQuestions:   {},
        usedCatsRound:   [],
        host:            null,
        spinCatId:       null,
        spinExtra:       null,
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

    io.to(String(eid)).emit('chat:system', { message: `${playerName} se ha unido al evento` });
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

    // If ALL players have answered → move to answer state and schedule advance
    if (room.allAnswers.length >= room.players.length) {
      clearTimeout(room._questionTimer);  // cancel the 20s timeout
      clearTimeout(room._autoAdvanceTimer);
      room._questionTimer = null;

      room.state = 'answer';
      broadcastEventRoom(io, eid);

      room._autoAdvanceTimer = setTimeout(() => {
        _advanceRound(io, room);
      }, 5000); // show scoreboard 5s before next round
    }
  });

  // ── Host manually advances round ────────────────────────────────────────────
  socket.on('event:nextRound', () => {
    const eid  = socket.data.eventId;
    const room = getEventRoom(eid);
    if (!room || room.host !== socket.id) return;
    if (room.state !== 'answer') return;
    clearTimeout(room._autoAdvanceTimer);
    clearTimeout(room._questionTimer);
    room._autoAdvanceTimer = null;
    room._questionTimer    = null;
    _advanceRound(io, room);
  });

  // ── Admin controls ───────────────────────────────────────────────────────────
  socket.on('admin:watchEvents', () => {
    socket.join('admin:events');
    // Send current status of all event rooms
    Object.values(eventRooms).forEach(room => {
      socket.emit('admin:eventStatus', {
        eventId:      room.eventId,
        players:      room.players.length,
        state:        room.state,
        currentRound: room.currentRound,
        totalRounds:  room.totalRounds,
      });
    });
  });

  socket.on('admin:startEvent', ({ eventId }) => {
    const room = getEventRoom(eventId);
    if (!room) {
      socket.emit('error', { msg: 'No hay jugadores en la sala todavía. Los jugadores deben unirse primero desde la página de eventos.' });
      return;
    }
    if (room.state !== 'waiting') {
      socket.emit('error', { msg: 'El evento ya está en curso' });
      return;
    }
    if (!room.players.length) {
      socket.emit('error', { msg: 'No hay jugadores en la sala' });
      return;
    }

    room.state         = 'spinning';
    room.currentRound  = 1;
    room.allAnswers    = [];
    room.usedQuestions = {};
    room.usedCatsRound = [];
    _doSpin(io, room);
  });

  socket.on('admin:stopEvent', ({ eventId }) => {
    const room = getEventRoom(eventId);
    if (!room) return;
    clearTimeout(room._questionTimer);
    clearTimeout(room._autoAdvanceTimer);
    room.state = 'finished';
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    sorted.forEach((player, idx) => updateUserStats(player.name, player.score, idx === 0));
    broadcastEventRoom(io, eventId);
    // Notify admins
    io.to('admin:events').emit('admin:eventStatus', {
      eventId, players: room.players.length, state: 'finished',
      currentRound: room.currentRound, totalRounds: room.totalRounds,
    });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  // ── Chat ────────────────────────────────────────────────────────────────
  socket.on('chat:send', ({ message, playerName }) => {
    const eid = socket.data.eventId;
    if (!eid || !message) return;
    const clean = String(message).trim().slice(0, 100);
    if (!clean) return;
    io.to(String(eid)).emit('chat:message', { playerName, message: clean });
  });

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

  // Tell all clients to switch to the spin screen
  broadcastEventRoom(io, room.eventId);

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
  let q = null;

  // Use exclusive event questions if available
  if (room.eventQuestions && room.eventQuestions.length > 0) {
    // Build a shuffled queue if empty or not initialized
    if (!room.eventQQueue || room.eventQQueue.length === 0) {
      const indices = room.eventQuestions.map((_, i) => i);
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      room.eventQQueue = indices;
    }
    const idx = room.eventQQueue.shift();
    q = room.eventQuestions[idx];
  } else {
    // Fallback to general question bank
    const diffMap = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
    q = getUniqueQuestion(room, categoryId, diffMap[difficulty] || 'medio');
  }

  room.currentCategory   = categoryId;
  room.currentDifficulty = difficulty;
  room.currentQuestion   = q;
  room.specialEffect     = null;
  room.state             = 'question';
  room.allAnswers        = [];

  broadcastEventRoom(io, room.eventId);

  // Auto-advance after 20 seconds if not all answered
  clearTimeout(room._questionTimer);
  room._questionTimer = setTimeout(() => {
    if (room.state !== 'question') return; // already advanced
    clearTimeout(room._autoAdvanceTimer);
    room.state = 'answer';
    broadcastEventRoom(io, room.eventId);
    room._autoAdvanceTimer = setTimeout(() => {
      _advanceRound(io, room);
    }, 5000);
  }, 20000);
}

function _advanceRound(io, room) {
  // Guard: only advance from answer state
  if (room.state !== 'answer') return;

  // Clear all pending timers first
  clearTimeout(room._autoAdvanceTimer);
  clearTimeout(room._questionTimer);
  room._autoAdvanceTimer = null;
  room._questionTimer    = null;

  // Check if game is over BEFORE incrementing
  if (room.currentRound >= room.totalRounds) {
    // Last round done — show finished
    room.state = 'finished';
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    sorted.forEach((player, idx) => updateUserStats(player.name, player.score, idx === 0));
    broadcastEventRoom(io, room.eventId);
    // Clean up room after 10 minutes
    setTimeout(() => { delete eventRooms[String(room.eventId)]; }, 600000);
    return;
  }

  // Advance to next round
  room.currentRound++;
  room.allAnswers = [];
  room.spinCatId  = null;
  room.spinExtra  = null;

  // Wait for scoreboard to be visible before spinning
  setTimeout(() => {
    if (room.state !== 'finished') {
      _doSpin(io, room);
    }
  }, 5000);
}

module.exports = { registerEventGameHandlers };
