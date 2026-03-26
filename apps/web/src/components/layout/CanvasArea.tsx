import { VIEW_LABELS } from '@context-collab/shared';
import type { ViewName } from '@context-collab/shared';
import { useCanvasStore } from '../../store/canvasStore';
import FlowCanvas from '../canvas/FlowCanvas';

const VIEWS: ViewName[] = ['element', 'proposition', 'layer'];

export default function CanvasArea() {
  const activeView = useCanvasStore((s) => s.activeView);
  const setActiveView = useCanvasStore((s) => s.setActiveView);

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden">
      {/* View switcher bar */}
      <div className="flex items-center gap-1 border-b border-border bg-panel px-4 py-2 flex-shrink-0">
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
        {/* 3D axis — stub, hidden in v1 */}

        <span className="ml-auto text-xs text-gray-400">
          {activeView === 'layer' && '층위 뷰 — 동심원 가이드 표시'}
          {activeView === 'element' && '요소 뷰 — 엣지 투명도 = 가중치'}
          {activeView === 'proposition' && '명제 뷰 — 명제 노드만 표시'}
        </span>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 overflow-hidden">
        <FlowCanvas activeView={activeView} />
      </div>
    </main>
  );
}
