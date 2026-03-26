import { useNavigate } from 'react-router-dom';

// Phase 3: full project list + create
// Phase 2: direct entry to demo canvas for local testing
export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-800">Context Collab</h1>
        <p className="text-sm text-gray-500">지식 그래프 협업 캔버스</p>
        <button
          onClick={() => navigate('/projects/demo/pages/page1')}
          className="mt-4 rounded bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          캔버스 열기 →
        </button>
        <p className="text-xs text-gray-400">Phase 2 — 단일 사용자 캔버스 데모</p>
      </div>
    </div>
  );
}
