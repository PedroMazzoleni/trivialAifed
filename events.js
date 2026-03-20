// ─── events.js ────────────────────────────────────────────────────────────────
// Rutas REST para gestión de eventos con preguntas propias en MySQL

function registerEventRoutes(app, db) {

    // ── Crear tablas si no existen ────────────────────────────────────────────
    async function initEventTables() {
      if (!db) return;
      await db.execute(`
        CREATE TABLE IF NOT EXISTS events (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          title       VARCHAR(200) NOT NULL,
          description TEXT,
          category    VARCHAR(100) NOT NULL,
          difficulty  VARCHAR(20)  NOT NULL DEFAULT 'medio',
          status      VARCHAR(20)  NOT NULL DEFAULT 'active',
          starts_at   DATETIME,
          ends_at     DATETIME,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS event_questions (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          event_id   INT NOT NULL,
          question   TEXT NOT NULL,
          answer     VARCHAR(500) NOT NULL,
          options    TEXT NOT NULL,
          difficulty VARCHAR(20) NOT NULL DEFAULT 'medio',
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Tablas de eventos listas');
    }
  
    initEventTables().catch(e => console.error('Event tables error:', e.message));
  
    // ── GET /api/events — listar todos los eventos ────────────────────────────
    app.get('/api/events', async (req, res) => {
      if (!db) return res.json([]);
      try {
        const [rows] = await db.execute(
          'SELECT * FROM events ORDER BY created_at DESC'
        );
        res.json(rows);
      } catch(e) { res.json([]); }
    });
  
    // ── GET /api/events/:id — evento con sus preguntas ────────────────────────
    app.get('/api/events/:id', async (req, res) => {
      if (!db) return res.json(null);
      try {
        const [evRows] = await db.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!evRows.length) return res.status(404).json({ ok: false, msg: 'Evento no encontrado' });
        const event = evRows[0];
        const [qRows] = await db.execute(
          'SELECT * FROM event_questions WHERE event_id = ? ORDER BY id',
          [req.params.id]
        );
        event.questions = qRows.map(q => ({
          ...q,
          options: JSON.parse(q.options)
        }));
        res.json(event);
      } catch(e) { res.status(500).json({ ok: false, msg: e.message }); }
    });
  
    // ── POST /api/events — crear evento ──────────────────────────────────────
    app.post('/api/events', async (req, res) => {
      if (!db) return res.json({ ok: false, msg: 'Sin base de datos' });
      const { title, description, category, difficulty, status, starts_at, ends_at, questions } = req.body;
      if (!title || !category) return res.json({ ok: false, msg: 'Faltan campos obligatorios' });
      try {
        const [result] = await db.execute(
          'INSERT INTO events (title, description, category, difficulty, status, starts_at, ends_at) VALUES (?,?,?,?,?,?,?)',
          [title, description || '', category, difficulty || 'medio', status || 'active',
           starts_at || null, ends_at || null]
        );
        const eventId = result.insertId;
  
        if (questions && questions.length) {
          for (const q of questions) {
            await db.execute(
              'INSERT INTO event_questions (event_id, question, answer, options, difficulty) VALUES (?,?,?,?,?)',
              [eventId, q.question, q.answer, JSON.stringify(q.options), q.difficulty || difficulty || 'medio']
            );
          }
        }
        res.json({ ok: true, id: eventId });
      } catch(e) { res.json({ ok: false, msg: e.message }); }
    });
  
    // ── PUT /api/events/:id — editar evento ───────────────────────────────────
    app.put('/api/events/:id', async (req, res) => {
      if (!db) return res.json({ ok: false, msg: 'Sin base de datos' });
      const { title, description, category, difficulty, status, starts_at, ends_at, questions } = req.body;
      try {
        await db.execute(
          'UPDATE events SET title=?, description=?, category=?, difficulty=?, status=?, starts_at=?, ends_at=? WHERE id=?',
          [title, description || '', category, difficulty || 'medio', status || 'active',
           starts_at || null, ends_at || null, req.params.id]
        );
        // Reemplazar preguntas
        await db.execute('DELETE FROM event_questions WHERE event_id = ?', [req.params.id]);
        if (questions && questions.length) {
          for (const q of questions) {
            await db.execute(
              'INSERT INTO event_questions (event_id, question, answer, options, difficulty) VALUES (?,?,?,?,?)',
              [req.params.id, q.question, q.answer, JSON.stringify(q.options), q.difficulty || difficulty || 'medio']
            );
          }
        }
        res.json({ ok: true });
      } catch(e) { res.json({ ok: false, msg: e.message }); }
    });
  
    // ── DELETE /api/events/:id — eliminar evento ──────────────────────────────
    app.delete('/api/events/:id', async (req, res) => {
      if (!db) return res.json({ ok: false, msg: 'Sin base de datos' });
      try {
        await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ ok: true });
      } catch(e) { res.json({ ok: false, msg: e.message }); }
    });
  }
  
  module.exports = { registerEventRoutes };