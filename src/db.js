// ─── db.js ───────────────────────────────────────────────────────────────────
const { Pool } = require('pg');

let db = null;

async function initDB() {
  const url = process.env.DATABASE_URL ||
              process.env.POSTGRES_URL  ||
              process.env.DATABASE_PRIVATE_URL;

  if (!url) {
    console.warn('⚠️  No DATABASE_URL found — running without database');
    return;
  }

  try {
    const { URL } = require('url');
    const { promises: dns } = require('dns');
    const parsed = new URL(url);
    const addresses = await dns.resolve4(parsed.hostname);
    const ipv4 = addresses[0];

    db = new Pool({
      host:     ipv4,
      port:     parseInt(parsed.port) || 5432,
      user:     decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace('/', ''),
      ssl:      { rejectUnauthorized: false },
    });

    await db.query('SELECT 1');

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        email        VARCHAR(255) UNIQUE NOT NULL,
        name         VARCHAR(100) NOT NULL,
        password     VARCHAR(255) NOT NULL,
        role         VARCHAR(20)  DEFAULT 'player',
        wins         INT          DEFAULT 0,
        total_points INT          DEFAULT 0,
        games_played INT          DEFAULT 0,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      INSERT INTO users (email, name, password, role)
      VALUES ('admin', 'Admin', 'admin1234', 'admin')
      ON CONFLICT (email) DO NOTHING
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        category    VARCHAR(100) NOT NULL,
        difficulty  VARCHAR(20)  NOT NULL DEFAULT 'medio',
        status      VARCHAR(20)  NOT NULL DEFAULT 'active',
        rounds      INT          NOT NULL DEFAULT 6,
        starts_at   TIMESTAMP,
        ends_at     TIMESTAMP,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS event_questions (
        id         SERIAL PRIMARY KEY,
        event_id   INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        question   TEXT NOT NULL,
        answer     VARCHAR(500) NOT NULL,
        options    TEXT NOT NULL,
        difficulty VARCHAR(20) NOT NULL DEFAULT 'medio',
        category   VARCHAR(50)  DEFAULT NULL
      )
    `);

          // Añadir columna category si no existe (migración)
      try {
        await db.query("ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL");
      } catch(e) {}
      const cleanupExpired = async () => {
      try {
        const r = await db.query("DELETE FROM events WHERE ends_at IS NOT NULL AND ends_at < NOW() - INTERVAL '1 day'");
        if (r.rowCount > 0) console.log('🗑️  Limpiados ' + r.rowCount + ' evento(s) expirados');
      } catch(e) {}
    };
    cleanupExpired();
    setInterval(cleanupExpired, 60 * 60 * 1000);

    console.log('✅ PostgreSQL conectado y tablas listas');
  } catch(e) {
    console.error('❌ PostgreSQL error:', e.message);
    db = null;
  }
}

function getDB() { return db; }

async function updateUserStats(playerName, points, isWinner) {
  if (!db) return;
  try {
    await db.query(
      'UPDATE users SET total_points = total_points + $1, games_played = games_played + 1, wins = wins + $2 WHERE name = $3',
      [points, isWinner ? 1 : 0, playerName]
    );
  } catch(e) { console.error('Stats update error:', e.message); }
}

function registerAuthRoutes(app) {

  app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.json({ ok: false, msg: 'Faltan campos' });
    if (!db) return res.json({ ok: false, msg: 'Base de datos no disponible' });
    try {
      await db.query('INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4)', [email, name, password, 'player']);
      res.json({ ok: true, name, role: 'player' });
    } catch(e) {
      if (e.code === '23505') return res.json({ ok: false, msg: 'Este correo ya está registrado' });
      res.json({ ok: false, msg: 'Error al registrar' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ ok: false, msg: 'Faltan campos' });
    if (!db) return res.json({ ok: false, msg: 'Base de datos no disponible' });
    try {
      const r = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (!r.rows.length)                  return res.json({ ok: false, msg: 'Usuario no encontrado' });
      if (r.rows[0].password !== password) return res.json({ ok: false, msg: 'Contraseña incorrecta' });
      res.json({ ok: true, name: r.rows[0].name, role: r.rows[0].role });
    } catch(e) { res.json({ ok: false, msg: 'Error al iniciar sesión' }); }
  });

  app.get('/api/users', async (req, res) => {
    if (!db) return res.json([]);
    try {
      const r = await db.query("SELECT email, name, role FROM users WHERE role != 'admin'");
      res.json(r.rows);
    } catch(e) { res.json([]); }
  });

  app.get('/api/ranking', async (req, res) => {
    if (!db) return res.json([]);
    try {
      const r = await db.query("SELECT name, wins, total_points AS \"totalPoints\", games_played AS \"gamesPlayed\" FROM users WHERE role != 'admin' ORDER BY wins DESC, total_points DESC");
      res.json(r.rows);
    } catch(e) { res.json([]); }
  });

  app.get('/api/wins/:name', async (req, res) => {
    if (!db) return res.json({ wins: 0 });
    try {
      const r = await db.query('SELECT wins FROM users WHERE name = $1', [req.params.name]);
      res.json({ wins: r.rows[0] ? r.rows[0].wins : 0 });
    } catch(e) { res.json({ wins: 0 }); }
  });
}

module.exports = { initDB, getDB, updateUserStats, registerAuthRoutes };
