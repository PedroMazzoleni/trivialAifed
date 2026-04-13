// ─── events.js (PostgreSQL) ───────────────────────────────────────────────────

function registerEventRoutes(app, db) {

  // ── GET /api/events ───────────────────────────────────────────────────────
  app.get('/api/events', async (req, res) => {
    if (!db) return res.json([]);
    try {
      const r = await db.query('SELECT * FROM events ORDER BY created_at DESC');
      res.json(r.rows);
    } catch(e) { res.json([]); }
  });

  // ── GET /api/events/:id ───────────────────────────────────────────────────
  app.get('/api/events/:id', async (req, res) => {
    if (!db) return res.json(null);
    try {
      const ev = await db.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
      if (!ev.rows.length) return res.status(404).json({ ok: false, msg: 'Event not found' });
      const event = ev.rows[0];
      const qs = await db.query('SELECT * FROM event_questions WHERE event_id = $1 ORDER BY id', [req.params.id]);
      event.questions = qs.rows.map(q => ({ ...q, options: JSON.parse(q.options) }));
      res.json(event);
    } catch(e) { res.status(500).json({ ok: false, msg: e.message }); }
  });

  // ── POST /api/events ──────────────────────────────────────────────────────
  app.post('/api/events', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    const { title, description, category, difficulty, status, rounds, starts_at, ends_at, questions, banner_image } = req.body;
    if (!title || !category) return res.json({ ok: false, msg: 'Missing required fields' });
    try {
      const r = await db.query(
        'INSERT INTO events (title, description, category, difficulty, status, rounds, starts_at, ends_at, banner_image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
        [title, description||'', category, difficulty||'medio', status||'active', rounds||6, starts_at||null, ends_at||null, banner_image||null]
      );
      const eventId = r.rows[0].id;
      if (questions && questions.length) {
        for (const q of questions) {
          await db.query(
            'INSERT INTO event_questions (event_id, question, answer, options, difficulty, category, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [eventId, q.question, q.answer, JSON.stringify(q.options), q.difficulty||'medio', q.category||null, q.image_url||null]
          );
        }
      }
      res.json({ ok: true, id: eventId });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });

  // ── PUT /api/events/:id ───────────────────────────────────────────────────
  app.put('/api/events/:id', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    const { title, description, category, difficulty, status, rounds, starts_at, ends_at, questions, banner_image } = req.body;
    try {
      await db.query(
        'UPDATE events SET title=$1, description=$2, category=$3, difficulty=$4, status=$5, rounds=$6, starts_at=$7, ends_at=$8, banner_image=$9 WHERE id=$10',
        [title, description||'', category, difficulty||'medio', status||'active', rounds||6, starts_at||null, ends_at||null, banner_image||null, req.params.id]
      );
      await db.query('DELETE FROM event_questions WHERE event_id = $1', [req.params.id]);
      if (questions && questions.length) {
        for (const q of questions) {
          await db.query(
            'INSERT INTO event_questions (event_id, question, answer, options, difficulty, category, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [req.params.id, q.question, q.answer, JSON.stringify(q.options), q.difficulty||'medio', q.category||null, q.image_url||null]
          );
        }
      }
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });

  // ── DELETE /api/events/:id ────────────────────────────────────────────────
  app.delete('/api/events/:id', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    try {
      await db.query('DELETE FROM events WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });
}

module.exports = { registerEventRoutes };
