import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  Connection,
  NodeChange,
  EdgeChange,
  Node as RFNode,
  Edge as RFEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { nodeTypes } from './nodeTypes';
import type { NodeData } from './nodeTypes';
import type { ViewName } from '@context-collab/shared';

interface Props {
  activeView: ViewName;
}

// Layer view concentric ring guides
function LayerGuide() {
  const rings = [80, 160, 240, 320];
  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    >
      {rings.map((r) => (
        <circle
          key={r}
          cx="50%"
          cy="50%"
          r={r}
          fill="none"
          stroke="#d1d5db"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
      ))}
      <circle cx="50%" cy="50%" r={8} fill="#d1d5db" />
    </svg>
  );
}

export default function FlowCanvas({ activeView }: Props) {
  const storeNodes = useCanvasStore((s) => s.nodes);
  const storeEdges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const updateNodePosition = useCanvasStore((s) => s.updateNodePosition);
  const storeAddEdge = useCanvasStore((s) => s.addEdge);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setSelectedEdge = useCanvasStore((s) => s.setSelectedEdge);

  // Which node types are visible per view
  const visibleNodeTypes = useMemo((): Array<'element' | 'proposition'> => {
    return activeView === 'proposition' ? ['proposition'] : ['element'];
  }, [activeView]);

  // Connected node IDs for detail-view dimming
  const connectedIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    storeEdges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, storeEdges]);

  // Derive RF-format nodes from store (positions + visibility)
  const derivedNodes = useMemo((): RFNode[] => {
    return storeNodes
      .filter((n) => visibleNodeTypes.includes(n.type as 'element' | 'proposition'))
      .map((n) => {
        // Store guarantees all relevant view positions are initialised at add-time.
        // The fallback chain handles any legacy nodes that predate that guarantee.
        const pos =
          n.positions[activeView] ??
          n.positions.element ??
          n.positions.proposition ??
          { x: 0, y: 0 };
        const dimmed = connectedIds !== null && !connectedIds.has(n.id);
        const data: NodeData = { name: n.name, size: n.size, dimmed };
        return {
          id: n.id,
          type: n.type,
          position: pos,
          data,
          selected: n.id === selectedNodeId,
        };
      });
  }, [storeNodes, activeView, visibleNodeTypes, selectedNodeId, connectedIds]);

  // Derive RF-format edges (only between visible nodes)
  const derivedEdges = useMemo((): RFEdge[] => {
    const visibleIds = new Set(derivedNodes.map((n) => n.id));
    return storeEdges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relation || undefined,
        style: { opacity: e.weight, strokeWidth: 1.5 },
        selected: e.id === selectedEdgeId,
        data: { weight: e.weight, relation: e.relation },
      }));
  }, [storeEdges, derivedNodes, selectedEdgeId]);

  // Internal RF state — source of truth for drag positions; synced from store on view/node changes
  const [nodes, setNodes] = useState<RFNode[]>(derivedNodes);
  const [edges, setEdges] = useState<RFEdge[]>(derivedEdges);

  // Build a key from the stable node identity + view so we know when to resync
  const nodeIdentityKey = storeNodes
    .filter((n) => visibleNodeTypes.includes(n.type as 'element' | 'proposition'))
    .map((n) => `${n.id}:${n.name}:${n.size}`)
    .join('|');

  // Include edge data (weight + relation) so style/label changes trigger a resync,
  // not just structural add/remove tracked by length alone.
  const edgeDataKey = storeEdges
    .map((e) => `${e.id}:${e.weight}:${e.relation}`)
    .join('|');

  // Resync when view changes or when node set changes (add/remove/rename/resize)
  // Using a layout effect to avoid one-frame flicker
  useEffect(() => {
    setNodes(derivedNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, nodeIdentityKey]);

  useEffect(() => {
    setEdges(derivedEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeDataKey, activeView]);

  // Sync selection state into RF nodes without full resync
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    );
  }, [selectedNodeId]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({ ...e, selected: e.id === selectedEdgeId })),
    );
  }, [selectedEdgeId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      updateNodePosition(node.id, activeView, node.position);
    },
    [updateNodePosition, activeView],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        storeAddEdge(params.source, params.target);
        // storeEdges updates → derivedEdges updates → useEffect syncs edges
      }
    },
    [storeAddEdge],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: RFEdge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  return (
    <div className="relative w-full h-full">
      {activeView === 'layer' && <LayerGuide />}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-[#f8f8f6]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e0e0e0" />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
