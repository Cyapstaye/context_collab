import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api';
import type { NodeType, Page } from '@context-collab/shared';

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
  const activeView = useCanvasStore((s) => s.activeView);
  const addNode = useCanvasStore((s) => s.addNode);
  const selectNodeFromSidebar = useCanvasStore((s) => s.selectNodeFromSidebar);
  const updateNodeName = useCanvasStore((s) => s.updateNodeName);
  const isViewOnly = useAuthStore((s) => s.isViewOnly());

  const [form, setForm] = useState<AddFormState>(CLOSED);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameValueRef = useRef(renamingValue);
  renameValueRef.current = renamingValue;

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  // ── Project / page state ───────────────────────────────────────────────────
  const [projectName, setProjectName] = useState<string>('');
  const [pages, setPages] = useState<Page[]>([]);
  const [addingPage, setAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [confirmDeletePageId, setConfirmDeletePageId] = useState<string | null>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId) return;
    api.getProject(projectId)
      .then((r) => setProjectName(r.data.name))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    api.listPages(projectId)
      .then((r) => setPages([...r.data].sort((a, b) => a.order - b.order)))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (addingPage) pageInputRef.current?.focus();
  }, [addingPage]);

  async function submitNewPage() {
    const name = newPageName.trim();
    if (!name || !projectId) return;
    const res = await api.createPage(projectId, { name });
    setPages((p) => [...p, res.data]);
    setNewPageName('');
    setAddingPage(false);
    navigate(`/projects/${projectId}/pages/${res.data.id}`);
  }

  async function deletePage(id: string) {
    if (pages.length <= 1 || !projectId) return;
    await api.deletePage(projectId, id);
    const next = pages.filter((p) => p.id !== id);
    setPages(next);
    if (id === pageId) {
      navigate(`/projects/${projectId}/pages/${next[0].id}`);
    }
  }

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

  function startRename(nodeId: string, currentName: string) {
    if (isViewOnly) return;
    setRenamingId(nodeId);
    setRenamingValue(currentName);
    // Focus is handled by useEffect triggered by renamingId change
  }

  function commitRename() {
    const trimmed = renameValueRef.current.trim();
    if (renamingId && trimmed) {
      updateNodeName(renamingId, trimmed);
    }
    setRenamingId(null);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); }
  }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border bg-panel">
      {/* Project name */}
      <div className="border-b border-border px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-gray-400 hover:text-gray-600 mb-0.5 block text-left"
        >
          ← Home
        </button>
        <h2 className="truncate text-sm font-semibold text-gray-800">
          {projectName || '—'}
        </h2>
      </div>

      {/* Pages */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-500">Pages</p>
          {!isViewOnly && (
            <button
              onClick={() => setAddingPage(true)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              + Add
            </button>
          )}
        </div>

        <ul className="space-y-0.5">
          {pages.map((p) => (
            <li
              key={p.id}
              className={[
                'group flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer',
                p.id === pageId
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => p.id !== pageId && navigate(`/projects/${projectId}/pages/${p.id}`)}
            >
              <span className="truncate">{p.name}</span>
              {!isViewOnly && pages.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeletePageId(p.id); }}
                  className="ml-1 hidden group-hover:inline text-gray-400 hover:text-red-500"
                  title="Delete page"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>

        {addingPage && (
          <div className="mt-1.5 flex gap-1">
            <input
              ref={pageInputRef}
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewPage();
                if (e.key === 'Escape') { setAddingPage(false); setNewPageName(''); }
              }}
              placeholder="Page name…"
              className="flex-1 rounded border border-blue-300 px-2 py-0.5 text-xs outline-none focus:border-blue-500"
            />
            <button
              onClick={submitNewPage}
              className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600"
            >
              ✓
            </button>
            <button
              onClick={() => { setAddingPage(false); setNewPageName(''); }}
              className="rounded px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Nodes list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Elements */}
        <section className={[
          'transition-opacity duration-200',
          activeView === 'proposition' ? 'opacity-40' : 'opacity-100',
        ].join(' ')}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">Element</p>
            {!isViewOnly && (
              <button
                onClick={() => openForm('element')}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                + Add
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
                placeholder="Name..."
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
            <p className="text-xs text-gray-400 italic">Empty</p>
          ) : (
            <ul className="space-y-0.5">
              {elements.map((n) => (
                <li
                  key={n.id}
                  onClick={() => selectNodeFromSidebar(n.id)}
                  onDoubleClick={() => startRename(n.id, n.name)}
                  className={[
                    'rounded px-2 py-1 text-xs cursor-pointer',
                    selectedNodeId === n.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {renamingId === n.id ? (
                    <input
                      ref={renameInputRef}
                      className="w-full bg-transparent outline-none"
                      value={renamingValue}
                      onChange={(e) => setRenamingValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate block">{n.name}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Propositions */}
        <section className={[
          'transition-opacity duration-200',
          activeView === 'element' ? 'opacity-40' : 'opacity-100',
        ].join(' ')}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500">Proposition</p>
            {!isViewOnly && (
              <button
                onClick={() => openForm('proposition')}
                className="text-xs text-amber-500 hover:text-amber-700 font-medium"
              >
                + Add
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
                placeholder="Name..."
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
            <p className="text-xs text-gray-400 italic">Empty</p>
          ) : (
            <ul className="space-y-0.5">
              {propositions.map((n) => (
                <li
                  key={n.id}
                  onClick={() => selectNodeFromSidebar(n.id)}
                  onDoubleClick={() => startRename(n.id, n.name)}
                  className={[
                    'rounded px-2 py-1 text-xs cursor-pointer',
                    selectedNodeId === n.id
                      ? 'bg-amber-100 text-amber-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {renamingId === n.id ? (
                    <input
                      ref={renameInputRef}
                      className="w-full bg-transparent outline-none"
                      value={renamingValue}
                      onChange={(e) => setRenamingValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate block">{n.name}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Page delete confirmation dialog */}
      {confirmDeletePageId && (() => {
        const target = pages.find((p) => p.id === confirmDeletePageId);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setConfirmDeletePageId(null)}
          >
            <div
              className="mx-4 w-72 rounded-xl bg-white shadow-2xl border border-border p-5 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800">Delete page?</p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">"{target?.name}"</span>
                  {' '}and all its nodes and connections will be permanently deleted. This cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDeletePageId(null)}
                  className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deletePage(confirmDeletePageId);
                    setConfirmDeletePageId(null);
                  }}
                  className="rounded px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}
