import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Project } from '@context-collab/shared';

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.listProjects()
      .then((res) => setProjects(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await api.createProject({ name });
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('프로젝트를 삭제하시겠습니까? 모든 페이지가 함께 삭제됩니다.')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Header */}
      <div className="border-b border-border bg-panel px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Context Collab</h1>
          <p className="text-xs text-gray-500 mt-0.5">지식 그래프 협업 캔버스</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + 새 프로젝트
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Create form */}
        {showForm && (
          <div className="mb-6 flex gap-2 items-center">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setShowForm(false); setNewName(''); }
              }}
              placeholder="프로젝트 이름..."
              className="flex-1 max-w-sm rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {creating ? '생성 중...' : '생성'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(''); }}
              className="rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        )}

        {!loading && projects.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-gray-500 mb-4">아직 프로젝트가 없습니다.</p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              첫 프로젝트 만들기
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="group flex items-center justify-between rounded-lg border border-border bg-panel px-5 py-4 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 group-hover:text-gray-600">
                    열기 →
                  </span>
                  <button
                    onClick={(e) => handleDelete(p.id, e)}
                    className="ml-2 rounded px-2 py-0.5 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
