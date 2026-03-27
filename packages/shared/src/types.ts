// ─── Core domain types ───────────────────────────────────────────────────────

export type NodeType = 'element' | 'proposition';

export type ViewName = 'element' | 'proposition' | 'layer' | 'axis3d';

export interface NodePositions {
  element: { x: number; y: number } | null;
  proposition: { x: number; y: number } | null;
  layer: { x: number; y: number } | null;
  axis3d: { x: number; y: number } | null;
}

export interface Node {
  id: string;
  pageId: string;
  type: NodeType;
  name: string;
  labels: string[];
  size: number; // default 1.0
  positions: NodePositions;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  pageId: string;
  source: string; // node id
  target: string; // node id
  weight: number; // 0.0–1.0
  relation: string; // blank by default
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  projectId: string;
  name: string;
  labels: string[];    // page-level label pool
  relations: string[]; // page-level relation pool (used on edges)
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ─── Realtime event payloads (Socket.io — Phase 4) ───────────────────────────

export interface PageJoinPayload {
  pageId: string;
  userId: string;
  email: string;
  color: string;
}

export interface CursorPayload {
  userId: string;
  pageId: string;
  x: number;
  y: number;
}

export interface NodeLockPayload {
  nodeId: string;
  userId: string;
  locked: boolean;
  pageId?: string;
}

export interface PresenceUser {
  userId: string;
  email: string;
  color: string;
}

export interface PresenceListPayload {
  users: PresenceUser[];
  locks: Array<{ nodeId: string; userId: string }>;
}
