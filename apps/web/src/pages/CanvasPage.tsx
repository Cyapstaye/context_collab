import { useParams } from 'react-router-dom';
import LeftBar from '../components/layout/LeftBar';
import CanvasArea from '../components/layout/CanvasArea';
import RightBar from '../components/layout/RightBar';

export default function CanvasPage() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <LeftBar projectId={projectId ?? ''} pageId={pageId ?? ''} />
      <CanvasArea />
      <RightBar />
    </div>
  );
}
