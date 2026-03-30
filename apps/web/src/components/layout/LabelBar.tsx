import { useCanvasStore } from '../../store/canvasStore';
import { useLabelFilterStore } from '../../store/labelFilterStore';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
      <ellipse cx="7" cy="7" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="7" cy="7" r="1.6" fill="currentColor" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
      <ellipse cx="7" cy="7" rx="5.5" ry="3.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
      <circle cx="7" cy="7" r="1.6" fill="currentColor" fillOpacity="0.3" />
      <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function LabelBar() {
  const pageLabels = useCanvasStore((s) => s.pageLabels);
  const hiddenLabels = useLabelFilterStore((s) => s.hiddenLabels);
  const focusedLabel = useLabelFilterStore((s) => s.focusedLabel);
  const toggleHidden = useLabelFilterStore((s) => s.toggleHidden);
  const setFocused = useLabelFilterStore((s) => s.setFocused);

  if (pageLabels.length === 0) return null;

  return (
    <div className="absolute top-4 left-3 z-10 flex flex-col gap-0.5 select-none pointer-events-none">
      {pageLabels.map((label) => {
        const isHidden  = hiddenLabels.has(label.name);
        const isFocused = focusedLabel === label.name;
        const color     = label.color || '#9ca3af';

        return (
          <div
            key={label.name}
            className="group flex items-center gap-2 pointer-events-auto cursor-pointer"
            style={{ opacity: isHidden ? 0.3 : 1 }}
            onClick={() => setFocused(label.name)}
          >
            {/* Color dot */}
            <span
              className="flex-shrink-0 rounded-full transition-transform"
              style={{
                width: isFocused ? 9 : 7,
                height: isFocused ? 9 : 7,
                backgroundColor: color,
              }}
            />

            {/* Label name */}
            <span
              className="text-[11px] transition-opacity"
              style={{
                color: isFocused ? color : '#6b7280',
                fontWeight: isFocused ? 600 : 400,
                opacity: isFocused ? 1 : 0.7,
              }}
            >
              {label.name}
            </span>

            {/* Eye toggle — only on hover */}
            <button
              className={[
                'transition-opacity text-gray-400 hover:text-gray-600',
                isHidden ? 'opacity-60' : 'opacity-0 group-hover:opacity-50',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation();
                toggleHidden(label.name);
              }}
              title={isHidden ? 'Show' : 'Hide'}
            >
              <EyeIcon open={!isHidden} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
