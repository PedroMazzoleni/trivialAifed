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
    if (url) {
      db = await mysql.createPool({
        uri: url,
        ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        waitForConnections: true,
        connectionLimit: 5,
      });
    } else {
      db = await mysql.createPool({
        host:     process.env.MYSQL_HOST     || process.env.MYSQLHOST,
        port:     parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306),
        user:     process.env.MYSQL_USER     || process.env.MYSQLUSER     || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'railway',
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 5,
      });
    }

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

          // Migraciones de columnas
      try { await db.query("ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL"); } catch(e) {}
      try { await db.query("ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL"); } catch(e) {}
      try { await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_image TEXT DEFAULT NULL"); } catch(e) {}
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

  // ── Reset contraseña admin con clave secreta ──────────────────────────────
  app.post('/api/admin/reset-password', async (req, res) => {
    const { secretKey, newPassword } = req.body;
    if (!secretKey || !newPassword) return res.json({ ok: false, msg: 'Faltan campos' });
    if (!db) return res.json({ ok: false, msg: 'Base de datos no disponible' });

    const RESET_KEY = process.env.ADMIN_RESET_KEY || 'trivial-reset-2024';
    if (secretKey !== RESET_KEY) return res.json({ ok: false, msg: 'Clave secreta incorrecta' });
    if (newPassword.length < 6) return res.json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' });

    try {
      const r = await db.query(
        "UPDATE users SET password = $1 WHERE role = 'admin' RETURNING email",
        [newPassword]
      );
      if (!r.rowCount) return res.json({ ok: false, msg: 'No se encontró la cuenta admin' });
      res.json({ ok: true, msg: 'Contraseña actualizada correctamente' });
    } catch(e) {
      res.json({ ok: false, msg: 'Error al actualizar' });
    }
  });

  // ── Borrar usuario ────────────────────────────────────────────────────────
  app.delete('/api/admin/users/:email', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    try {
      const r = await db.query("DELETE FROM users WHERE email = $1 AND role != 'admin' RETURNING email", [req.params.email]);
      if (!r.rowCount) return res.json({ ok: false, msg: 'Usuario no encontrado o es admin' });
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });

  // ── Resetear contraseña de usuario (admin lo pone a null/vacío para forzar cambio) ──
  app.post('/api/admin/users/:email/reset-password', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.json({ ok: false, msg: 'Mínimo 6 caracteres' });
    try {
      const r = await db.query("UPDATE users SET password = $1 WHERE email = $2 AND role != 'admin' RETURNING email", [newPassword, req.params.email]);
      if (!r.rowCount) return res.json({ ok: false, msg: 'Usuario no encontrado' });
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
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
