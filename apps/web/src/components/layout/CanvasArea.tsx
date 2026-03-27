import { useNavigate } from 'react-router-dom';
import { VIEW_LABELS } from '@context-collab/shared';
import type { ViewName } from '@context-collab/shared';
import { useCanvasStore } from '../../store/canvasStore';
import { useRealtimeStore } from '../../store/realtimeStore';
import { useAuthStore } from '../../store/authStore';
import FlowCanvas from '../canvas/FlowCanvas';
import PresenceBar from '../canvas/PresenceBar';

const VIEWS: ViewName[] = ['element', 'proposition', 'layer'];

export default function CanvasArea() {
  const navigate = useNavigate();
  const activeView = useCanvasStore((s) => s.activeView);
  const setActiveView = useCanvasStore((s) => s.setActiveView);
  const mutationError = useCanvasStore((s) => s.mutationError);
  const clearMutationError = useCanvasStore((s) => s.clearMutationError);
  const lockDeniedMessage = useRealtimeStore((s) => s.lockDeniedMessage);
  const setLockDeniedMessage = useRealtimeStore((s) => s.setLockDeniedMessage);
  const isViewOnly = useAuthStore((s) => s.isViewOnly());

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden">
      {/* View-only banner */}
      {isViewOnly && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 flex-shrink-0">
          <span>View-only mode — to edit,</span>
          <button
            onClick={() => navigate('/login')}
            className="font-medium underline hover:text-amber-900"
          >
            log in
          </button>
        </div>
      )}

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

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {activeView === 'layer' && 'Layer view — concentric depth rings'}
            {activeView === 'element' && 'Element view — edge opacity = weight'}
            {activeView === 'proposition' && 'Proposition view — propositions only'}
          </span>
          <PresenceBar />
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 overflow-hidden">
        <FlowCanvas activeView={activeView} />
      </div>

      {/* Lock denied toast */}
      {lockDeniedMessage && (
        <div className="absolute bottom-12 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow">
          <span>🔒 {lockDeniedMessage}</span>
          <button
            onClick={() => setLockDeniedMessage(null)}
            className="ml-1 text-amber-500 hover:text-amber-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mutation error toast */}
      {mutationError && (
        <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow">
          <span>{mutationError}</span>
          <button
            onClick={clearMutationError}
            className="ml-1 text-red-400 hover:text-red-600"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
