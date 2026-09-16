// server.js
// Custom server so we can attach a real Socket.IO WebSocket server alongside
// Next.js. Plain `next dev` / `next start` can't hold persistent WebSocket
// connections — API routes are request/response only. This file replaces
// that with one Node process serving both.
//
// IMPORTANT: `next dev`/`next start` normally load .env.local for you
// automatically. A custom server run directly via `node server.js` does
// NOT get that for free — we have to load it ourselves, first, before
// anything else (like lib/session-node.js) reads process.env.
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { verifySessionToken } = require('./lib/session-node');

const dev = process.env.NODE_ENV !== 'production';
// Render (and most other hosts) require binding on all interfaces. Keeping a
// configurable host also preserves the usual localhost development workflow.
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// A tiny in-memory presence map: userId -> Set of socket ids.
// This is fine for a single-server deployment. If you ever scale to
// multiple server instances, this needs to move to Redis (socket.io-redis
// adapter) so presence/typing/rooms are shared across instances.
const onlineUsers = new Map(); // userId -> Set<socketId>

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_BASE_URL || `http://${hostname}:${port}`, credentials: true },
  });

  // Make io reachable from API routes running in this same process.
  global.__io = io;
  global.__onlineUsers = onlineUsers;

  // ── Auth middleware: every socket must present a valid session cookie ──
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const match = cookieHeader.match(/lumpy_session=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    const session = verifySessionToken(token);
    if (!session) {
      return next(new Error('Unauthorized'));
    }
    socket.data.session = session; // { userId, role, email }
    next();
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data.session;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join a personal room so server code can target this user directly:
    // io.to(`user:${userId}`).emit(...)
    socket.join(`user:${userId}`);

    // Broadcast presence to anyone interested (chat lists, doctor status).
    io.emit('presence:update', { userId, online: true });

    // ── Join/leave a specific chat thread room ──
    socket.on('thread:join', (threadId) => {
      const [a, b] = String(threadId).split('_');
      if (userId !== a && userId !== b) return; // not a participant, ignore
      socket.join(`thread:${threadId}`);
    });
    socket.on('thread:leave', (threadId) => {
      socket.leave(`thread:${threadId}`);
    });

    // ── Typing indicator ──
    socket.on('typing:start', ({ threadId }) => {
      const [a, b] = String(threadId).split('_');
      if (userId !== a && userId !== b) return;
      socket.to(`thread:${threadId}`).emit('typing:update', { threadId, userId, typing: true });
    });
    socket.on('typing:stop', ({ threadId }) => {
      const [a, b] = String(threadId).split('_');
      if (userId !== a && userId !== b) return;
      socket.to(`thread:${threadId}`).emit('typing:update', { threadId, userId, typing: false });
    });

    // ── Doctor availability status ──
    socket.on('availability:set', ({ status }) => {
      if (socket.data.session.role !== 'doctor') return;
      if (!['available', 'busy', 'offline'].includes(status)) return;
      io.emit('availability:update', { doctorId: userId, status });
    });

    socket.on('disconnect', () => {
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
          io.emit('presence:update', { userId, online: false });
        }
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    // `0.0.0.0` is valid for binding a server but is not a browser address.
    // Show the useful local URL during development while retaining the
    // production host/base URL in deployment logs.
    const displayUrl = process.env.NEXT_PUBLIC_BASE_URL
      || (dev ? `http://localhost:${port}` : `http://${hostname}:${port}`);
    console.log(`> Ready on ${displayUrl}`);
  });
});
