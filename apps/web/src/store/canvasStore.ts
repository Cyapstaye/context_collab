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
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activeView: ViewName;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  loading: boolean;
  loadError: string | null;

  loadPage: (pageId: string) => Promise<void>;

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
  nodes: [],
  edges: [],
  activeView: 'element',
  selectedNodeId: null,
  selectedEdgeId: null,
  loading: false,
  loadError: null,

  loadPage: async (pageId: string) => {
    set({
      pageId,
      nodes: [],
      edges: [],
      loading: true,
      loadError: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        api.listNodes(pageId),
        api.listEdges(pageId),
      ]);
      set({
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
      console.error('Failed to add node:', err);
    }
  },

  updateNodePosition: (id, view, pos) => {
    // Update local state synchronously for immediate visual feedback
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, positions: { ...n.positions, [view]: pos } } : n,
      ),
    }));
    // Persist to API in background
    const { pageId } = get();
    if (!pageId) return;
    const node = get().nodes.find((n) => n.id === id);
    if (node) {
      api.updateNode(pageId, id, { positions: node.positions }).catch(console.error);
    }
  },

  updateNodeName: (id, name) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, name } : n)),
    }));
    const { pageId } = get();
    if (pageId) {
      api.updateNode(pageId, id, { name }).catch(console.error);
    }
  },

  updateNodeSize: (id, size) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
    }));
    const { pageId } = get();
    if (pageId) {
      api.updateNode(pageId, id, { size }).catch(console.error);
    }
  },

  deleteNode: async (id) => {
    // Optimistic delete from local state
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
    const { pageId } = get();
    if (pageId) {
      api.deleteNode(pageId, id).catch(console.error);
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
      console.error('Failed to add edge:', err);
    }
  },

  deleteEdge: async (id) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    }));
    const { pageId } = get();
    if (pageId) {
      api.deleteEdge(pageId, id).catch(console.error);
    }
  },

  updateEdgeWeight: (id, weight) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, weight } : e)),
    }));
    const { pageId } = get();
    if (pageId) {
      api.updateEdge(pageId, id, { weight }).catch(console.error);
    }
  },

  updateEdgeRelation: (id, relation) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, relation } : e)),
    }));
    const { pageId } = get();
    if (pageId) {
      api.updateEdge(pageId, id, { relation }).catch(console.error);
    }
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
