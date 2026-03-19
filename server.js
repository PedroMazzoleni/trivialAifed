// ─── server.js ───────────────────────────────────────────────────────────────
// Punto de entrada: configura Express, Socket.IO y carga los módulos.

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const { initDB, registerAuthRoutes } = require('./db');
const { registerTenantRoutes }       = require('./tenant');
const { registerGameHandlers }       = require('./game');

// ─── Evitar crashes ───────────────────────────────────────────────────────────
process.on('uncaughtException',  (err)    => console.error('❌ Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));

// ─── Express + Socket.IO ──────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors:               { origin: '*', methods: ['GET', 'POST'] },
  transports:         ['polling'],
  allowEIO3:          true,
  pingTimeout:        20000,
  pingInterval:       10000,
  httpCompression:    false,
  perMessageDeflate:  false,
});

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use('/css',    express.static(path.join(__dirname, 'css')));
app.use('/js',     express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ─── Ruta raíz ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'trivial-intro.html'));
});

// ─── Rutas REST ───────────────────────────────────────────────────────────────
registerAuthRoutes(app);
registerTenantRoutes(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('🔌 Conectado:', socket.id);
  registerGameHandlers(io, socket);
});

// ─── Arrancar ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  server.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
});