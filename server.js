// ─── server.js ───────────────────────────────────────────────────────────────
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const { initDB, registerAuthRoutes, getDB } = require('./db');
const { registerTenantRoutes }              = require('./tenant');
const { registerGameHandlers }              = require('./game');
const { registerEventRoutes }              = require('./events');
const { registerEventGameHandlers }        = require('./event-game');

process.on('uncaughtException',  (err)    => console.error('❌ Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));

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

app.use(express.json());
app.use('/css',    express.static(path.join(__dirname, 'css')));
app.use('/js',     express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'trivial-intro.html'));
});

registerAuthRoutes(app);
registerTenantRoutes(app);

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);
  registerGameHandlers(io, socket);
  registerEventGameHandlers(io, socket);
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  registerEventRoutes(app, getDB());
  server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
});