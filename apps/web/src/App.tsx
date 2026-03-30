import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useDesignStore } from './store/designStore';
import { api } from './api';
import HomePage from './pages/HomePage';
import CanvasPage from './pages/CanvasPage';
import LoginPage from './pages/LoginPage';

// Redirects /projects/:projectId → first page of the project (creates one if empty)
function ProjectRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    api.listPages(projectId)
      .then(async (res) => {
        const sorted = [...res.data].sort((a, b) => a.order - b.order);
        if (sorted.length > 0) {
          navigate(`/projects/${projectId}/pages/${sorted[0].id}`, { replace: true });
        } else {
          const page = await api.createPage(projectId, { name: 'Page 1' });
          navigate(`/projects/${projectId}/pages/${page.data.id}`, { replace: true });
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId, navigate]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <p className="text-sm text-gray-400">Loading project…</p>
    </div>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initializing = useAuthStore((s) => s.initializing);
  const loadDesignSettings = useDesignStore((s) => s.load);

  useEffect(() => {
    init();
    loadDesignSettings();
  }, [init, loadDesignSettings]);

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <p className="text-sm text-gray-400">Initializing...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/projects/:projectId" element={<ProjectRedirect />} />
      <Route path="/projects/:projectId/pages/:pageId" element={<CanvasPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
