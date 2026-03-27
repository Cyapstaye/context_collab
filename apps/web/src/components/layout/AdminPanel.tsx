import { useState, useEffect, useCallback } from 'react';
import type { NodeStyleSettings } from '@context-collab/shared';
import { useDesignStore, DEFAULT_DESIGN_SETTINGS } from '../../store/designStore';

interface AdminPanelProps {
  onClose: () => void;
}

const FONT_WEIGHT_OPTIONS = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semibold (600)' },
  { value: 700, label: 'Bold (700)' },
];

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const settings = useDesignStore((s) => s.settings);
  const preview = useDesignStore((s) => s.preview);
  const save = useDesignStore((s) => s.save);
  const revert = useDesignStore((s) => s.revert);

  const [draft, setDraft] = useState<NodeStyleSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // When panel first opens, snapshot current settings as draft baseline
  // (settings may have been loaded from DB after initial render)
  useEffect(() => {
    setDraft({ ...settings });
    // Only on mount — ignore subsequent settings changes (those come from preview)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply draft changes to canvas in real-time
  const update = useCallback(<K extends keyof NodeStyleSettings>(key: K, value: NodeStyleSettings[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      preview(next);
      return next;
    });
  }, [preview]);

  async function handleSave() {
    setSaving(true);
    try {
      await save(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      alert('Failed to save — check you are logged in as admin.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    revert();
    onClose();
  }

  function handleReset() {
    setDraft({ ...DEFAULT_DESIGN_SETTINGS });
    preview({ ...DEFAULT_DESIGN_SETTINGS });
  }

  return (
    <div className="absolute right-3 top-3 bottom-3 w-64 z-30 flex flex-col rounded-xl overflow-hidden bg-panel shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 flex-shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Admin — Design Settings
        </span>
        <button
          onClick={handleClose}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close admin panel"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Default state */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Default (unselected)
          </h3>
          <div className="space-y-2">
            <FieldRow label="Border width">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((w) => (
                  <button
                    key={w}
                    onClick={() => update('defaultBorderWidth', w)}
                    className={[
                      'flex h-6 w-8 items-center justify-center rounded text-[10px] font-medium transition-colors',
                      draft.defaultBorderWidth === w
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label="Border color">
              <ColorInput
                value={draft.defaultBorderColor}
                onChange={(v) => update('defaultBorderColor', v)}
              />
            </FieldRow>

            <FieldRow label="Font weight">
              <select
                value={draft.defaultFontWeight}
                onChange={(e) => update('defaultFontWeight', Number(e.target.value))}
                className="w-full rounded border border-border bg-white px-2 py-1 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                {FONT_WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FieldRow>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Label arc (element node) */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Label Dots (arc)
          </h3>
          <div className="space-y-2">
            <FieldRow label={`Gap from node edge — ${draft.arcGap}px`}>
              <input
                type="range" min={4} max={30} step={1}
                value={draft.arcGap}
                onChange={(e) => update('arcGap', Number(e.target.value))}
                className="w-full"
              />
            </FieldRow>
            <FieldRow label={`Dot size — ${draft.arcDotSize}px`}>
              <input
                type="range" min={4} max={16} step={1}
                value={draft.arcDotSize}
                onChange={(e) => update('arcDotSize', Number(e.target.value))}
                className="w-full"
              />
            </FieldRow>
            <FieldRow label={`Dot spacing — ${draft.arcAngleStep}°`}>
              <input
                type="range" min={8} max={40} step={2}
                value={draft.arcAngleStep}
                onChange={(e) => update('arcAngleStep', Number(e.target.value))}
                className="w-full"
              />
            </FieldRow>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Selected state */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Selected
          </h3>
          <div className="space-y-2">
            <FieldRow label="Border width">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((w) => (
                  <button
                    key={w}
                    onClick={() => update('selectedBorderWidth', w)}
                    className={[
                      'flex h-6 w-8 items-center justify-center rounded text-[10px] font-medium transition-colors',
                      draft.selectedBorderWidth === w
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label="Border color">
              <ColorInput
                value={draft.selectedBorderColor}
                onChange={(v) => update('selectedBorderColor', v)}
              />
            </FieldRow>

            <FieldRow label="Font weight">
              <select
                value={draft.selectedFontWeight}
                onChange={(e) => update('selectedFontWeight', Number(e.target.value))}
                className="w-full rounded border border-border bg-white px-2 py-1 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                {FONT_WEIGHT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FieldRow>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 flex-shrink-0 gap-2">
        <button
          onClick={handleReset}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline"
        >
          Reset defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'rounded px-3 py-1.5 text-[11px] font-medium transition-colors',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-700',
          ].join(' ')}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
        style={{ appearance: 'none' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-border px-2 py-0.5 text-[11px] font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
        placeholder="#374151"
        maxLength={7}
      />
    </div>
  );
}
