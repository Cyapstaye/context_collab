import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

// ─── User identity ─────────────────────────────────────────────────────────────
// Returns the current user identity. When authenticated, auth info is stored in
// collab:user by authStore. When anonymous, a random identity is generated.

function getOrCreateAnonIdentity(): { userId: string; email: string; color: string } {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  const num = Math.floor(Math.random() * 900) + 100;
  const hue = Math.floor(Math.random() * 360);
  return {
    userId: `anon-${suffix}`,
    email: `User #${num}`,
    color: `hsl(${hue}, 65%, 48%)`,
  };
}

/** Returns the current user identity (authenticated or anonymous). */
export function getUserIdentity(): { userId: string; email: string; color: string } {
  const stored = localStorage.getItem('collab:user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { userId?: string; email?: string; color?: string };
      if (parsed.userId && parsed.email && parsed.color) {
        return parsed as { userId: string; email: string; color: string };
      }
    } catch {
      // fall through
    }
  }
  // Generate and persist anon identity
  const identity = getOrCreateAnonIdentity();
  localStorage.setItem('collab:user', JSON.stringify(identity));
  return identity;
}

// Legacy export for backwards-compat — evaluated at module load time.
// Components that need a stable reference use this. Since it's read at
// load time, authenticated users should ensure auth.init() runs before
// any canvas route is first rendered.
export const userIdentity = getUserIdentity();

// ─── Socket singleton (lazy connect) ─────────────────────────────────────────

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SERVER_URL, { autoConnect: false });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const socket = getSocket();
  if (!socket.connected) {
    // Pass JWT token so the server can verify and tag the socket as authenticated.
    const token = localStorage.getItem('collab:token');
    socket.auth = { token: token ?? null };
    socket.connect();
  }
  return socket;
}

/**
 * Force-reconnects the socket with the latest token from localStorage.
 * Call this after login or logout so the server middleware re-runs with the
 * updated (or cleared) JWT, updating socket.data.user server-side.
 * The PAGE_JOIN re-send is handled by the `socket.on('connect', joinRoom)`
 * listener registered in usePageSocket.
 */
export function reconnectSocket(): void {
  const socket = getSocket();
  const token = localStorage.getItem('collab:token');
  socket.auth = { token: token ?? null };
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}
