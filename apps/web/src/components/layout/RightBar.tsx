// Phase 6: node/edge property editing
export default function RightBar() {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium text-gray-500">속성 패널</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-center text-xs text-gray-400">
          노드 또는 엣지를 선택하면<br />
          속성이 여기에 표시됩니다.
        </p>
      </div>

      {/* Node selected — Phase 6 */}
      {/* <div className="p-4 space-y-4">
        <label className="block">
          <span className="text-xs text-gray-500">이름 Name</span>
          <input className="mt-1 w-full rounded border border-border px-2 py-1 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">크기 Size</span>
          <input type="range" min="0.1" max="10" step="0.1" className="mt-1 w-full" />
        </label>
      </div> */}
    </aside>
  );
}
