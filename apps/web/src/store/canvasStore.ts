import { create } from 'zustand';
import type { NodeType, ViewName, NodePositions } from '@context-collab/shared';
import { api } from '../api';

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  labels: string[];
  size: number;
  positions: NodePositions;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  relation: string;
}

// ── Undo stack ────────────────────────────────────────────────────────────────

type UndoEntry =
  | { type: 'NODE_CREATED'; nodeId: string }
  | { type: 'EDGE_CREATED'; edgeId: string }
  | { type: 'NODE_NAME'; nodeId: string; prev: string }
  | { type: 'NODE_SIZE'; nodeId: string; prev: number }
  | { type: 'NODE_LABELS'; nodeId: string; prev: string[] }
  | { type: 'NODE_POSITION'; nodeId: string; view: ViewName; prev: { x: number; y: number } | null }
  | { type: 'EDGE_WEIGHT'; edgeId: string; prev: number }
  | { type: 'EDGE_RELATION'; edgeId: string; prev: string };

const MAX_UNDO = 50;

interface CanvasStore {
  pageId: string | null;
  projectId: string | null;
  pageName: string | null;
  pageLabels: string[];
  pageRelations: string[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activeView: ViewName;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  loading: boolean;
  loadError: string | null;
  mutationError: string | null;

  // Undo
  undoStack: UndoEntry[];
  _isUndoing: boolean;
  undo: () => void;

  loadPage: (projectId: string, pageId: string) => Promise<void>;
  clearMutationError: () => void;

  addNode: (type: NodeType, name: string, position?: { x: number; y: number }) => Promise<void>;
  updateNodePosition: (id: string, view: ViewName, pos: { x: number; y: number } | null) => void;
  updateNodeName: (id: string, name: string) => void;
  updateNodeSize: (id: string, size: number) => void;
  updateNodeLabels: (id: string, labels: string[]) => void;
  deleteNode: (id: string) => Promise<void>;

  addEdge: (source: string, target: string) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  updateEdgeWeight: (id: string, weight: number) => void;
  updateEdgeRelation: (id: string, relation: string) => void;

  addPageLabel: (label: string) => void;
  addPageRelation: (relation: string) => void;

  setActiveView: (view: ViewName) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  selectNodeFromSidebar: (id: string) => void;

  // Remote mutation appliers (called by socket event listeners)
  applyRemoteNodeCreated: (node: CanvasNode) => void;
  applyRemoteNodeUpdated: (node: Partial<CanvasNode> & { id: string }) => void;
  applyRemoteNodeDeleted: (nodeId: string) => void;
  applyRemoteEdgeCreated: (edge: CanvasEdge) => void;
  applyRemoteEdgeUpdated: (edge: Partial<CanvasEdge> & { id: string }) => void;
  applyRemoteEdgeDeleted: (edgeId: string) => void;
}

// Module-level debounce timer map — keyed by "<field>:<id>"
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debounce(key: string, ms: number, fn: () => void): void {
  const existing = _debounceTimers.get(key);
  if (existing !== undefined) clearTimeout(existing);
  _debounceTimers.set(key, setTimeout(() => {
    _debounceTimers.delete(key);
    fn();
  }, ms));
}

const defaultPositions = (): NodePositions => ({
  element: null,
  proposition: null,
  layer: null,
  axis3d: null,
});

function buildInitialPositions(
  type: NodeType,
  existingNodesOfType: number,
  position?: { x: number; y: number },
): NodePositions {
  const col = existingNodesOfType % 6;
  const row = Math.floor(existingNodesOfType / 6);
  const pos = position ?? { x: 120 + col * 200, y: 100 + row * 160 };
  const positions = defaultPositions();
  positions[type === 'element' ? 'element' : 'proposition'] = pos;
  if (type === 'element') {
    positions.layer = { ...pos };
  }
  return positions;
}

// Push undo entry, coalescing same-field edits (don't push if top is same operation)
function pushUndoEntry(stack: UndoEntry[], entry: UndoEntry): UndoEntry[] {
  const entryKey = `${entry.type}:${'nodeId' in entry ? entry.nodeId : 'edgeId' in entry ? entry.edgeId : ''}`;
  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    const topKey = `${top.type}:${'nodeId' in top ? top.nodeId : 'edgeId' in top ? top.edgeId : ''}`;
    if (topKey === entryKey) return stack; // Coalesce — keep original "before" value
  }
  const next = [...stack, entry];
  return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
}

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
  pageId: null,
  projectId: null,
  pageName: null,
  pageLabels: [],
  pageRelations: [],
  nodes: [],
  edges: [],
  activeView: 'element',
  selectedNodeId: null,
  selectedEdgeId: null,
  loading: false,
  loadError: null,
  mutationError: null,
  undoStack: [],
  _isUndoing: false,

  // ── Undo ────────────────────────────────────────────────────────────────────
  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    set({ undoStack: undoStack.slice(0, -1), _isUndoing: true });

    try {
      const store = get();
      switch (entry.type) {
        case 'NODE_CREATED':
          store.deleteNode(entry.nodeId);
          break;
        case 'EDGE_CREATED':
          store.deleteEdge(entry.edgeId);
          break;
        case 'NODE_NAME':
          store.updateNodeName(entry.nodeId, entry.prev);
          break;
        case 'NODE_SIZE':
          store.updateNodeSize(entry.nodeId, entry.prev);
          break;
        case 'NODE_LABELS':
          store.updateNodeLabels(entry.nodeId, entry.prev);
          break;
        case 'NODE_POSITION': {
          // prev may be null (no position in that view) — always restore it
          store.updateNodePosition(entry.nodeId, entry.view, entry.prev);
          break;
        }
        case 'EDGE_WEIGHT':
          store.updateEdgeWeight(entry.edgeId, entry.prev);
          break;
        case 'EDGE_RELATION':
          store.updateEdgeRelation(entry.edgeId, entry.prev);
          break;
      }
    } finally {
      set({ _isUndoing: false });
    }
  },

  loadPage: async (projectId: string, pageId: string) => {
    set({
      pageId,
      projectId,
      nodes: [],
      edges: [],
      loading: true,
      loadError: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      pageName: null,
      pageLabels: [],
      pageRelations: [],
      undoStack: [],
    });
    try {
      const [pageRes, nodesRes, edgesRes] = await Promise.all([
        api.getPage(projectId, pageId),
        api.listNodes(pageId),
        api.listEdges(pageId),
      ]);
      set({
        pageName: pageRes.data.name,
        pageLabels: pageRes.data.labels,
        pageRelations: pageRes.data.relations,
        nodes: nodesRes.data.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          labels: n.labels,
          size: n.size,
          positions: n.positions,
        })),
        edges: edgesRes.data.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          weight: e.weight,
          relation: e.relation,
        })),
        loading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load page';
      set({ loading: false, loadError: msg });
    }
  },

  clearMutationError: () => set({ mutationError: null }),

  addNode: async (type, name, position?) => {
    const { pageId, nodes } = get();
    if (!pageId) return;
    const existingOfType = nodes.filter((n) => n.type === type).length;
    const positions = buildInitialPositions(type, existingOfType, position);
    try {
      const res = await api.createNode(pageId, { type, name, positions });
      const node: CanvasNode = {
        id: res.data.id,
        type: res.data.type,
        name: res.data.name,
        labels: res.data.labels,
        size: res.data.size,
        positions: res.data.positions,
      };
      if (!get()._isUndoing) {
        set((s) => ({
          undoStack: pushUndoEntry(s.undoStack, { type: 'NODE_CREATED', nodeId: node.id }),
        }));
      }
      set((s) => ({
        nodes: [...s.nodes, node],
        selectedNodeId: node.id,
        selectedEdgeId: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add node';
      set({ mutationError: msg });
    }
  },

  updateNodePosition: (id, view, pos) => {
    const { pageId, nodes } = get();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const prevPos = node.positions[view];
    if (!get()._isUndoing) {
      set((s) => ({
        undoStack: pushUndoEntry(s.undoStack, {
          type: 'NODE_POSITION',
          nodeId: id,
          view,
          prev: prevPos,
        }),
      }));
    }
    // pos may be null when undoing a first-placement (restores to "no position in this view")
    const mergedPositions: NodePositions = { ...node.positions, [view]: pos };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, positions: mergedPositions } : n,
      ),
    }));
    if (!pageId) return;
    debounce(`node-pos:${id}`, 100, () => {
      api.updateNode(pageId, id, { positions: mergedPositions }).catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to save position';
        set({ mutationError: msg });
      });
    });
  },

  updateNodeName: (id, name) => {
    const prev = get().nodes.find((n) => n.id === id);
    if (!prev) return;
    if (!get()._isUndoing) {
      set((s) => ({
        undoStack: pushUndoEntry(s.undoStack, {
          type: 'NODE_NAME',
          nodeId: id,
          prev: prev.name,
        }),
      }));
    }
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, name } : n)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`node-name:${id}`, 300, () => {
      api.updateNode(pageId, id, { name }).catch((err) => {
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, name: prev.name } : n)),
          mutationError: err instanceof Error ? err.message : 'Failed to save name',
        }));
      });
    });
  },

  updateNodeSize: (id, size) => {
    const prev = get().nodes.find((n) => n.id === id);
    if (!prev) return;
    if (!get()._isUndoing) {
      set((s) => ({
        undoStack: pushUndoEntry(s.undoStack, {
          type: 'NODE_SIZE',
          nodeId: id,
          prev: prev.size,
        }),
      }));
    }
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`node-size:${id}`, 400, () => {
      api.updateNode(pageId, id, { size }).catch((err) => {
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, size: prev.size } : n)),
          mutationError: err instanceof Error ? err.message : 'Failed to save size',
        }));
      });
    });
  },

  updateNodeLabels: (id, labels) => {
    const prev = get().nodes.find((n) => n.id === id);
    if (!prev) return;
    if (!get()._isUndoing) {
      set((s) => ({
        undoStack: pushUndoEntry(s.undoStack, {
          type: 'NODE_LABELS',
          nodeId: id,
          prev: prev.labels,
        }),
      }));
    }
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, labels } : n)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`node-labels:${id}`, 300, () => {
      api.updateNode(pageId, id, { labels }).catch((err) => {
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, labels: prev.labels } : n)),
          mutationError: err instanceof Error ? err.message : 'Failed to save labels',
        }));
      });
    });
  },

  deleteNode: async (id) => {
    const { pageId } = get();
    const prevNodes = get().nodes;
    const prevEdges = get().edges;
    const prevSelected = get().selectedNodeId;
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    if (!pageId) return;
    try {
      await api.deleteNode(pageId, id);
    } catch (err) {
      set({
        nodes: prevNodes,
        edges: prevEdges,
        selectedNodeId: prevSelected,
        mutationError: err instanceof Error ? err.message : 'Failed to delete node',
      });
    }
  },

  addEdge: async (source, target) => {
    const { pageId, edges } = get();
    if (!pageId) return;
    const exists = edges.some(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source),
    );
    if (exists) return;
    try {
      const res = await api.createEdge(pageId, { source, target, weight: 0.8, relation: '' });
      const edge: CanvasEdge = {
        id: res.data.id,
        source: res.data.source,
        target: res.data.target,
        weight: res.data.weight,
        relation: res.data.relation,
      };
      if (!get()._isUndoing) {
        set((s) => ({
          undoStack: pushUndoEntry(s.undoStack, { type: 'EDGE_CREATED', edgeId: edge.id }),
        }));
      }
      set((s) => ({
        edges: [...s.edges, edge],
        selectedEdgeId: edge.id,
        selectedNodeId: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add edge';
      set({ mutationError: msg });
    }
  },

  deleteEdge: async (id) => {
    const { pageId } = get();
    const prevEdges = get().edges;
    const prevSelected = get().selectedEdgeId;
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    }));
    if (!pageId) return;
    try {
      await api.deleteEdge(pageId, id);
    } catch (err) {
      set({
        edges: prevEdges,
        selectedEdgeId: prevSelected,
        mutationError: err instanceof Error ? err.message : 'Failed to delete edge',
      });
    }
  },

  updateEdgeWeight: (id, weight) => {
    const prev = get().edges.find((e) => e.id === id);
    if (!prev) return;
    if (!get()._isUndoing) {
      set((s) => ({
        undoStack: pushUndoEntry(s.undoStack, {
          type: 'EDGE_WEIGHT',
          edgeId: id,
          prev: prev.weight,
        }),
      }));
    }
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, weight } : e)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`edge-weight:${id}`, 400, () => {
      api.updateEdge(pageId, id, { weight }).catch((err) => {
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, weight: prev.weight } : e)),
          mutationError: err instanceof Error ? err.message : 'Failed to save weight',
        }));
      });
    });
  },

  updateEdgeRelation: (id, relation) => {
    const prev = get().edges.find((e) => e.id === id);
    if (!prev) return;
    if (!get()._isUndoing) {
      set((s) => ({
        undoStack: pushUndoEntry(s.undoStack, {
          type: 'EDGE_RELATION',
          edgeId: id,
          prev: prev.relation,
        }),
      }));
    }
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, relation } : e)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`edge-relation:${id}`, 300, () => {
      api.updateEdge(pageId, id, { relation }).catch((err) => {
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, relation: prev.relation } : e)),
          mutationError: err instanceof Error ? err.message : 'Failed to save relation',
        }));
      });
    });
  },

  // ── Page label / relation pool ──────────────────────────────────────────────

  addPageLabel: (label) => {
    const { pageLabels, pageId, projectId } = get();
    if (!label.trim() || pageLabels.includes(label)) return;
    const next = [...pageLabels, label];
    set({ pageLabels: next });
    if (!pageId || !projectId) return;
    debounce('page-labels', 500, () => {
      api.updatePage(projectId, pageId, { labels: next }).catch((err) => {
        console.error('[canvasStore] Failed to persist page labels:', err);
      });
    });
  },

  addPageRelation: (relation) => {
    const { pageRelations, pageId, projectId } = get();
    if (!relation.trim() || pageRelations.includes(relation)) return;
    const next = [...pageRelations, relation];
    set({ pageRelations: next });
    if (!pageId || !projectId) return;
    debounce('page-relations', 500, () => {
      api.updatePage(projectId, pageId, { relations: next }).catch((err) => {
        console.error('[canvasStore] Failed to persist page relations:', err);
      });
    });
  },

  setActiveView: (view) => {
    set({ activeView: view, selectedNodeId: null, selectedEdgeId: null });
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id, selectedEdgeId: null });
  },

  setSelectedEdge: (id) => {
    set({ selectedEdgeId: id, selectedNodeId: null });
  },

  selectNodeFromSidebar: (id) => {
    set((s) => {
      const node = s.nodes.find((n) => n.id === id);
      if (!node) return { selectedNodeId: id, selectedEdgeId: null };

      const visibleInCurrentView =
        s.activeView === 'proposition'
          ? node.type === 'proposition'
          : node.type === 'element';

      if (visibleInCurrentView) {
        return { selectedNodeId: id, selectedEdgeId: null };
      }

      const targetView: ViewName = node.type === 'proposition' ? 'proposition' : 'element';
      return { activeView: targetView, selectedNodeId: id, selectedEdgeId: null };
    });
  },

  // ── Remote mutation appliers ────────────────────────────────────────────────

  applyRemoteNodeCreated: (node) => {
    set((s) => {
      if (s.nodes.some((n) => n.id === node.id)) {
        return { nodes: s.nodes.map((n) => (n.id === node.id ? { ...n, ...node } : n)) };
      }
      return { nodes: [...s.nodes, node] };
    });
  },

  applyRemoteNodeUpdated: (partial) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === partial.id ? { ...n, ...partial } : n)),
    }));
  },

  applyRemoteNodeDeleted: (nodeId) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
    }));
  },

  applyRemoteEdgeCreated: (edge) => {
    set((s) => {
      if (s.edges.some((e) => e.id === edge.id)) {
        return { edges: s.edges.map((e) => (e.id === edge.id ? { ...e, ...edge } : e)) };
      }
      return { edges: [...s.edges, edge] };
    });
  },

  applyRemoteEdgeUpdated: (partial) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === partial.id ? { ...e, ...partial } : e)),
    }));
  },

  applyRemoteEdgeDeleted: (edgeId) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: s.selectedEdgeId === edgeId ? null : s.selectedEdgeId,
    }));
  },
}));
