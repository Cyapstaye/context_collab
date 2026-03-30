import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../store/canvasStore';
import { useLabelFilterStore } from '../store/labelFilterStore';
import { usePageSocket } from '../hooks/usePageSocket';
import LeftBar from '../components/layout/LeftBar';
import CanvasArea from '../components/layout/CanvasArea';

export default function CanvasPage() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const navigate = useNavigate();
  const loadPage = useCanvasStore((s) => s.loadPage);
  const loading = useCanvasStore((s) => s.loading);
  const loadError = useCanvasStore((s) => s.loadError);
  const resetLabelFilter = useLabelFilterStore((s) => s.reset);

  useEffect(() => {
    if (projectId && pageId) {
      resetLabelFilter();
      loadPage(projectId, pageId);
    }
  }, [projectId, pageId, loadPage, resetLabelFilter]);

  // Connect to realtime room for this page
  usePageSocket(pageId ?? null);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <p className="text-sm text-gray-400">Loading page...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">Failed to load page.</p>
          <p className="text-xs text-gray-400">{loadError}</p>
          <button
            onClick={() => projectId ? navigate(`/projects/${projectId}`) : navigate('/')}
            className="rounded bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-gray-700"
          >
            Back to project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <LeftBar projectId={projectId ?? ''} pageId={pageId ?? ''} />
      <CanvasArea />
    </div>
  );
}
