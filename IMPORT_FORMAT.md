# Page Map Import Format

This document is the complete specification for the JSON format accepted by the Import feature. Any data written to this spec can be pasted directly into the Import dialog and will be validated, previewed, and merged into the current page correctly.

---

## Top-level structure

```json
{
  "version": 1,
  "page": { ... },
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

| Field     | Type            | Required | Description |
|-----------|-----------------|----------|-------------|
| `version` | `1` (literal)   | yes      | Always the integer `1`. Any other value is rejected. |
| `page`    | Page object     | yes      | Metadata for the page this map came from. Labels and relations are merged into the target page on import. |
| `nodes`   | Node array      | yes      | All nodes (elements and propositions) in the map. |
| `edges`   | Edge array      | yes      | All edges (connections between nodes) in the map. |

---

## Page object

```json
{
  "id": "clxyz123",
  "projectId": "clabc456",
  "name": "My Map",
  "labels": [
    { "name": "Environment", "color": "#22c55e" },
    { "name": "Human",       "color": "#3b82f6" }
  ],
  "relations": ["positive", "negative", "resonate"],
  "order": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

| Field       | Type            | Required | Notes |
|-------------|-----------------|----------|-------|
| `id`        | string          | yes      | Ignored on import — the target page keeps its own ID. |
| `projectId` | string          | yes      | Ignored on import. |
| `name`      | string (min 1)  | yes      | Ignored on import — the target page keeps its own name. |
| `labels`    | LabelDef array  | yes      | Merged into the target page. Labels whose `name` already exists are skipped. |
| `relations` | string array    | yes      | Merged into the target page's relation pool. Duplicates are skipped. |
| `order`     | integer         | yes      | Ignored on import. |
| `createdAt` | ISO 8601 string | yes      | Ignored on import. |
| `updatedAt` | ISO 8601 string | yes      | Ignored on import. |

### LabelDef object

```json
{ "name": "Environment", "color": "#22c55e" }
```

| Field   | Type   | Notes |
|---------|--------|-------|
| `name`  | string | Human-readable label name. Referenced by nodes via `labels` array. |
| `color` | string | Hex color string, e.g. `"#ff5500"`. Use `""` for no colour. |

---

## Node object

Nodes are the core entities on the map — either **elements** (concrete things) or **propositions** (statements or concepts).

```json
{
  "id": "node_abc123",
  "pageId": "clxyz123",
  "type": "element",
  "name": "Climate Change",
  "labels": ["Environment"],
  "size": 1.5,
  "positions": {
    "element":     { "x": 320, "y": 180 },
    "proposition": null,
    "layer":       { "x": 320, "y": 180 },
    "axis3d":      null
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

| Field       | Type                    | Required | Constraints | Notes |
|-------------|-------------------------|----------|-------------|-------|
| `id`        | string                  | yes      | —           | The deduplication key. If a node with this ID already exists on the target page, it is reused and not recreated. Set to `""` to always create a fresh node. |
| `pageId`    | string                  | yes      | —           | Ignored on import. |
| `type`      | `"element"` \| `"proposition"` | yes | — | Determines which canvas view the node appears in. See [Node types](#node-types). |
| `name`      | string                  | yes      | min length 1 | Display name shown on the canvas. |
| `labels`    | string array            | yes      | —           | Each string must match a `name` in `page.labels`. Labels not in the page vocabulary are stored but will not display a coloured dot. |
| `size`      | number                  | yes      | 0.1 – 10.0  | Visual size multiplier. Default is `1.0`. |
| `positions` | NodePositions object    | yes      | —           | Per-view canvas coordinates. See [NodePositions](#nodepositions). |
| `createdAt` | ISO 8601 string         | yes      | —           | Ignored on import. |
| `updatedAt` | ISO 8601 string         | yes      | —           | Ignored on import. |

### Node types

| Value          | Description |
|----------------|-------------|
| `"element"`    | A concrete entity or thing. Shown in the **Element** and **Layer** views as a circle. |
| `"proposition"`| A statement, claim, or relational concept. Shown in the **Proposition** view as a rounded rectangle. |

### NodePositions

Each view has an independent `{x, y}` coordinate, or `null` if the node has not been placed in that view.

```json
{
  "element":     { "x": 320, "y": 180 },
  "proposition": null,
  "layer":       { "x": 320, "y": 180 },
  "axis3d":      null
}
```

| Key           | Description |
|---------------|-------------|
| `element`     | Position in the Element view (canvas pixels, origin top-left). |
| `proposition` | Position in the Proposition view. |
| `layer`       | Position in the Layer view. Element nodes automatically share their `element` position here when created. |
| `axis3d`      | Reserved. Currently unused — always `null`. |

**Rules:**
- An `element`-type node should have a position in `element` (and typically `layer`). `proposition` can be `null`.
- A `proposition`-type node should have a position in `proposition`. `element` can be `null`.
- Any view can be `null` — the node simply won't appear in that view until manually placed.

---

## Edge object

Edges are directional connections between two nodes.

```json
{
  "id": "edge_def456",
  "pageId": "clxyz123",
  "source": "node_abc123",
  "target": "node_xyz789",
  "weight": 0.8,
  "relation": "positive",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

| Field       | Type            | Required | Constraints | Notes |
|-------------|-----------------|----------|-------------|-------|
| `id`        | string          | yes      | —           | Ignored on import. Edges are deduplicated by source–target pair, not by ID. |
| `pageId`    | string          | yes      | —           | Ignored on import. |
| `source`    | string          | yes      | ≠ `target`  | ID of the source node. Must match a node `id` present in this file (or already on the target page). **Must not equal `target`** — self-loops are invalid and will be skipped on import. |
| `target`    | string          | yes      | ≠ `source`  | ID of the target node. Same rules as `source`. |
| `weight`    | number          | yes      | 0.1 – 1.2   | Visual strength of the connection. Default `0.5`. Controls opacity on the canvas. |
| `relation`  | string          | yes      | see below   | Encodes the connection type and direction. Default `""`. See [Relation strings](#relation-strings). |
| `createdAt` | ISO 8601 string | yes      | —           | Ignored on import. |
| `updatedAt` | ISO 8601 string | yes      | —           | Ignored on import. |

### Relation strings

The `relation` field encodes both the **connection type** and the **direction** in a single string.

| String            | Type     | Direction | Meaning |
|-------------------|----------|-----------|---------|
| `""`              | none     | —         | Untyped connection |
| `"positive"`      | positive | A → B     | A positively influences B |
| `"positive-back"` | positive | B → A     | B positively influences A |
| `"positive-both"` | positive | A ↔ B     | Mutual positive influence |
| `"negative"`      | negative | A → B     | A negatively influences B |
| `"negative-back"` | negative | B → A     | B negatively influences A |
| `"negative-both"` | negative | A ↔ B     | Mutual negative influence |
| `"resonate"`      | resonate | A ↔ B     | Resonance (always bidirectional) |
| `"offset"`        | offset   | A ↔ B     | Offset/counterbalance (always bidirectional) |

> **A** = the node in `source`, **B** = the node in `target`.

---

## Import behaviour

Understanding how the importer handles your data:

### Node deduplication

| Imported node `id` | Exists on target page? | Result |
|--------------------|------------------------|--------|
| Non-empty string   | Yes — same ID found    | **Reused as-is.** No new node created. Any edges in the import that reference this ID will connect to the existing node. |
| Non-empty string   | No match found         | **Created fresh.** The server assigns a new ID; the old ID is mapped internally so edges still connect correctly. |
| `""` (empty)       | N/A                    | **Always created fresh.** Edges cannot reference empty-ID nodes, so leave IDs empty only for standalone nodes with no edges. |

### Edge deduplication

An edge is skipped if an edge with the same source–target pair (in either direction) already exists on the target page.

### Label and relation merging

- Labels from `page.labels` whose `name` doesn't already exist on the target page are appended to the page's label vocabulary.
- Relation strings from `page.relations` that aren't already in the target page's pool are appended.

---

## Complete minimal example

A two-node map with one connection:

```json
{
  "version": 1,
  "page": {
    "id": "page_001",
    "projectId": "proj_001",
    "name": "Example Map",
    "labels": [
      { "name": "System",  "color": "#6366f1" },
      { "name": "Outcome", "color": "#f59e0b" }
    ],
    "relations": ["positive", "negative"],
    "order": 0,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "nodes": [
    {
      "id": "n1",
      "pageId": "page_001",
      "type": "element",
      "name": "Policy Intervention",
      "labels": ["System"],
      "size": 1.0,
      "positions": {
        "element":     { "x": 200, "y": 200 },
        "proposition": null,
        "layer":       { "x": 200, "y": 200 },
        "axis3d":      null
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": "n2",
      "pageId": "page_001",
      "type": "element",
      "name": "Carbon Emissions",
      "labels": ["Outcome"],
      "size": 1.2,
      "positions": {
        "element":     { "x": 500, "y": 200 },
        "proposition": null,
        "layer":       { "x": 500, "y": 200 },
        "axis3d":      null
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "pageId": "page_001",
      "source": "n1",
      "target": "n2",
      "weight": 0.9,
      "relation": "negative",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Quick reference — field constraints

| Field            | Constraint |
|------------------|------------|
| `version`        | Must be exactly `1` |
| `page.name`      | Min 1 character |
| `node.name`      | Min 1 character |
| `node.type`      | `"element"` or `"proposition"` |
| `node.size`      | `0.1` – `10.0` |
| `edge.source`    | Must not equal `edge.target` — self-loops are skipped |
| `edge.weight`    | `0.1` – `1.2` |
| `edge.relation`  | One of the strings in the table above, or `""` |
| All `id` fields  | Any non-empty string (UUIDs or slugs both work) |
| All date fields  | ISO 8601 string (value is not validated, just needs to be a string) |
