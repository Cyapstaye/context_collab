import { useCanvasStore } from '../../store/canvasStore';

export default function RightBar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const updateNodeName = useCanvasStore((s) => s.updateNodeName);
  const updateNodeSize = useCanvasStore((s) => s.updateNodeSize);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const updateEdgeWeight = useCanvasStore((s) => s.updateEdgeWeight);
  const updateEdgeRelation = useCanvasStore((s) => s.updateEdgeRelation);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-gray-500">속성 패널</p>
      </div>

      {!selectedNode && !selectedEdge && (
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-center text-xs text-gray-400">
            노드 또는 엣지를 선택하면<br />
            속성이 여기에 표시됩니다.
          </p>
        </div>
      )}

      {selectedNode && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className={[
              'rounded px-2 py-0.5 text-xs font-medium',
              selectedNode.type === 'element'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700',
            ].join(' ')}>
              {selectedNode.type === 'element' ? '요소' : '명제'}
            </span>
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              삭제
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500">이름 Name</span>
            <input
              className="mt-1 w-full rounded border border-border px-2 py-1 text-sm outline-none focus:border-blue-400"
              value={selectedNode.name}
              onChange={(e) => updateNodeName(selectedNode.id, e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">크기 Size — {selectedNode.size.toFixed(1)}</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              className="mt-1 w-full"
              value={selectedNode.size}
              onChange={(e) => updateNodeSize(selectedNode.id, parseFloat(e.target.value))}
            />
          </label>

          <div>
            <span className="text-xs text-gray-500">ID</span>
            <p className="mt-0.5 text-xs text-gray-400 font-mono">{selectedNode.id}</p>
          </div>
        </div>
      )}

      {selectedEdge && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
              엣지 Edge
            </span>
            <button
              onClick={() => deleteEdge(selectedEdge.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              삭제
            </button>
          </div>

          <div>
            <span className="text-xs text-gray-500">연결 Connection</span>
            <p className="mt-0.5 text-xs text-gray-600 font-mono">
              {selectedEdge.source} → {selectedEdge.target}
            </p>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500">가중치 Weight — {selectedEdge.weight.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              className="mt-1 w-full"
              value={selectedEdge.weight}
              onChange={(e) => updateEdgeWeight(selectedEdge.id, parseFloat(e.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">관계 Relation</span>
            <input
              className="mt-1 w-full rounded border border-border px-2 py-1 text-sm outline-none focus:border-blue-400"
              value={selectedEdge.relation}
              placeholder="예: influences, causes..."
              onChange={(e) => updateEdgeRelation(selectedEdge.id, e.target.value)}
            />
          </label>
        </div>
      )}
    </aside>
  );
}
