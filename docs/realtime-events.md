# Realtime Events (Socket.io)

> Phase 4. These are not implemented yet. This document defines the planned contract.

## Connection

Clients connect to `ws://localhost:3001` after authenticating.

On connect, clients join a page room:
```
socket.emit('page:join', { pageId: string, userId: string })
```

---

## Presence

### `user:join`
Broadcast to room when a user joins.
```ts
{ userId: string, email: string, color: string }
```

### `user:leave`
Broadcast when a user disconnects.
```ts
{ userId: string }
```

### `cursor:move`
Client → server → room. Throttled to ~50ms.
```ts
{ userId: string, pageId: string, x: number, y: number }
```

---

## Node lock

### `node:lock`
Emitted by client when selecting a node. Server rejects if already locked.
```ts
{ nodeId: string, userId: string, locked: true }
```

### `node:unlock`
Emitted on deselect, disconnect, or 30s inactivity.
```ts
{ nodeId: string, userId: string, locked: false }
```

---

## Canvas mutations (broadcast)

These are emitted by the server to the room after a REST mutation succeeds.

### `node:created`
```ts
{ node: Node }
```

### `node:updated`
```ts
{ node: Partial<Node> & { id: string } }
```

### `node:deleted`
```ts
{ nodeId: string }
```

### `edge:created`
```ts
{ edge: Edge }
```

### `edge:updated`
```ts
{ edge: Partial<Edge> & { id: string } }
```

### `edge:deleted`
```ts
{ edgeId: string }
```

---

## Room scoping

All events are scoped to `page:<pageId>` rooms. Users only receive events for the page they are currently viewing.

---

## Implementation status

Socket.io not yet installed or wired. Planned for Phase 4.
