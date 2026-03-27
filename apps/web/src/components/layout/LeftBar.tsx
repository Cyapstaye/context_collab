import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import type { NodeType } from '@context-collab/shared';

interface Props {
  projectId: string;
  pageId: string;
}

interface AddFormState {
  open: boolean;
  type: NodeType;
  name: string;
}

const CLOSED: AddFormState = { open: false, type: 'element', name: '' };

export default function LeftBar({ projectId, pageId }: Props) {
  const navigate = useNavigate();
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const addNode = useCanvasStore((s) => s.addNode);
  const selectNodeFromSidebar = useCanvasStore((s) => s.selectNodeFromSidebar);
  const isViewOnly = useAuthStore((s) => s.isViewOnly());

  const [form, setForm] = useState<AddFormState>(CLOSED);
  const [projectName, setProjectName] = useState<string>('');
  const [pageName, setPageName] = useState<string>('');

  // Fetch project name
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/v1/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => { if (data.data?.name) setProjectName(data.data.name); })
      .catch(() => setProjectName(projectId));
  }, [projectId]);

  // Fetch page name
  useEffect(() => {
    if (!projectId || !pageId) return;
    fetch(`/api/v1/projects/${projectId}/pages/${pageId}`)
      .then((r) => r.json())
      .then((data) => { if (data.data?.name) setPageName(data.data.name); })
      .catch(() => setPageName(pageId));
  }, [projectId, pageId]);

  const elements = nodes.filter((n) => n.type === 'element');
  const propositions = nodes.filter((n) => n.type === 'proposition');

  function openForm(type: NodeType) {
    if (isViewOnly) return;
    setForm({ open: true, type, name: '' });
  }

  function submitForm() {
    const name = form.name.trim();
    if (!name) return;
    addNode(form.type, name);
    setForm(CLOSED);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') submitForm();
    if (e.key === 'Escape') setForm(CLOSED);
  }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border bg-panel">
      {/* Project name */}
      <div className="border-b border-border px-4 py-3">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-xs text-gray-400 hover:text-gray-600 mb-0.5 block text-left"
        >
          ← 프로젝트
        </button>
        <h2 className="truncate text-sm font-semibold text-gray-800">
          {projectName || projectId || '—'}
        </h2>
      </div>

      {/* Page */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-gray-500">페이지</p>
        <p className="mt-0.5 truncate text-xs text-gray-600">{pageName || pageId || '—'}</p>
      </div>

      {/* Nodes list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Elements */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">요소 Element</p>
            {!isViewOnly && (
              <button
                onClick={() => openForm('element')}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                + 추가
              </button>
            )}
          </div>

          {form.open && form.type === 'element' && (
            <div className="mb-2 flex gap-1">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="이름..."
                className="flex-1 rounded border border-blue-300 px-2 py-0.5 text-xs outline-none focus:border-blue-500"
              />
              <button
                onClick={submitForm}
                className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600"
              >
                ✓
              </button>
              <button
                onClick={() => setForm(CLOSED)}
                className="rounded px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}

          {elements.length === 0 ? (
            <p className="text-xs text-gray-400 italic">비어 있음</p>
          ) : (
            <ul className="space-y-0.5">
              {elements.map((n) => (
                <li
                  key={n.id}
                  onClick={() => selectNodeFromSidebar(n.id)}
                  className={[
                    'truncate rounded px-2 py-1 text-xs cursor-pointer',
                    selectedNodeId === n.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {n.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Propositions */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">명제 Proposition</p>
            {!isViewOnly && (
              <button
                onClick={() => openForm('proposition')}
                className="text-xs text-amber-500 hover:text-amber-700 font-medium"
              >
                + 추가
              </button>
            )}
          </div>

          {form.open && form.type === 'proposition' && (
            <div className="mb-2 flex gap-1">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="이름..."
                className="flex-1 rounded border border-amber-300 px-2 py-0.5 text-xs outline-none focus:border-amber-500"
              />
              <button
                onClick={submitForm}
                className="rounded bg-amber-500 px-2 py-0.5 text-xs text-white hover:bg-amber-600"
              >
                ✓
              </button>
              <button
                onClick={() => setForm(CLOSED)}
                className="rounded px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}

          {propositions.length === 0 ? (
            <p className="text-xs text-gray-400 italic">비어 있음</p>
          ) : (
            <ul className="space-y-0.5">
              {propositions.map((n) => (
                <li
                  key={n.id}
                  onClick={() => selectNodeFromSidebar(n.id)}
                  className={[
                    'truncate rounded px-2 py-1 text-xs cursor-pointer',
                    selectedNodeId === n.id
                      ? 'bg-amber-100 text-amber-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {n.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
