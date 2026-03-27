import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
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
import { useRealtimeStore } from '../../store/realtimeStore';
import { getSocket, userIdentity } from '../../lib/socket';
import { SOCKET_EVENTS } from '@context-collab/shared';
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

// Remote cursor overlay (screen-relative coordinates within the canvas container)
function RemoteCursors() {
  const cursors = useRealtimeStore((s) => s.cursors);

  const remote = Object.values(cursors).filter((c) => c.userId !== userIdentity.userId);
  if (remote.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 1000 }}
    >
      {remote.map((c) => (
        <div
          key={c.userId}
          className="absolute flex items-start"
          style={{ left: c.x, top: c.y, transform: 'translate(-2px, -2px)' }}
        >
          {/* Cursor arrow */}
          <svg
            width="14"
            height="18"
            viewBox="0 0 14 18"
            style={{ fill: c.color, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
          >
            <path d="M1 1L1 14L4.5 10.5L6.5 16L8.2 15.4L6.2 9.8L11 9.8Z" />
          </svg>
          {/* Name label */}
          <span
            className="ml-0.5 rounded px-1 py-0.5 text-[9px] font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: c.color }}
          >
            {c.email}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FlowCanvas({ activeView }: Props) {
  const storeNodes = useCanvasStore((s) => s.nodes);
  const storeEdges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const pageId = useCanvasStore((s) => s.pageId);
  const updateNodePosition = useCanvasStore((s) => s.updateNodePosition);
  const storeAddEdge = useCanvasStore((s) => s.addEdge);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setSelectedEdge = useCanvasStore((s) => s.setSelectedEdge);

  const nodeLocks = useRealtimeStore((s) => s.nodeLocks);
  const presenceUsers = useRealtimeStore((s) => s.presenceUsers);

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

  // Derive RF-format nodes from store (positions + visibility + lock state)
  const derivedNodes = useMemo((): RFNode[] => {
    return storeNodes
      .filter((n) => visibleNodeTypes.includes(n.type as 'element' | 'proposition'))
      .map((n) => {
        const pos =
          n.positions[activeView] ??
          n.positions.element ??
          n.positions.proposition ??
          { x: 0, y: 0 };
        const dimmed = connectedIds !== null && !connectedIds.has(n.id);

        const lockedByUserId = nodeLocks[n.id];
        const isLockedByOther = lockedByUserId !== undefined && lockedByUserId !== userIdentity.userId;
        const lockerUser = isLockedByOther
          ? presenceUsers.find((u) => u.userId === lockedByUserId)
          : null;

        const data: NodeData = {
          name: n.name,
          size: n.size,
          dimmed,
          lockedBy: isLockedByOther ? lockedByUserId : undefined,
          lockedColor: lockerUser?.color,
        };

        return {
          id: n.id,
          type: n.type,
          position: pos,
          data,
          selected: n.id === selectedNodeId,
          draggable: !isLockedByOther,
        };
      });
  }, [storeNodes, activeView, visibleNodeTypes, selectedNodeId, connectedIds, nodeLocks, presenceUsers]);

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

  // Internal RF state
  const [nodes, setNodes] = useState<RFNode[]>(derivedNodes);
  const [edges, setEdges] = useState<RFEdge[]>(derivedEdges);

  const nodeIdentityKey = storeNodes
    .filter((n) => visibleNodeTypes.includes(n.type as 'element' | 'proposition'))
    .map((n) => `${n.id}:${n.name}:${n.size}`)
    .join('|');

  const edgeDataKey = storeEdges
    .map((e) => `${e.id}:${e.weight}:${e.relation}`)
    .join('|');

  // Lock key to trigger resync when lock state changes
  const lockKey = Object.entries(nodeLocks).map(([k, v]) => `${k}:${v}`).join('|');

  useEffect(() => {
    setNodes(derivedNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, nodeIdentityKey, lockKey]);

  useEffect(() => {
    setEdges(derivedEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeDataKey, activeView]);

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

  // ── Cursor emission ────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastCursorEmit = useRef(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pageId) return;
      const now = Date.now();
      if (now - lastCursorEmit.current < 50) return;
      lastCursorEmit.current = now;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const socket = getSocket();
      if (!socket.connected) return;

      socket.emit(SOCKET_EVENTS.CURSOR_MOVE, {
        userId: userIdentity.userId,
        pageId,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [pageId],
  );

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
    >
      {activeView === 'layer' && <LayerGuide />}
      <RemoteCursors />
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
