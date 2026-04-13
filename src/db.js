// ─── db.js ───────────────────────────────────────────────────────────────────
const mysql = require('mysql2/promise');

let db = null;

async function initDB() {
  const url = process.env.DATABASE_URL ||
              process.env.MYSQL_PUBLIC_URL ||
              process.env.MYSQL_URL;
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

    await db.execute('SELECT 1');

    await db.execute(`
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

    await db.execute(`
      INSERT IGNORE INTO users (email, name, password, role)
      VALUES ('admin', 'Admin', 'admin1234', 'admin')
    `);

    // ── Events tables ─────────────────────────────────────────────────────
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

    // Auto-cleanup expired events every hour
    const cleanupExpired = async () => {
      try {
        const [r] = await db.execute(
          'DELETE FROM events WHERE ends_at IS NOT NULL AND ends_at < DATE_SUB(NOW(), INTERVAL 1 DAY)'
        );
        if (r.affectedRows > 0) console.log(`🗑️  Limpiados ${r.affectedRows} evento(s) expirados`);
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

// ── Exportar instancia de db para otros módulos ───────────────────────────────
function getDB() { return db; }

async function updateUserStats(playerName, points, isWinner) {
  if (!db) return;
  try {
    await db.execute(
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
      await db.execute(
        'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
        [email, name, password, 'player']
      );
      res.json({ ok: true, name, role: 'player' });
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY') return res.json({ ok: false, msg: 'Este correo ya está registrado' });
      res.json({ ok: false, msg: 'Error al registrar' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ ok: false, msg: 'Faltan campos' });
    try {
      const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (!rows.length)               return res.json({ ok: false, msg: 'Usuario no encontrado' });
      if (rows[0].password !== password) return res.json({ ok: false, msg: 'Contraseña incorrecta' });
      res.json({ ok: true, name: rows[0].name, role: rows[0].role });
    } catch(e) { res.json({ ok: false, msg: 'Error al iniciar sesión' }); }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT email, name, role FROM users WHERE role != 'admin'");
      res.json(rows);
    } catch(e) { res.json([]); }
  });

  app.get('/api/ranking', async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT name, wins, total_points as totalPoints, games_played as gamesPlayed FROM users WHERE role != 'admin' ORDER BY wins DESC, total_points DESC"
      );
      res.json(rows);
    } catch(e) { res.json([]); }
  });

  app.get('/api/wins/:name', async (req, res) => {
    try {
      const [rows] = await db.execute('SELECT wins FROM users WHERE name = ?', [req.params.name]);
      res.json({ wins: rows[0] ? rows[0].wins : 0 });
    } catch(e) { res.json({ wins: 0 }); }
  });
}

module.exports = { initDB, getDB, updateUserStats, registerAuthRoutes };
