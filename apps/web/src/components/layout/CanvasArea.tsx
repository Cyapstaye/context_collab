import { VIEW_LABELS } from '@context-collab/shared';
import type { ViewName } from '@context-collab/shared';
import { useState } from 'react';

const VIEWS: ViewName[] = ['element', 'proposition', 'layer'];

interface Props {
  pageId: string;
}

export default function CanvasArea({ pageId }: Props) {
  const [activeView, setActiveView] = useState<ViewName>('element');

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden">
      {/* View switcher bar */}
      <div className="flex items-center gap-1 border-b border-border bg-panel px-4 py-2">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={[
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              activeView === v
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            ].join(' ')}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
        {/* 3D axis view — stub, hidden in v1 */}
      </div>

      {/* Canvas placeholder */}
      <div className="flex flex-1 items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="text-sm text-gray-400">
            캔버스 영역 — {VIEW_LABELS[activeView]}
          </p>
          <p className="mt-1 text-xs text-gray-300">페이지 ID: {pageId}</p>
          <p className="mt-1 text-xs text-gray-300">React Flow 연동 예정 (Phase 2)</p>
        </div>
      </div>
    </main>
  );
}
