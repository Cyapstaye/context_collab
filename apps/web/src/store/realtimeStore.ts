import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceEntry {
  userId: string;
  email: string;
  color: string;
}

export interface CursorEntry {
  userId: string;
  email: string;
  color: string;
  x: number;
  y: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface RealtimeStore {
  presenceUsers: PresenceEntry[];
  // nodeId → userId of lock holder
  nodeLocks: Record<string, string>;
  // userId → CursorEntry
  cursors: Record<string, CursorEntry>;
  // Non-null when a lock request was denied — shown as a toast
  lockDeniedMessage: string | null;

  setPresenceList: (users: PresenceEntry[], locks: Array<{ nodeId: string; userId: string }>) => void;
  addPresenceUser: (user: PresenceEntry) => void;
  removePresenceUser: (userId: string) => void;
  updateCursor: (userId: string, x: number, y: number) => void;
  setNodeLock: (nodeId: string, userId: string) => void;
  clearNodeLock: (nodeId: string) => void;
  setLockDeniedMessage: (msg: string | null) => void;
  reset: () => void;
}

export const useRealtimeStore = create<RealtimeStore>()((set, get) => ({
  presenceUsers: [],
  nodeLocks: {},
  cursors: {},
  lockDeniedMessage: null,

  setPresenceList: (users, locks) => {
    const nodeLocks: Record<string, string> = {};
    locks.forEach((l) => { nodeLocks[l.nodeId] = l.userId; });
    set({ presenceUsers: users, nodeLocks });
  },

  addPresenceUser: (user) =>
    set((s) => ({
      presenceUsers: s.presenceUsers.some((u) => u.userId === user.userId)
        ? s.presenceUsers
        : [...s.presenceUsers, user],
    })),

  removePresenceUser: (userId) =>
    set((s) => {
      const cursors = { ...s.cursors };
      delete cursors[userId];
      return {
        presenceUsers: s.presenceUsers.filter((u) => u.userId !== userId),
        cursors,
      };
    }),

  updateCursor: (userId, x, y) => {
    const user = get().presenceUsers.find((u) => u.userId === userId);
    if (!user) return;
    set((s) => ({
      cursors: {
        ...s.cursors,
        [userId]: { userId, email: user.email, color: user.color, x, y },
      },
    }));
  },

  setNodeLock: (nodeId, userId) =>
    set((s) => ({ nodeLocks: { ...s.nodeLocks, [nodeId]: userId } })),

  clearNodeLock: (nodeId) =>
    set((s) => {
      const nodeLocks = { ...s.nodeLocks };
      delete nodeLocks[nodeId];
      return { nodeLocks };
    }),

  setLockDeniedMessage: (msg) => set({ lockDeniedMessage: msg }),

  reset: () => set({ presenceUsers: [], nodeLocks: {}, cursors: {}, lockDeniedMessage: null }),
}));
