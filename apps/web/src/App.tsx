import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import CanvasPage from './pages/CanvasPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initializing = useAuthStore((s) => s.initializing);

  useEffect(() => {
    init();
  }, [init]);

  // Don't render routes until auth state is resolved to avoid flicker
  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <p className="text-sm text-gray-400">초기화 중...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/projects/:projectId" element={<ProjectPage />} />
      <Route path="/projects/:projectId/pages/:pageId" element={<CanvasPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
