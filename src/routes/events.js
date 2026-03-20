// ─── events.js ────────────────────────────────────────────────────────────────
// REST routes for event management with MySQL

function registerEventRoutes(app, db) {

  // ── Create tables if not exist ────────────────────────────────────────────
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
        rounds      INT          NOT NULL DEFAULT 6,
        starts_at   DATETIME,
        ends_at     DATETIME,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add rounds column if it doesn't exist (migration for existing tables)
    try {
      await db.execute(`ALTER TABLE events ADD COLUMN rounds INT NOT NULL DEFAULT 6`);
    } catch(e) {
      // Column already exists, ignore
    }

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
    console.log('✅ Event tables ready');
  }

  initEventTables().catch(e => console.error('Event tables error:', e.message));

  // ── GET /api/events — list all events ────────────────────────────────────
  app.get('/api/events', async (req, res) => {
    if (!db) return res.json([]);
    try {
      const [rows] = await db.execute(
        'SELECT * FROM events ORDER BY created_at DESC'
      );
      res.json(rows);
    } catch(e) { res.json([]); }
  });

  // ── GET /api/events/:id — event with questions ────────────────────────────
  app.get('/api/events/:id', async (req, res) => {
    if (!db) return res.json(null);
    try {
      const [evRows] = await db.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
      if (!evRows.length) return res.status(404).json({ ok: false, msg: 'Event not found' });
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

  // ── POST /api/events — create event ──────────────────────────────────────
  app.post('/api/events', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    const { title, description, category, difficulty, status, rounds, starts_at, ends_at, questions } = req.body;
    if (!title || !category) return res.json({ ok: false, msg: 'Missing required fields' });
    try {
      const [result] = await db.execute(
        'INSERT INTO events (title, description, category, difficulty, status, rounds, starts_at, ends_at) VALUES (?,?,?,?,?,?,?,?)',
        [title, description || '', category, difficulty || 'medio', status || 'active',
         rounds || 6, starts_at || null, ends_at || null]
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

  // ── PUT /api/events/:id — edit event ─────────────────────────────────────
  app.put('/api/events/:id', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    const { title, description, category, difficulty, status, rounds, starts_at, ends_at, questions } = req.body;
    try {
      await db.execute(
        'UPDATE events SET title=?, description=?, category=?, difficulty=?, status=?, rounds=?, starts_at=?, ends_at=? WHERE id=?',
        [title, description || '', category, difficulty || 'medio', status || 'active',
         rounds || 6, starts_at || null, ends_at || null, req.params.id]
      );
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

  // ── DELETE /api/events/:id — delete event ────────────────────────────────
  app.delete('/api/events/:id', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    try {
      await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });
}

module.exports = { registerEventRoutes };