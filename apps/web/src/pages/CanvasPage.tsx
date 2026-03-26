import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../store/canvasStore';
import LeftBar from '../components/layout/LeftBar';
import CanvasArea from '../components/layout/CanvasArea';
import RightBar from '../components/layout/RightBar';

export default function CanvasPage() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const navigate = useNavigate();
  const loadPage = useCanvasStore((s) => s.loadPage);
  const loading = useCanvasStore((s) => s.loading);
  const loadError = useCanvasStore((s) => s.loadError);

  useEffect(() => {
    if (projectId && pageId) {
      loadPage(projectId, pageId);
    }
  }, [projectId, pageId, loadPage]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <p className="text-sm text-gray-400">페이지 불러오는 중...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">페이지를 불러올 수 없습니다.</p>
          <p className="text-xs text-gray-400">{loadError}</p>
          <button
            onClick={() => projectId ? navigate(`/projects/${projectId}`) : navigate('/')}
            className="rounded bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-gray-700"
          >
            프로젝트로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <LeftBar projectId={projectId ?? ''} pageId={pageId ?? ''} />
      <CanvasArea />
      <RightBar />
    </div>
  );
}
