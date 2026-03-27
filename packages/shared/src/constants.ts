// View labels (Korean-first)
export const VIEW_LABELS: Record<string, string> = {
  element: '요소 기반',
  proposition: '명제 기반',
  layer: '층위 기반',
  axis3d: '3D 축', // stub — hidden in v1
};

// Default node size
export const DEFAULT_NODE_SIZE = 1.0;

// Node lock timeout (ms)
export const NODE_LOCK_TIMEOUT_MS = 30_000;

// API base path
export const API_BASE = '/api/v1';

// Socket.io events (Phase 4)
export const SOCKET_EVENTS = {
  // room lifecycle
  PAGE_JOIN: 'page:join',
  PAGE_LEAVE: 'page:leave',
  PRESENCE_LIST: 'presence:list',
  // presence
  USER_JOIN: 'user:join',
  USER_LEAVE: 'user:leave',
  CURSOR_MOVE: 'cursor:move',
  // node lock
  NODE_LOCK: 'node:lock',
  NODE_UNLOCK: 'node:unlock',
  NODE_LOCK_DENIED: 'node:lock:denied',
  // canvas mutations (broadcast)
  NODE_CREATED: 'node:created',
  NODE_UPDATED: 'node:updated',
  NODE_DELETED: 'node:deleted',
  EDGE_CREATED: 'edge:created',
  EDGE_UPDATED: 'edge:updated',
  EDGE_DELETED: 'edge:deleted',
} as const;
