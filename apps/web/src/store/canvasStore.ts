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

  loadPage: (projectId: string, pageId: string) => Promise<void>;
  clearMutationError: () => void;

  addNode: (type: NodeType, name: string, position?: { x: number; y: number }) => Promise<void>;
  updateNodePosition: (id: string, view: ViewName, pos: { x: number; y: number }) => void;
  updateNodeName: (id: string, name: string) => void;
  updateNodeSize: (id: string, size: number) => void;
  deleteNode: (id: string) => Promise<void>;

  addEdge: (source: string, target: string) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  updateEdgeWeight: (id: string, weight: number) => void;
  updateEdgeRelation: (id: string, relation: string) => void;

  setActiveView: (view: ViewName) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  selectNodeFromSidebar: (id: string) => void;
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
      set((s) => ({
        nodes: [...s.nodes, node],
        selectedNodeId: node.id,
        selectedEdgeId: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '노드 추가 실패';
      set({ mutationError: msg });
    }
  },

  updateNodePosition: (id, view, pos) => {
    // Compute merged positions once — used for both local state and API call
    const { pageId, nodes } = get();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const mergedPositions: NodePositions = { ...node.positions, [view]: pos };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, positions: mergedPositions } : n,
      ),
    }));
    if (!pageId) return;
    // Debounce position API calls to batch rapid drag events
    debounce(`node-pos:${id}`, 100, () => {
      api.updateNode(pageId, id, { positions: mergedPositions }).catch((err) => {
        const msg = err instanceof Error ? err.message : '위치 저장 실패';
        set({ mutationError: msg });
      });
    });
  },

  updateNodeName: (id, name) => {
    const prev = get().nodes.find((n) => n.id === id);
    if (!prev) return;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, name } : n)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`node-name:${id}`, 300, () => {
      api.updateNode(pageId, id, { name }).catch((err) => {
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, name: prev.name } : n)),
          mutationError: err instanceof Error ? err.message : '이름 저장 실패',
        }));
      });
    });
  },

  updateNodeSize: (id, size) => {
    const prev = get().nodes.find((n) => n.id === id);
    if (!prev) return;
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`node-size:${id}`, 400, () => {
      api.updateNode(pageId, id, { size }).catch((err) => {
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, size: prev.size } : n)),
          mutationError: err instanceof Error ? err.message : '크기 저장 실패',
        }));
      });
    });
  },

  deleteNode: async (id) => {
    const { pageId } = get();
    const prevNodes = get().nodes;
    const prevEdges = get().edges;
    const prevSelected = get().selectedNodeId;
    // Optimistic delete
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
        mutationError: err instanceof Error ? err.message : '노드 삭제 실패',
      });
    }
  },

  addEdge: async (source, target) => {
    const { pageId, edges } = get();
    if (!pageId) return;
    // Prevent duplicates locally
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
      set((s) => ({
        edges: [...s.edges, edge],
        selectedEdgeId: edge.id,
        selectedNodeId: null,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '엣지 추가 실패';
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
        mutationError: err instanceof Error ? err.message : '엣지 삭제 실패',
      });
    }
  },

  updateEdgeWeight: (id, weight) => {
    const prev = get().edges.find((e) => e.id === id);
    if (!prev) return;
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, weight } : e)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`edge-weight:${id}`, 400, () => {
      api.updateEdge(pageId, id, { weight }).catch((err) => {
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, weight: prev.weight } : e)),
          mutationError: err instanceof Error ? err.message : '가중치 저장 실패',
        }));
      });
    });
  },

  updateEdgeRelation: (id, relation) => {
    const prev = get().edges.find((e) => e.id === id);
    if (!prev) return;
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, relation } : e)),
    }));
    const { pageId } = get();
    if (!pageId) return;
    debounce(`edge-relation:${id}`, 300, () => {
      api.updateEdge(pageId, id, { relation }).catch((err) => {
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, relation: prev.relation } : e)),
          mutationError: err instanceof Error ? err.message : '관계 저장 실패',
        }));
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
}));
