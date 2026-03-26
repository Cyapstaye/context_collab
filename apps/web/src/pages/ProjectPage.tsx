// Phase 3: project detail + pages list
import { useParams } from 'react-router-dom';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-800">프로젝트</h1>
        <p className="mt-2 text-sm text-gray-500">ID: {projectId}</p>
        <p className="mt-1 text-sm text-gray-400">페이지 목록 (Phase 3에서 구현)</p>
      </div>
    </div>
  );
}
