import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  NodeChange,
  EdgeChange,
  Node as RFNode,
  Edge as RFEdge,
  Viewport,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '../../store/canvasStore';
import { useLabelFilterStore } from '../../store/labelFilterStore';
import type { LabelDef } from '@context-collab/shared';
import { useRealtimeStore } from '../../store/realtimeStore';
import { useAuthStore } from '../../store/authStore';
import { getSocket, getUserIdentity } from '../../lib/socket';
import { SOCKET_EVENTS } from '@context-collab/shared';
import { nodeTypes } from './nodeTypes';
import type { NodeData } from './nodeTypes';
import { connEdgeTypes } from './edgeTypes';
import type { ViewName } from '@context-collab/shared';
import { useForceLayout } from '../../hooks/useForceLayout';
import type { ForceConfig } from '../../hooks/useForceLayout';
import { edgeVisualProps } from '../../lib/connectionTypes';

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
  const identity = getUserIdentity();

  const remote = Object.values(cursors).filter((c) => c.userId !== identity.userId);
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
  const pageLabels = useCanvasStore((s) => s.pageLabels);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const pageId = useCanvasStore((s) => s.pageId);
  const updateNodePosition = useCanvasStore((s) => s.updateNodePosition);
  const storeAddEdge = useCanvasStore((s) => s.addEdge);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const setSelectedEdge = useCanvasStore((s) => s.setSelectedEdge);
  const setEditingNodeId = useCanvasStore((s) => s.setEditingNodeId);
  const undo = useCanvasStore((s) => s.undo);

  const setViewportCenter = useCanvasStore((s) => s.setViewportCenter);

  const nodeLocks = useRealtimeStore((s) => s.nodeLocks);
  const presenceUsers = useRealtimeStore((s) => s.presenceUsers);

  const isViewOnly = useAuthStore((s) => s.isViewOnly());

  const hiddenLabels  = useLabelFilterStore((s) => s.hiddenLabels);
  const focusedLabel  = useLabelFilterStore((s) => s.focusedLabel);

  const [showNameOverlay, setShowNameOverlay] = useState(false);

  // ── Option-click waypoint chain ──────────────────────────────────────────
  // Holds the node ID of the last Option+clicked node. Each subsequent
  // Option+click connects that node to the new click target, then advances
  // the waypoint. Regular click or Escape clears the chain.
  const [waypointId, setWaypointId] = useState<string | null>(null);

  // Which node types are visible per view
  const visibleNodeTypes = useMemo((): Array<'element' | 'proposition'> => {
    return activeView === 'proposition' ? ['proposition'] : ['element'];
  }, [activeView]);

  // Connected node IDs for detail-view dimming (all types)
  const connectedIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    storeEdges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, storeEdges]);

  // Cross-type connected nodes: connected to selected node but NOT of the current view's type
  // These appear as context in detail view (slightly faded, dashed border)
  const crossTypeConnectedNodes = useMemo(() => {
    if (!selectedNodeId || !connectedIds) return [];
    return storeNodes.filter(
      (n) =>
        connectedIds.has(n.id) &&
        n.id !== selectedNodeId &&
        !visibleNodeTypes.includes(n.type as 'element' | 'proposition'),
    );
  }, [selectedNodeId, connectedIds, storeNodes, visibleNodeTypes]);

  const identity = getUserIdentity();

  // Derive RF-format nodes from store (positions + visibility + lock state)
  const derivedNodes = useMemo((): RFNode[] => {
    // Primary nodes: filtered by current view type
    const primary = storeNodes
      .filter((n) => visibleNodeTypes.includes(n.type as 'element' | 'proposition'))
      // Hide nodes that carry any hidden label
      .filter((n) => {
        if (hiddenLabels.size === 0) return true;
        return !n.labels.some((lbl) => hiddenLabels.has(lbl));
      })
      .map((n) => {
        const pos =
          n.positions[activeView] ??
          n.positions.element ??
          n.positions.proposition ??
          { x: 0, y: 0 };
        const dimmed = connectedIds !== null && !connectedIds.has(n.id);

        const lockedByUserId = nodeLocks[n.id];
        const isLockedByOther = lockedByUserId !== undefined && lockedByUserId !== identity.userId;
        const lockerUser = isLockedByOther
          ? presenceUsers.find((u) => u.userId === lockedByUserId)
          : null;

        const labelColors = n.labels
          .map((name) => pageLabels.find((l: LabelDef) => l.name === name)?.color ?? '')
          .filter((c) => c !== '');

        // Label focus: nodes with the focused label glow; all others are dimmed
        const hasFocusedLabel = focusedLabel !== null && n.labels.includes(focusedLabel);
        const labelFocusColor = hasFocusedLabel
          ? (pageLabels.find((l: LabelDef) => l.name === focusedLabel)?.color || '#6b7280')
          : undefined;
        const labelDimmed = focusedLabel !== null && !hasFocusedLabel;

        const data: NodeData = {
          name: n.name,
          size: n.size,
          dimmed: dimmed || labelDimmed,
          lockedBy: isLockedByOther ? lockedByUserId : undefined,
          lockedColor: lockerUser?.color,
          labelColors: labelColors.length > 0 ? labelColors : undefined,
          isWaypoint: n.id === waypointId,
          labelFocusColor,
          showNameOverlay,
        };

        return {
          id: n.id,
          type: n.type,
          position: pos,
          data,
          selected: n.id === selectedNodeId,
          draggable: !isViewOnly && !isLockedByOther,
          zIndex: 0,
        };
      });

    // Cross-type context nodes: shown during detail view when a node has cross-type connections
    const crossTypeIds = new Set(primary.map((n) => n.id));
    const cross = crossTypeConnectedNodes
      .filter((n) => !crossTypeIds.has(n.id))
      .map((n) => {
        const pos =
          n.positions[n.type === 'element' ? 'element' : 'proposition'] ??
          n.positions.element ??
          n.positions.proposition ??
          { x: 0, y: 0 };

        const data: NodeData = {
          name: n.name,
          size: n.size,
          crossType: true,
        };

        return {
          id: n.id,
          type: n.type,
          position: pos,
          data,
          selected: false,
          draggable: false,
          zIndex: 0,
        };
      });

    return [...primary, ...cross];
  }, [storeNodes, activeView, visibleNodeTypes, selectedNodeId, connectedIds, crossTypeConnectedNodes, nodeLocks, presenceUsers, isViewOnly, identity.userId, pageLabels, waypointId, hiddenLabels, focusedLabel, showNameOverlay]);

  // Derive RF-format edges (between visible nodes including cross-type context)
  const derivedEdges = useMemo((): RFEdge[] => {
    const visibleIds = new Set(derivedNodes.map((n) => n.id));
    return storeEdges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => ({
        id: e.id,
        type: 'conn',
        source: e.source,
        target: e.target,
        selected: e.id === selectedEdgeId,
        data: { weight: e.weight, relation: e.relation },
        ...edgeVisualProps(e.relation, e.weight),
      }));
  }, [storeEdges, derivedNodes, selectedEdgeId]);

  // Edges for the force simulation (only between currently visible nodes)
  const visibleIds = useMemo(() => new Set(derivedNodes.map((n) => n.id)), [derivedNodes]);

  // Cross-type context node IDs — frozen in physics so selecting a node with
  // cross-type connections doesn't yank primary nodes toward stored positions.
  const crossTypeNodeIds = useMemo(
    () => new Set(crossTypeConnectedNodes.map((n) => n.id)),
    [crossTypeConnectedNodes],
  );

  const simEdges = useMemo(
    () =>
      storeEdges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
    [storeEdges, visibleIds],
  );

  // Internal RF state
  const [nodes, setNodes] = useState<RFNode[]>(derivedNodes);
  const [edges, setEdges] = useState<RFEdge[]>(derivedEdges);

  // Force-directed layout simulation
  // Proposition nodes are ~320 px wide so the physics needs a much larger rest
  // distance to prevent cards from overlapping and burying their connecting edges.
  const forceConfig = useMemo((): ForceConfig | undefined => {
    if (activeView !== 'proposition') return undefined;
    return { restDistance: 450, repelMax: 700, repelStrength: 12000 };
  }, [activeView]);

  const { pin, unpin } = useForceLayout(simEdges, setNodes, crossTypeNodeIds, forceConfig);

  const labelFilterKey = `${focusedLabel ?? ''}|${[...hiddenLabels].sort().join(',')}|${showNameOverlay}`;

  const nodeIdentityKey = storeNodes
    .filter((n) => visibleNodeTypes.includes(n.type as 'element' | 'proposition'))
    .map((n) => `${n.id}:${n.name}:${n.size}:${n.labels.join(',')}`)
    .join('|');

  const edgeDataKey = storeEdges
    .map((e) => `${e.id}:${e.weight}:${e.relation}`)
    .join('|');

  const lockKey = Object.entries(nodeLocks).map(([k, v]) => `${k}:${v}`).join('|');

  // Cross-type context key — resync when selection or cross-type connections change
  const crossTypeKey = crossTypeConnectedNodes.map((n) => n.id).join('|');

  // Track view changes so we know when to fully reset positions vs. just update metadata
  const prevViewRef = useRef(activeView);

  useEffect(() => {
    const viewChanged = prevViewRef.current !== activeView;
    prevViewRef.current = activeView;

    setNodes((current) => {
      // On view switch, reset to stored positions for the new view
      if (viewChanged) return derivedNodes;
      // Otherwise preserve each node's current simulation position so the
      // physics don't restart from scratch (e.g. after a size change)
      const posMap = new Map(current.map((n) => [n.id, n.position]));
      return derivedNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, nodeIdentityKey, lockKey, isViewOnly, selectedNodeId, crossTypeKey, waypointId, labelFilterKey]);

  // Sync edge state whenever the derived set changes for ANY reason —
  // using derivedEdges directly as the dep so view switches, node visibility
  // changes, label filters, and cross-type context updates all propagate.
  // (derivedEdges already encodes storeEdges + visibleIds + selectedEdgeId.)
  useEffect(() => {
    setEdges(derivedEdges);
  }, [derivedEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    );
  }, [selectedNodeId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Filter out 'select' changes — selection is controlled via our store + useEffect.
    // Letting React Flow also apply select changes causes a race where a node gets
    // immediately deselected after being selected.
    setNodes((nds) => applyNodeChanges(changes.filter((c) => c.type !== 'select'), nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Filter out 'remove' changes — edge deletion goes through store.deleteEdge()
    // (called from RightBar). Letting React Flow also apply removes causes edges to
    // disappear from local state without being deleted on the server, and can
    // ghost-remove valid edges during view transitions.
    setEdges((eds) => applyEdgeChanges(changes.filter((c) => c.type !== 'remove'), eds));
  }, []);

  const onNodeDragStart = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      pin(node.id);
    },
    [pin],
  );

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      if (isViewOnly) return;
      updateNodePosition(node.id, activeView, node.position);
      unpin(node.id);
      // Reset lock timeout — user actively dragged the node
      if (pageId) {
        const socket = getSocket();
        if (socket.connected) {
          socket.emit(SOCKET_EVENTS.NODE_LOCK_HEARTBEAT, {
            nodeId: node.id,
            userId: getUserIdentity().userId,
            pageId,
          });
        }
      }
    },
    [updateNodePosition, activeView, pageId, isViewOnly, unpin],
  );


  const onNodeClick = useCallback(
    (e: React.MouseEvent, node: RFNode) => {
      if (!isViewOnly && e.altKey) {
        // Option+click: chain-connect the previous waypoint to this node, then advance
        if (waypointId && waypointId !== node.id) {
          storeAddEdge(waypointId, node.id);
        }
        setWaypointId(node.id);
        setSelectedNode(node.id);
      } else {
        setWaypointId(null);
        setSelectedNode(node.id);
      }
    },
    [setSelectedNode, waypointId, storeAddEdge, isViewOnly],
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: RFEdge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge],
  );

  const onNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      if (isViewOnly) return;
      setEditingNodeId(node.id);
    },
    [isViewOnly, setEditingNodeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setWaypointId(null);
  }, [setSelectedNode, setSelectedEdge]);

  // ── Viewport center tracking ───────────────────────────────────────────────
  const computeCenter = useCallback(
    (vp: Viewport) => {
      if (!canvasRef.current) return;
      const { clientWidth, clientHeight } = canvasRef.current;
      setViewportCenter({
        x: (clientWidth / 2 - vp.x) / vp.zoom,
        y: (clientHeight / 2 - vp.y) / vp.zoom,
      });
    },
    [setViewportCenter],
  );

  const onMove = useCallback(
    (_e: MouseEvent | TouchEvent | null, vp: Viewport) => computeCenter(vp),
    [computeCenter],
  );

  const onInit = useCallback(
    (instance: ReactFlowInstance) => computeCenter(instance.getViewport()),
    [computeCenter],
  );

  // ── cmd+Z undo / Escape to cancel waypoint chain ─────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (e.key === 'Escape') {
        setWaypointId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

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
        userId: getUserIdentity().userId,
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
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMove={onMove}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={connEdgeTypes}
        nodesDraggable={!isViewOnly}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-[#f8f8f6]"
        defaultEdgeOptions={{ type: 'conn' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e0e0e0" />
        <Controls>
          <ControlButton
            onClick={() => setShowNameOverlay((v) => !v)}
            title={showNameOverlay ? 'Hide names' : 'Show names'}
            style={{ color: showNameOverlay ? '#111' : undefined }}
          >
            {/* Icon: dot only (off) vs dot + floating text lines (on) */}
            {showNameOverlay ? (
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                <circle cx="4" cy="6" r="3" fill="currentColor" />
                <line x1="9" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="9" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="3" fill="currentColor" />
              </svg>
            )}
          </ControlButton>
        </Controls>
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
