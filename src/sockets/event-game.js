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

  // Create 5 sectors of the event category + 5 specials = 10 sectors
  const eventSectors = Array(5).fill(null).map(() => ({ ...cat }));
  return [...eventSectors, ...SPECIAL_CATS_LIST];
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
  socket.on('event:join', ({ eventId, playerName, eventData }) => {
    const eid = String(eventId);

    // Create room if it doesn't exist
    if (!eventRooms[eid]) {
      const td = getTenantData('default');
      const eventCategory = eventData?.category || 'mixed';
      const eventCategories = buildEventCategories(eventCategory);

      eventRooms[eid] = {
        eventId:       eid,
        eventTitle:    eventData?.title    || 'Event',
        eventCategory,
        totalRounds:   eventData?.rounds   || 6,
        categories:    eventCategories,
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
