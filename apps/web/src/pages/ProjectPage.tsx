import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { PageExport } from '../api';
import type { Project, Page } from '@context-collab/shared';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      api.getProject(projectId),
      api.listPages(projectId),
    ])
      .then(([projRes, pagesRes]) => {
        setProject(projRes.data);
        setPages(pagesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleCreatePage() {
    const name = newPageName.trim();
    if (!name || !projectId) return;
    setCreating(true);
    try {
      const res = await api.createPage(projectId, { name });
      navigate(`/projects/${projectId}/pages/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  async function handleDeletePage(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!projectId) return;
    if (!confirm('Delete this page?')) return;
    try {
      await api.deletePage(projectId, id);
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDuplicate(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!projectId) return;
    try {
      const res = await api.duplicatePage(projectId, id);
      setPages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleExport(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!projectId) return;
    try {
      const res = await api.exportPage(projectId, id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const pageName = pages.find((p) => p.id === id)?.name ?? 'page';
      a.download = `${pageName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }

  function handleImportClick() {
    importRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as PageExport;
      const res = await api.importPage(projectId, data);
      setPages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed: make sure the file is a valid page JSON export.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="text-sm text-gray-600">Project not found.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-blue-500 hover:text-blue-700"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Header */}
      <div className="border-b border-border bg-panel px-8 py-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 block"
          >
            ← Home
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden file input for import */}
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-500 hover:text-gray-800 transition-colors"
          >
            Import
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            + New page
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Create form */}
        {showForm && (
          <div className="mb-6 flex gap-2 items-center">
            <input
              autoFocus
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePage();
                if (e.key === 'Escape') { setShowForm(false); setNewPageName(''); }
              }}
              placeholder="Page name..."
              className="flex-1 max-w-sm rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-500"
            />
            <button
              onClick={handleCreatePage}
              disabled={creating}
              className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewPageName(''); }}
              className="rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}

        {pages.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-gray-500 mb-4">No pages yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Create first page
            </button>
          </div>
        )}

        {pages.length > 0 && (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {pages.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${projectId}/pages/${p.id}`)}
                className="group flex items-center justify-between rounded-lg border border-border bg-panel px-5 py-4 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(p.createdAt).toLocaleDateString('en-US')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleExport(p.id, e)}
                    className="rounded px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                    title="Export JSON"
                  >
                    Export
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(p.id, e)}
                    className="rounded px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                    title="Duplicate"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => handleDeletePage(p.id, e)}
                    className="rounded px-2 py-0.5 text-xs text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    Delete
                  </button>
                  <span className="ml-1 text-xs text-gray-400 group-hover:text-gray-600">
                    Open →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
