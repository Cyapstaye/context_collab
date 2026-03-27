import { create } from 'zustand';
import type { NodeStyleSettings } from '@context-collab/shared';
import { api } from '../api';

export const DEFAULT_DESIGN_SETTINGS: NodeStyleSettings = {
  defaultBorderWidth: 1,
  defaultBorderColor: '#374151',
  defaultFontWeight: 400,
  selectedBorderWidth: 2,
  selectedBorderColor: '#374151',
  selectedFontWeight: 600,
  arcGap: 10,
  arcDotSize: 8,
  arcAngleStep: 18,
};

interface DesignStore {
  /** Currently applied settings — what nodes render with */
  settings: NodeStyleSettings;
  /** Last successfully persisted settings — used for revert on cancel */
  savedSettings: NodeStyleSettings;

  load: () => Promise<void>;
  /** Apply settings to canvas immediately (no DB write) */
  preview: (s: NodeStyleSettings) => void;
  /** Persist settings to DB and update savedSettings */
  save: (s: NodeStyleSettings) => Promise<void>;
  /** Discard unsaved changes — revert canvas to last saved state */
  revert: () => void;
}

export const useDesignStore = create<DesignStore>()((set, get) => ({
  settings: { ...DEFAULT_DESIGN_SETTINGS },
  savedSettings: { ...DEFAULT_DESIGN_SETTINGS },

  load: async () => {
    try {
      const { data } = await api.getDesignSettings();
      set({ settings: data, savedSettings: data });
    } catch {
      // keep defaults
    }
  },

  preview: (s) => {
    set({ settings: s });
  },

  save: async (s) => {
    await api.saveDesignSettings(s);
    set({ settings: s, savedSettings: s });
  },

  revert: () => {
    set({ settings: get().savedSettings });
  },
}));
