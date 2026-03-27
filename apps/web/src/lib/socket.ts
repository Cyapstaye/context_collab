import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

// ─── Persistent user identity (per browser) ───────────────────────────────────

function getOrCreateIdentity(): { userId: string; email: string; color: string } {
  const stored = localStorage.getItem('collab:user');
  if (stored) {
    try {
      return JSON.parse(stored) as { userId: string; email: string; color: string };
    } catch {
      // fall through
    }
  }
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  const num = Math.floor(Math.random() * 900) + 100;
  const hue = Math.floor(Math.random() * 360);
  const identity = {
    userId: `anon-${suffix}`,
    email: `User #${num}`,
    color: `hsl(${hue}, 65%, 48%)`,
  };
  localStorage.setItem('collab:user', JSON.stringify(identity));
  return identity;
}

export const userIdentity = getOrCreateIdentity();

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
    socket.connect();
  }
  return socket;
}
