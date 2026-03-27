import { Server, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SOCKET_EVENTS, NODE_LOCK_TIMEOUT_MS } from '@context-collab/shared';
import type { PresenceUser, PageJoinPayload, PresenceListPayload } from '@context-collab/shared';

// ─── In-memory state (ephemeral — not persisted) ──────────────────────────────

interface LockEntry {
  userId: string;
  socketId: string;
  pageId: string;
  timer: ReturnType<typeof setTimeout>;
}

interface RoomUser extends PresenceUser {
  socketId: string;
}

// nodeId → LockEntry  (nodeIds are globally unique UUIDs)
const locks = new Map<string, LockEntry>();

// pageId → Map<userId, RoomUser>
const rooms = new Map<string, Map<string, RoomUser>>();

// socketId → Set<nodeId>  (which nodes this socket has locked)
const socketLocks = new Map<string, Set<string>>();

// socketId → pageId  (which page each socket is in)
const socketPage = new Map<string, string>();

let _io: Server | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function releaseLock(nodeId: string): void {
  const lock = locks.get(nodeId);
  if (!lock) return;

  clearTimeout(lock.timer);
  locks.delete(nodeId);

  const userLocks = socketLocks.get(lock.socketId);
  if (userLocks) userLocks.delete(nodeId);

  _io?.to(`page:${lock.pageId}`).emit(SOCKET_EVENTS.NODE_UNLOCK, {
    nodeId,
    userId: lock.userId,
    locked: false,
  });
}

function releaseAllLocksForSocket(socketId: string): void {
  const nodeIds = socketLocks.get(socketId);
  if (!nodeIds) return;
  // Copy since releaseLock mutates the set
  Array.from(nodeIds).forEach(releaseLock);
  socketLocks.delete(socketId);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export function setupSocket(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true,
    },
  });

  _io = io;

  io.on('connection', (socket: Socket) => {
    socketLocks.set(socket.id, new Set());

    // ── page:join ─────────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.PAGE_JOIN, (payload: PageJoinPayload) => {
      const { pageId, userId, email, color } = payload;
      const roomName = `page:${pageId}`;

      socket.join(roomName);
      socketPage.set(socket.id, pageId);

      if (!rooms.has(pageId)) {
        rooms.set(pageId, new Map());
      }
      rooms.get(pageId)!.set(userId, { userId, email, color, socketId: socket.id });

      // Send current presence + active locks to the joiner
      const currentUsers: PresenceUser[] = Array.from(rooms.get(pageId)!.values()).map(
        (u) => ({ userId: u.userId, email: u.email, color: u.color }),
      );
      const currentLocks = Array.from(locks.entries())
        .filter(([, lock]) => lock.pageId === pageId)
        .map(([nodeId, lock]) => ({ nodeId, userId: lock.userId }));

      const listPayload: PresenceListPayload = { users: currentUsers, locks: currentLocks };
      socket.emit(SOCKET_EVENTS.PRESENCE_LIST, listPayload);

      // Broadcast user:join to rest of room
      socket.to(roomName).emit(SOCKET_EVENTS.USER_JOIN, { userId, email, color });
    });

    // ── page:leave ────────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.PAGE_LEAVE, (payload: { pageId: string; userId: string }) => {
      const { pageId, userId } = payload;
      const roomName = `page:${pageId}`;

      releaseAllLocksForSocket(socket.id);

      rooms.get(pageId)?.delete(userId);
      if (rooms.get(pageId)?.size === 0) rooms.delete(pageId);

      socket.leave(roomName);
      socketPage.delete(socket.id);

      io.to(roomName).emit(SOCKET_EVENTS.USER_LEAVE, { userId });
    });

    // ── cursor:move ───────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.CURSOR_MOVE, (payload: { userId: string; pageId: string; x: number; y: number }) => {
      const { userId, pageId } = payload;

      // Reset inactivity timers for all locks this user holds
      const userLocks = socketLocks.get(socket.id);
      if (userLocks) {
        userLocks.forEach((nodeId) => {
          const lock = locks.get(nodeId);
          if (lock && lock.userId === userId) {
            clearTimeout(lock.timer);
            lock.timer = setTimeout(() => releaseLock(nodeId), NODE_LOCK_TIMEOUT_MS);
          }
        });
      }

      socket.to(`page:${pageId}`).emit(SOCKET_EVENTS.CURSOR_MOVE, payload);
    });

    // ── node:lock ─────────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.NODE_LOCK, (payload: { nodeId: string; userId: string; pageId: string }) => {
      const { nodeId, userId, pageId } = payload;
      const roomName = `page:${pageId}`;

      const existing = locks.get(nodeId);

      if (existing) {
        if (existing.userId === userId) {
          // Re-lock: reset the inactivity timer
          clearTimeout(existing.timer);
          existing.timer = setTimeout(() => releaseLock(nodeId), NODE_LOCK_TIMEOUT_MS);
        } else {
          // Deny — locked by someone else
          socket.emit(SOCKET_EVENTS.NODE_LOCK_DENIED, {
            nodeId,
            lockedBy: existing.userId,
          });
        }
        return;
      }

      // Grant lock
      const timer = setTimeout(() => releaseLock(nodeId), NODE_LOCK_TIMEOUT_MS);
      locks.set(nodeId, { userId, socketId: socket.id, pageId, timer });
      socketLocks.get(socket.id)?.add(nodeId);

      io.to(roomName).emit(SOCKET_EVENTS.NODE_LOCK, { nodeId, userId, locked: true });
    });

    // ── node:unlock ───────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.NODE_UNLOCK, (payload: { nodeId: string; userId: string; pageId: string }) => {
      const { nodeId, userId } = payload;
      const lock = locks.get(nodeId);
      if (lock && lock.userId === userId) {
        releaseLock(nodeId);
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const pageId = socketPage.get(socket.id);

      releaseAllLocksForSocket(socket.id);

      if (pageId) {
        // Find which userId this socket belonged to
        const pageRoom = rooms.get(pageId);
        if (pageRoom) {
          let leavingUserId: string | null = null;
          pageRoom.forEach((user) => {
            if (user.socketId === socket.id) leavingUserId = user.userId;
          });
          if (leavingUserId) {
            pageRoom.delete(leavingUserId);
            if (pageRoom.size === 0) rooms.delete(pageId);
            io.to(`page:${pageId}`).emit(SOCKET_EVENTS.USER_LEAVE, { userId: leavingUserId });
          }
        }
        socketPage.delete(socket.id);
      }
    });
  });

  return io;
}

// ─── Broadcast helper (used by REST routes) ───────────────────────────────────

export function emitToPage(pageId: string, event: string, data: unknown): void {
  _io?.to(`page:${pageId}`).emit(event, data);
}
