// lib/socketEmit.ts
// API routes (chat POST, notifications, case updates, etc.) call these
// helpers to push a real-time event out over the socket server started in
// server.js. `global.__io` is set once, at server startup, and is available
// to every request handled in this same Node process.

export function emitToUser(userId: string, event: string, payload: any) {
  const io = (global as any).__io;
  if (!io) return; // socket server not running (e.g. you're still on `next dev` without server.js)
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToThread(threadId: string, event: string, payload: any) {
  const io = (global as any).__io;
  if (!io) return;
  io.to(`thread:${threadId}`).emit(event, payload);
}

export function isUserOnline(userId: string): boolean {
  const onlineUsers = (global as any).__onlineUsers as Map<string, Set<string>> | undefined;
  return !!onlineUsers?.get(userId)?.size;
}
