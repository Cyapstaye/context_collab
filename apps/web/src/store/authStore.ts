import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  // True until init() has resolved (prevents flash of login page)
  initializing: boolean;

  // Derived: v1 permission model —
  //   authenticated (seeded/logged-in) users → full edit access
  //   unauthenticated (not logged in)          → view-only
  // There is no "authenticated viewer" role in v1.
  isViewOnly: () => boolean;

  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = 'collab:token';

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  token: null,
  initializing: true,

  isViewOnly: () => get().user === null,

  init: async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      set({ initializing: false });
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!res.ok) throw new Error('token invalid');
      const json = await res.json() as { data: AuthUser };
      const user = json.data;

      // Persist real identity for socket/presence use
      _persistIdentity(user, stored);

      set({ user, token: stored, initializing: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, initializing: false });
    }
  },

  login: async (email, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { data?: { token: string; user: AuthUser }; message?: string };
    if (!res.ok) {
      throw new Error(json.message ?? 'Login failed');
    }

    const { token, user } = json.data!;
    localStorage.setItem(TOKEN_KEY, token);

    // Persist real identity for socket/presence use
    _persistIdentity(user, token);

    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    // Restore anonymous identity
    localStorage.removeItem('collab:user');
    set({ user: null, token: null });
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Keep collab:user in sync with auth state so socket.ts picks up the real
// email/id when the user is authenticated.
function _persistIdentity(user: AuthUser, _token: string) {
  const existing = localStorage.getItem('collab:user');
  let color = `hsl(${Math.floor(Math.random() * 360)}, 65%, 48%)`;
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as { color?: string };
      if (parsed.color) color = parsed.color;
    } catch { /* ignore */ }
  }
  localStorage.setItem('collab:user', JSON.stringify({
    userId: user.id,
    email: user.email,
    color,
  }));
}
