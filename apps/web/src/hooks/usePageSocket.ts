import { useEffect, useRef } from 'react';
import { SOCKET_EVENTS } from '@context-collab/shared';
import type { PresenceListPayload } from '@context-collab/shared';
import { connectSocket, getSocket, userIdentity } from '../lib/socket';
import { useCanvasStore } from '../store/canvasStore';
import { useRealtimeStore } from '../store/realtimeStore';
import type { PresenceEntry } from '../store/realtimeStore';
import type { CanvasNode, CanvasEdge } from '../store/canvasStore';

export function usePageSocket(pageId: string | null): void {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const prevSelectedRef = useRef<string | null>(null);

  const setPresenceList = useRealtimeStore((s) => s.setPresenceList);
  const addPresenceUser = useRealtimeStore((s) => s.addPresenceUser);
  const removePresenceUser = useRealtimeStore((s) => s.removePresenceUser);
  const updateCursor = useRealtimeStore((s) => s.updateCursor);
  const setNodeLock = useRealtimeStore((s) => s.setNodeLock);
  const clearNodeLock = useRealtimeStore((s) => s.clearNodeLock);
  const reset = useRealtimeStore((s) => s.reset);

  const applyRemoteNodeCreated = useCanvasStore((s) => s.applyRemoteNodeCreated);
  const applyRemoteNodeUpdated = useCanvasStore((s) => s.applyRemoteNodeUpdated);
  const applyRemoteNodeDeleted = useCanvasStore((s) => s.applyRemoteNodeDeleted);
  const applyRemoteEdgeCreated = useCanvasStore((s) => s.applyRemoteEdgeCreated);
  const applyRemoteEdgeUpdated = useCanvasStore((s) => s.applyRemoteEdgeUpdated);
  const applyRemoteEdgeDeleted = useCanvasStore((s) => s.applyRemoteEdgeDeleted);

  // ── Join/leave room ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pageId) return;

    const socket = connectSocket();

    function joinRoom() {
      socket.emit(SOCKET_EVENTS.PAGE_JOIN, {
        pageId,
        userId: userIdentity.userId,
        email: userIdentity.email,
        color: userIdentity.color,
      });
    }

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    // Presence
    socket.on(SOCKET_EVENTS.PRESENCE_LIST, (payload: PresenceListPayload) => {
      setPresenceList(payload.users, payload.locks);
    });
    socket.on(SOCKET_EVENTS.USER_JOIN, (user: PresenceEntry) => {
      addPresenceUser(user);
    });
    socket.on(SOCKET_EVENTS.USER_LEAVE, ({ userId }: { userId: string }) => {
      removePresenceUser(userId);
    });

    // Cursors
    socket.on(SOCKET_EVENTS.CURSOR_MOVE, ({ userId, x, y }: { userId: string; x: number; y: number }) => {
      updateCursor(userId, x, y);
    });

    // Node locks
    socket.on(SOCKET_EVENTS.NODE_LOCK, ({ nodeId, userId }: { nodeId: string; userId: string }) => {
      setNodeLock(nodeId, userId);
    });
    socket.on(SOCKET_EVENTS.NODE_UNLOCK, ({ nodeId }: { nodeId: string }) => {
      clearNodeLock(nodeId);
    });
    // Silently ignore lock-denied — UI already reflects the lock state from NODE_LOCK broadcast

    // Canvas mutations from other users
    socket.on(SOCKET_EVENTS.NODE_CREATED, ({ node }: { node: CanvasNode }) => {
      applyRemoteNodeCreated(node);
    });
    socket.on(SOCKET_EVENTS.NODE_UPDATED, ({ node }: { node: Partial<CanvasNode> & { id: string } }) => {
      applyRemoteNodeUpdated(node);
    });
    socket.on(SOCKET_EVENTS.NODE_DELETED, ({ nodeId }: { nodeId: string }) => {
      applyRemoteNodeDeleted(nodeId);
    });
    socket.on(SOCKET_EVENTS.EDGE_CREATED, ({ edge }: { edge: CanvasEdge }) => {
      applyRemoteEdgeCreated(edge);
    });
    socket.on(SOCKET_EVENTS.EDGE_UPDATED, ({ edge }: { edge: Partial<CanvasEdge> & { id: string } }) => {
      applyRemoteEdgeUpdated(edge);
    });
    socket.on(SOCKET_EVENTS.EDGE_DELETED, ({ edgeId }: { edgeId: string }) => {
      applyRemoteEdgeDeleted(edgeId);
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off(SOCKET_EVENTS.PRESENCE_LIST);
      socket.off(SOCKET_EVENTS.USER_JOIN);
      socket.off(SOCKET_EVENTS.USER_LEAVE);
      socket.off(SOCKET_EVENTS.CURSOR_MOVE);
      socket.off(SOCKET_EVENTS.NODE_LOCK);
      socket.off(SOCKET_EVENTS.NODE_UNLOCK);
      socket.off(SOCKET_EVENTS.NODE_CREATED);
      socket.off(SOCKET_EVENTS.NODE_UPDATED);
      socket.off(SOCKET_EVENTS.NODE_DELETED);
      socket.off(SOCKET_EVENTS.EDGE_CREATED);
      socket.off(SOCKET_EVENTS.EDGE_UPDATED);
      socket.off(SOCKET_EVENTS.EDGE_DELETED);

      // Leave room gracefully (server also handles disconnect)
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.PAGE_LEAVE, {
          pageId,
          userId: userIdentity.userId,
        });
      }

      reset();
    };
  }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Emit node lock / unlock on selection change ───────────────────────────
  useEffect(() => {
    if (!pageId) return;
    const socket = getSocket();
    if (!socket.connected) return;

    const prev = prevSelectedRef.current;

    if (prev !== null && prev !== selectedNodeId) {
      // Deselected or switched — release previous lock
      socket.emit(SOCKET_EVENTS.NODE_UNLOCK, {
        nodeId: prev,
        userId: userIdentity.userId,
        pageId,
      });
    }

    if (selectedNodeId !== null) {
      socket.emit(SOCKET_EVENTS.NODE_LOCK, {
        nodeId: selectedNodeId,
        userId: userIdentity.userId,
        pageId,
      });
    }

    prevSelectedRef.current = selectedNodeId;
  }, [selectedNodeId, pageId]);
}
