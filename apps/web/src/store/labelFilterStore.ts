import { create } from 'zustand';

interface LabelFilterStore {
  /** Labels whose nodes should be hidden from the canvas */
  hiddenLabels: Set<string>;
  /** Label name being highlighted; all other nodes are dimmed */
  focusedLabel: string | null;

  toggleHidden: (name: string) => void;
  setFocused: (name: string | null) => void;
  /** Call when navigating to a different page to reset state */
  reset: () => void;
}

export const useLabelFilterStore = create<LabelFilterStore>()((set) => ({
  hiddenLabels: new Set(),
  focusedLabel: null,

  toggleHidden: (name) =>
    set((s) => {
      const next = new Set(s.hiddenLabels);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { hiddenLabels: next };
    }),

  setFocused: (name) =>
    set((s) => ({ focusedLabel: s.focusedLabel === name ? null : name })),

  reset: () => set({ hiddenLabels: new Set(), focusedLabel: null }),
}));
