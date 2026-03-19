// ─── game.js ─────────────────────────────────────────────────────────────────
// Todos los eventos Socket.IO del juego: lobby, ruleta, preguntas, puntuación.

const { rooms, defaultCategories, getTenantData, getUniqueQuestion, createRoom } = require('./store');
const { updateUserStats } = require('./db');

// ─── Broadcast helper ────────────────────────────────────────────────────────
function broadcastRoom(io, code) {
  if (!rooms[code]) return;
  const room = rooms[code];
  const payload = {
    code:             room.code,
    state:            room.state,
    players:          room.players,
    categories:       room.categories || defaultCategories,
    currentPlayerIdx: room.currentPlayerIdx,
    currentCategory:  room.currentCategory,
    currentDifficulty:room.currentDifficulty,
    currentQuestion:  room.currentQuestion,
    specialEffect:    room.specialEffect  || null,
    currentRound:     room.currentRound   || 1,
    totalRounds:      room.totalRounds    || 6,
    turnInRound:      room.turnInRound    || 0,
    questionIdx:      room.questionIdx    || 0,
    lastAnswer:       room.lastAnswer     || null,
    allAnswers:       room.allAnswers     || [],
    winner:           room.winner         || null,
  };
  io.to(code).emit('room:update', payload);
}

// ─── Registrar todos los handlers de un socket ───────────────────────────────
function registerGameHandlers(io, socket) {

  // ── Crear sala ──────────────────────────────────────────────────────────────
  socket.on('room:create', ({ tenantId = 'default', playerName }) => {
    const code = createRoom(tenantId);
    const room = rooms[code];
    room.host  = socket.id;
    const player = { id: socket.id, name: playerName, score: 0, color: '#E84545' };
    room.players.push(player);
    room.scores[socket.id] = 0;
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room:created', { code, player });
    broadcastRoom(io, code);
  });

  // ── Unirse a sala ───────────────────────────────────────────────────────────
  socket.on('room:join', ({ code, playerName, tenantId = 'default' }) => {
    const room = rooms[code];
    if (!room)                     return socket.emit('error', { msg: 'Sala no encontrada' });
    if (room.state !== 'lobby')    return socket.emit('error', { msg: 'La partida ya ha comenzado' });
    if (room.players.length >= 6)  return socket.emit('error', { msg: 'Sala llena (máx. 6)' });

    const colors = ['#E84545','#3B9EFF','#F5A623','#A259FF','#2ECC71','#FF6B6B'];
    const player = { id: socket.id, name: playerName, score: 0, color: colors[room.players.length] };
    room.players.push(player);
    room.scores[socket.id] = 0;
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room:joined', { code, player });
    broadcastRoom(io, code);
  });

  // ── Reconectar a sala ───────────────────────────────────────────────────────
  socket.on('room:rejoin', ({ code, playerName }) => {
    console.log('room:rejoin:', code, playerName);
    const room = rooms[code];
    if (!room) {
      console.log('❌ Sala no encontrada:', code);
      return socket.emit('error', { msg: 'Sala no encontrada' });
    }

    let existing = room.players.find(p => p.name === playerName);
    if (existing) {
      const oldId = existing.id;
      existing.id = socket.id;
      if (room.host === oldId) room.host = socket.id;
      if (room.scores[oldId] !== undefined) {
        room.scores[socket.id] = room.scores[oldId];
        delete room.scores[oldId];
      }
      console.log('✅ Reconectado:', playerName);
    } else {
      const colors = ['#18c25a','#3B9EFF','#f5a623','#e84545','#a259ff','#ff6b6b'];
      existing = { id: socket.id, name: playerName, score: 0, color: colors[room.players.length % colors.length] };
      room.players.push(existing);
      room.scores[socket.id] = 0;
      console.log('✅ Nuevo jugador añadido:', playerName);
    }

    socket.join(code);
    socket.data.roomCode = code;

    setTimeout(() => {
      const payload = {
        code:             room.code,
        state:            room.state,
        players:          room.players,
        categories:       room.categories || defaultCategories,
        currentPlayerIdx: room.currentPlayerIdx,
        currentCategory:  room.currentCategory,
        currentDifficulty:room.currentDifficulty,
        currentQuestion:  room.currentQuestion,
        specialEffect:    room.specialEffect  || null,
        currentRound:     room.currentRound   || 1,
        totalRounds:      room.totalRounds    || 6,
        turnInRound:      room.turnInRound    || 0,
        questionIdx:      room.questionIdx    || 0,
        lastAnswer:       room.lastAnswer     || null,
        allAnswers:       room.allAnswers     || [],
        winner:           room.winner         || null,
      };
      socket.emit('room:update', payload);
    }, 300);
  });

  // ── Iniciar partida (solo host) ─────────────────────────────────────────────
  socket.on('game:start', ({ rounds } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 1) return;
    room.state            = 'spinning';
    room.currentRound     = 1;
    room.turnInRound      = 0;
    room.totalRounds      = rounds || 6;
    room.currentPlayerIdx = 0;
    room.usedQuestions    = {};
    room.lastCatPerPlayer = {};
    room.usedCatsPerPlayer= {};
    io.to(code).emit('game:start', { roomCode: code });
    setTimeout(() => broadcastRoom(io, code), 2500);
  });

  // ── Girar ruleta ────────────────────────────────────────────────────────────
  socket.on('game:startSpin', ({ catId } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;
    const currentPlayer = room.players[room.currentPlayerIdx];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    const allCats    = room.categories || defaultCategories;
    const normalCats = allCats.filter(c => !c.special);

    if (!room.usedCatsPerPlayer)                        room.usedCatsPerPlayer = {};
    if (!room.usedCatsPerPlayer[currentPlayer.name])    room.usedCatsPerPlayer[currentPlayer.name] = [];

    const usedCats = room.usedCatsPerPlayer[currentPlayer.name];
    let available  = normalCats.filter(c => !usedCats.includes(c.id));
    if (!available.length) { room.usedCatsPerPlayer[currentPlayer.name] = []; available = normalCats; }

    let winningCat = catId ? allCats.find(c => c.id === catId) : null;
    if (!winningCat) winningCat = available[Math.floor(Math.random() * available.length)];

    room.usedCatsPerPlayer[currentPlayer.name].push(winningCat.id);

    const diffs      = ['easy', 'medium', 'hard'];
    const chosenDiff = winningCat.special ? 'special' : diffs[Math.floor(Math.random() * diffs.length)];
    const extraRots  = 5 + Math.random() * 3;

    io.to(code).emit('game:doSpin', {
      catId:   winningCat.id,
      diff:    chosenDiff,
      special: winningCat.special ? winningCat.id : null,
      extra:   extraRots,
    });
  });

  // ── Resultado del giro ──────────────────────────────────────────────────────
  socket.on('game:spinResult', ({ categoryId, difficulty, special }) => {
    try {
      const code = socket.data.roomCode;
      const room = rooms[code];
      if (!room) return;
      const currentPlayer = room.players[room.currentPlayerIdx];
      if (!currentPlayer || currentPlayer.id !== socket.id) return;
      if (!categoryId) return console.error('❌ spinResult: categoryId null');

      if (special) {
        room.currentCategory = categoryId;
        room.specialEffect   = special;

        if (special === 'skip') {
          room.state      = 'answer';
          room.lastAnswer = { playerId: socket.id, playerName: currentPlayer.name, answer: '__skip__', correct: false, special: 'skip' };
          room.allAnswers = [];
          broadcastRoom(io, code);
          return;
        }
        if (special === 'suerte') {
          room.scores[socket.id]  = (room.scores[socket.id] || 0) + 6;
          currentPlayer.score     = room.scores[socket.id];
          room.state              = 'answer';
          room.lastAnswer         = { playerId: socket.id, playerName: currentPlayer.name, answer: '__suerte__', correct: true, special: 'suerte' };
          room.allAnswers         = [];
          broadcastRoom(io, code);
          return;
        }
        const normalCats    = ['sports','geo','culture','history','eu','kenya'];
        const randCat       = normalCats[Math.floor(Math.random() * normalCats.length)];
        room.currentQuestion  = getUniqueQuestion(room, randCat, null);
        room.currentDifficulty= 'medium';
        setTimeout(() => { room.state = 'question'; broadcastRoom(io, code); }, 500);
        return;
      }

      const diffMap          = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
      room.currentCategory   = categoryId;
      room.currentDifficulty = difficulty || 'medium';
      room.specialEffect     = null;
      room.currentQuestion   = getUniqueQuestion(room, categoryId, diffMap[difficulty] || 'medio');
      setTimeout(() => { room.state = 'question'; broadcastRoom(io, code); }, 500);
    } catch(e) { console.error('game:spinResult error:', e.message); }
  });

  // ── Responder pregunta ──────────────────────────────────────────────────────
  socket.on('game:answer', ({ answer }) => {
    try {
      const code = socket.data.roomCode;
      const room = rooms[code];
      if (!room || room.state !== 'question' || !room.currentQuestion) return;

      const currentPlayer = room.players[room.currentPlayerIdx];
      if (!currentPlayer || currentPlayer.id !== socket.id) return;

      const correct = answer.trim() === room.currentQuestion.a.trim();
      console.log('📝 Answer:', answer, '| Correct:', room.currentQuestion.a, '| Match:', correct);

      if (correct) {
        const diffPts = { easy: 3, medium: 6, hard: 12 };
        let points    = diffPts[room.currentDifficulty] || 6;

        if (room.specialEffect === 'doble') points *= 2;

        if (room.specialEffect === 'robo') {
          const sorted = [...room.players].sort((a, b) => b.score - a.score);
          const leader = sorted.find(p => p.id !== socket.id);
          if (leader && leader.score > 0) {
            const stolen            = Math.min(points, leader.score);
            room.scores[leader.id]  = (room.scores[leader.id] || 0) - stolen;
            leader.score            = room.scores[leader.id];
            room.scores[socket.id]  = (room.scores[socket.id] || 0) + stolen;
            currentPlayer.score     = room.scores[socket.id];
          } else {
            room.scores[socket.id]  = (room.scores[socket.id] || 0) + points;
            currentPlayer.score     = room.scores[socket.id];
          }
        } else {
          room.scores[socket.id] = (room.scores[socket.id] || 0) + points;
          currentPlayer.score    = room.scores[socket.id];
        }
      } else if (room.specialEffect === 'bomba') {
        const diffPts = { easy: 3, medium: 6, hard: 12 };
        const penalty = diffPts[room.currentDifficulty] || 6;
        room.scores[socket.id] = Math.max(0, (room.scores[socket.id] || 0) - penalty);
        currentPlayer.score    = room.scores[socket.id];
      }

      room.lastAnswer = { playerId: socket.id, playerName: currentPlayer.name, answer, correct };
      room.allAnswers = [{ playerId: socket.id, playerName: currentPlayer.name, answer, correct }];
      room.state      = 'answer';
      room.answers    = {};
      broadcastRoom(io, code);
    } catch(e) { console.error('game:answer error:', e.message); }
  });

  // ── Siguiente turno ─────────────────────────────────────────────────────────
  socket.on('game:nextTurn', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.state !== 'answer') return;

    const numPlayers   = room.players.length;
    room.turnInRound   = (room.turnInRound || 0) + 1;

    if (room.turnInRound >= numPlayers) {
      room.currentRound     = (room.currentRound || 1) + 1;
      room.turnInRound      = 0;
      room.currentPlayerIdx = 0;

      if (room.currentRound > (room.totalRounds || 6)) {
        room.state = 'finished';
        const sorted = [...room.players].sort((a, b) => b.score - a.score);
        sorted.forEach((player, idx) => updateUserStats(player.name, player.score, idx === 0));
        broadcastRoom(io, code);
        return;
      }
    } else {
      room.currentPlayerIdx = (room.currentPlayerIdx + 1) % numPlayers;
    }

    room.questionIdx    = ((room.currentRound - 1) * numPlayers) + room.turnInRound;
    room.state          = 'spinning';
    room.currentQuestion= null;
    room.currentCategory= null;
    room.lastAnswer     = null;
    room.answers        = {};
    room.allAnswers     = [];
    room.specialEffect  = null;
    broadcastRoom(io, code);
  });

  // ── Finalizar partida ───────────────────────────────────────────────────────
  socket.on('game:end', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.state = 'finished';
    broadcastRoom(io, code);
  });

  // ── Admin socket API ────────────────────────────────────────────────────────
  socket.on('admin:setCategories', ({ tenantId, categories }) => {
    const td = getTenantData(tenantId);
    td.categories = categories;
    socket.emit('admin:ok', { msg: 'Categorías actualizadas' });
  });

  socket.on('admin:setQuestions', ({ tenantId, categoryId, questions }) => {
    const td = getTenantData(tenantId);
    td.questions[categoryId] = questions;
    socket.emit('admin:ok', { msg: 'Preguntas actualizadas' });
  });

  socket.on('admin:getConfig', ({ tenantId }) => {
    socket.emit('admin:config', getTenantData(tenantId));
  });

  // ── Desconexión ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { delete rooms[code]; return; }
    if (room.host === socket.id)   room.host = room.players[0].id;
    if (room.currentPlayerIdx >= room.players.length) room.currentPlayerIdx = 0;
    broadcastRoom(io, code);
  });
}

module.exports = { registerGameHandlers };