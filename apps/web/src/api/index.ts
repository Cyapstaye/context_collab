import type { Project, Page, Node, Edge, NodePositions, LabelDef, NodeStyleSettings } from '@context-collab/shared';

const BASE = '/api/v1';

async function req<T>(method: string, path: string, body?: unknown): Promise<{ data: T }> {
  const token = localStorage.getItem('collab:token');
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    ...(Object.keys(headers).length > 0 && { headers }),
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (res.status === 204) return { data: undefined as T };
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }
  return json as { data: T };
}

export type PageExport = {
  version: 1;
  page: Page;
  nodes: Node[];
  edges: Edge[];
};

export type CreateNodeInput = {
  type: 'element' | 'proposition';
  name: string;
  labels?: string[];
  size?: number;
  positions?: NodePositions;
};

export type UpdateNodeInput = {
  name?: string;
  labels?: string[];
  size?: number;
  positions?: NodePositions;
};

export const api = {
  // Projects
  listProjects: () => req<Project[]>('GET', '/projects'),
  createProject: (data: { name: string; description?: string }) =>
    req<Project>('POST', '/projects', data),
  getProject: (id: string) => req<Project>('GET', `/projects/${id}`),
  deleteProject: (id: string) => req<void>('DELETE', `/projects/${id}`),

  // Pages
  listPages: (projectId: string) =>
    req<Page[]>('GET', `/projects/${projectId}/pages`),
  createPage: (projectId: string, data: { name: string }) =>
    req<Page>('POST', `/projects/${projectId}/pages`, data),
  getPage: (projectId: string, id: string) =>
    req<Page>('GET', `/projects/${projectId}/pages/${id}`),
  updatePage: (projectId: string, id: string, data: { name?: string; labels?: LabelDef[]; relations?: string[] }) =>
    req<Page>('PATCH', `/projects/${projectId}/pages/${id}`, data),
  deletePage: (projectId: string, id: string) =>
    req<void>('DELETE', `/projects/${projectId}/pages/${id}`),
  duplicatePage: (projectId: string, id: string) =>
    req<Page>('POST', `/projects/${projectId}/pages/${id}/duplicate`, {}),
  exportPage: (projectId: string, id: string) =>
    req<PageExport>('GET', `/projects/${projectId}/pages/${id}/export`),
  importPage: (projectId: string, data: PageExport) =>
    req<Page>('POST', `/projects/${projectId}/pages/import`, data),

  // Nodes
  listNodes: (pageId: string) =>
    req<Node[]>('GET', `/pages/${pageId}/nodes`),
  createNode: (pageId: string, data: CreateNodeInput) =>
    req<Node>('POST', `/pages/${pageId}/nodes`, data),
  updateNode: (pageId: string, id: string, data: UpdateNodeInput) =>
    req<Node>('PATCH', `/pages/${pageId}/nodes/${id}`, data),
  deleteNode: (pageId: string, id: string) =>
    req<void>('DELETE', `/pages/${pageId}/nodes/${id}`),

  // Design settings
  getDesignSettings: () => req<NodeStyleSettings>('GET', '/settings/design'),
  saveDesignSettings: (data: NodeStyleSettings) =>
    req<NodeStyleSettings>('PATCH', '/settings/design', data),

  // Edges
  listEdges: (pageId: string) =>
    req<Edge[]>('GET', `/pages/${pageId}/edges`),
  createEdge: (pageId: string, data: { source: string; target: string; weight?: number; relation?: string }) =>
    req<Edge>('POST', `/pages/${pageId}/edges`, data),
  updateEdge: (pageId: string, id: string, data: { weight?: number; relation?: string }) =>
    req<Edge>('PATCH', `/pages/${pageId}/edges/${id}`, data),
  deleteEdge: (pageId: string, id: string) =>
    req<void>('DELETE', `/pages/${pageId}/edges/${id}`),
};
