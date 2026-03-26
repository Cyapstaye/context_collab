import { create } from 'zustand';
import type { NodeType, ViewName, NodePositions } from '@context-collab/shared';

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
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activeView: ViewName;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  addNode: (type: NodeType, name: string, position?: { x: number; y: number }) => void;
  updateNodePosition: (id: string, view: ViewName, pos: { x: number; y: number }) => void;
  updateNodeName: (id: string, name: string) => void;
  updateNodeSize: (id: string, size: number) => void;
  deleteNode: (id: string) => void;
  addEdge: (source: string, target: string) => void;
  deleteEdge: (id: string) => void;
  updateEdgeWeight: (id: string, weight: number) => void;
  updateEdgeRelation: (id: string, relation: string) => void;
  setActiveView: (view: ViewName) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  // Selects a node from the sidebar, auto-switching the macro view if the node's
  // type is hidden in the current view.
  selectNodeFromSidebar: (id: string) => void;
}

let nodeCounter = 1;
let edgeCounter = 1;

function nextNodeId() {
  return `n${nodeCounter++}`;
}
function nextEdgeId() {
  return `e${edgeCounter++}`;
}

const defaultPositions = (): NodePositions => ({
  element: null,
  proposition: null,
  layer: null,
  axis3d: null,
});

export const useCanvasStore = create<CanvasStore>((set) => ({
  nodes: [],
  edges: [],
  activeView: 'element',
  selectedNodeId: null,
  selectedEdgeId: null,

  addNode: (type, name, position) => {
    set((s) => {
      const id = nextNodeId();
      // Deterministic grid layout: 6 columns, 200px × 160px cells
      const idx = s.nodes.filter((n) => n.type === type).length;
      const col = idx % 6;
      const row = Math.floor(idx / 6);
      const pos = position ?? { x: 120 + col * 200, y: 100 + row * 160 };
      const positions = defaultPositions();
      positions[type === 'element' ? 'element' : 'proposition'] = pos;
      // Initialise layer position for elements so layer view never needs a fallback
      if (type === 'element') {
        positions.layer = { ...pos };
      }
      const node: CanvasNode = {
        id,
        type,
        name,
        labels: [],
        size: 1.0,
        positions,
      };
      return { nodes: [...s.nodes, node], selectedNodeId: id, selectedEdgeId: null };
    });
  },

  updateNodePosition: (id, view, pos) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, positions: { ...n.positions, [view]: pos } }
          : n,
      ),
    }));
  },

  updateNodeName: (id, name) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, name } : n)),
    }));
  },

  updateNodeSize: (id, size) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
    }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
  },

  addEdge: (source, target) => {
    set((s) => {
      // Prevent duplicates
      const exists = s.edges.some(
        (e) => (e.source === source && e.target === target) ||
               (e.source === target && e.target === source),
      );
      if (exists) return {};
      const edge: CanvasEdge = {
        id: nextEdgeId(),
        source,
        target,
        weight: 0.8,
        relation: '',
      };
      return { edges: [...s.edges, edge], selectedEdgeId: edge.id, selectedNodeId: null };
    });
  },

  deleteEdge: (id) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    }));
  },

  updateEdgeWeight: (id, weight) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, weight } : e)),
    }));
  },

  updateEdgeRelation: (id, relation) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, relation } : e)),
    }));
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

      // Determine whether the node type is visible in the current view.
      // element/layer views show elements; proposition view shows propositions.
      const visibleInCurrentView =
        s.activeView === 'proposition'
          ? node.type === 'proposition'
          : node.type === 'element';

      if (visibleInCurrentView) {
        return { selectedNodeId: id, selectedEdgeId: null };
      }

      // Switch to the default macro view for this node type, then select it.
      const targetView: ViewName = node.type === 'proposition' ? 'proposition' : 'element';
      return { activeView: targetView, selectedNodeId: id, selectedEdgeId: null };
    });
  },
}));
