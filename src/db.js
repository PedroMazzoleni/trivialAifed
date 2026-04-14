// ─── db.js ───────────────────────────────────────────────────────────────────
const mysql = require('mysql2/promise');

let db = null;

async function initDB() {
  const url = process.env.DATABASE_URL ||
              process.env.MYSQL_URL     ||
              process.env.DATABASE_PRIVATE_URL;

  const hasIndividual = process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

  if (!url && !hasIndividual) {
    console.warn('⚠️  No database config found — running without database');
    return;
  }

  try {
    const poolConfig = url
      ? { uri: url, ssl: { rejectUnauthorized: false } }
      : {
          host:     process.env.DB_HOST,
          user:     process.env.DB_USER,
          password: process.env.DB_PASS,
          database: process.env.DB_NAME,
          port:     process.env.DB_PORT || 3306,
        };

    db = mysql.createPool({
      ...poolConfig,
      waitForConnections: true,
      connectionLimit:    10,
    });

    await db.query('SELECT 1');

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           INT AUTO_INCREMENT PRIMARY KEY,
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
      INSERT IGNORE INTO users (email, name, password, role)
      VALUES ('admin', 'Admin', 'admin1234', 'admin')
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        category    VARCHAR(100) NOT NULL,
        difficulty  VARCHAR(20)  NOT NULL DEFAULT 'medio',
        status      VARCHAR(20)  NOT NULL DEFAULT 'active',
        rounds      INT          NOT NULL DEFAULT 6,
        starts_at   TIMESTAMP    NULL DEFAULT NULL,
        ends_at     TIMESTAMP    NULL DEFAULT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS event_questions (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        event_id   INT NOT NULL,
        question   TEXT NOT NULL,
        answer     VARCHAR(500) NOT NULL,
        options    TEXT NOT NULL,
        difficulty VARCHAR(20)  NOT NULL DEFAULT 'medio',
        category   VARCHAR(50)  DEFAULT NULL,
        image_url  TEXT         DEFAULT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Migraciones de columnas (MySQL 8+ soporta IF NOT EXISTS en ALTER)
    try { await db.query("ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL"); } catch(e) {}
    try { await db.query("ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL"); } catch(e) {}
    try { await db.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_image TEXT DEFAULT NULL"); } catch(e) {}

    const cleanupExpired = async () => {
      try {
        const [r] = await db.query("DELETE FROM events WHERE ends_at IS NOT NULL AND ends_at < NOW() - INTERVAL 1 DAY");
        if (r.affectedRows > 0) console.log('🗑️  Limpiados ' + r.affectedRows + ' evento(s) expirados');
      } catch(e) {}
    };
    cleanupExpired();
    setInterval(cleanupExpired, 60 * 60 * 1000);

    console.log('✅ MySQL conectado y tablas listas');
  } catch(e) {
    console.error('❌ MySQL error:', e.message);
    db = null;
  }
}

function getDB() { return db; }

async function updateUserStats(playerName, points, isWinner) {
  if (!db) return;
  try {
    await db.query(
      'UPDATE users SET total_points = total_points + ?, games_played = games_played + 1, wins = wins + ? WHERE name = ?',
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
      await db.query('INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)', [email, name, password, 'player']);
      res.json({ ok: true, name, role: 'player' });
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY') return res.json({ ok: false, msg: 'Este correo ya está registrado' });
      res.json({ ok: false, msg: 'Error al registrar' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ ok: false, msg: 'Faltan campos' });
    if (!db) return res.json({ ok: false, msg: 'Base de datos no disponible' });
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (!rows.length)                  return res.json({ ok: false, msg: 'Usuario no encontrado' });
      if (rows[0].password !== password) return res.json({ ok: false, msg: 'Contraseña incorrecta' });
      res.json({ ok: true, name: rows[0].name, role: rows[0].role });
    } catch(e) { res.json({ ok: false, msg: 'Error al iniciar sesión' }); }
  });

  app.get('/api/users', async (req, res) => {
    if (!db) return res.json([]);
    try {
      const [rows] = await db.query("SELECT email, name, role FROM users WHERE role != 'admin'");
      res.json(rows);
    } catch(e) { res.json([]); }
  });

  app.get('/api/ranking', async (req, res) => {
    if (!db) return res.json([]);
    try {
      const [rows] = await db.query("SELECT name, wins, total_points AS totalPoints, games_played AS gamesPlayed FROM users WHERE role != 'admin' ORDER BY wins DESC, total_points DESC");
      res.json(rows);
    } catch(e) { res.json([]); }
  });

  app.post('/api/admin/reset-password', async (req, res) => {
    const { secretKey, newPassword } = req.body;
    if (!secretKey || !newPassword) return res.json({ ok: false, msg: 'Faltan campos' });
    if (!db) return res.json({ ok: false, msg: 'Base de datos no disponible' });

    const RESET_KEY = process.env.ADMIN_RESET_KEY || 'trivial-reset-2024';
    if (secretKey !== RESET_KEY) return res.json({ ok: false, msg: 'Clave secreta incorrecta' });
    if (newPassword.length < 6) return res.json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' });

    try {
      const [r] = await db.query(
        "UPDATE users SET password = ? WHERE role = 'admin'",
        [newPassword]
      );
      if (!r.affectedRows) return res.json({ ok: false, msg: 'No se encontró la cuenta admin' });
      res.json({ ok: true, msg: 'Contraseña actualizada correctamente' });
    } catch(e) {
      res.json({ ok: false, msg: 'Error al actualizar' });
    }
  });

  app.delete('/api/admin/users/:email', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    try {
      const [r] = await db.query("DELETE FROM users WHERE email = ? AND role != 'admin'", [req.params.email]);
      if (!r.affectedRows) return res.json({ ok: false, msg: 'Usuario no encontrado o es admin' });
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });

  app.post('/api/admin/users/:email/reset-password', async (req, res) => {
    if (!db) return res.json({ ok: false, msg: 'No database' });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.json({ ok: false, msg: 'Mínimo 6 caracteres' });
    try {
      const [r] = await db.query("UPDATE users SET password = ? WHERE email = ? AND role != 'admin'", [newPassword, req.params.email]);
      if (!r.affectedRows) return res.json({ ok: false, msg: 'Usuario no encontrado' });
      res.json({ ok: true });
    } catch(e) { res.json({ ok: false, msg: e.message }); }
  });

  app.get('/api/wins/:name', async (req, res) => {
    if (!db) return res.json({ wins: 0 });
    try {
      const [rows] = await db.query('SELECT wins FROM users WHERE name = ?', [req.params.name]);
      res.json({ wins: rows[0] ? rows[0].wins : 0 });
    } catch(e) { res.json({ wins: 0 }); }
  });
}

module.exports = { initDB, getDB, updateUserStats, registerAuthRoutes };
