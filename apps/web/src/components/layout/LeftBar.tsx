interface Props {
  projectId: string;
  pageId: string;
}

export default function LeftBar({ projectId, pageId }: Props) {
  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border bg-panel">
      {/* Project name */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-gray-400">프로젝트</p>
        <h2 className="mt-0.5 truncate text-sm font-semibold text-gray-800">{projectId || '—'}</h2>
      </div>

      {/* Pages list */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">페이지</p>
          <button
            className="text-xs text-blue-500 hover:text-blue-700"
            title="페이지 추가 (Phase 3)"
          >
            + 추가
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">현재: {pageId || '—'}</p>
      </div>

      {/* Elements list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">요소 Element</p>
          <button
            className="text-xs text-blue-500 hover:text-blue-700"
            title="요소 추가 (Phase 2)"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 italic">비어 있음</p>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">명제 Proposition</p>
          <button
            className="text-xs text-blue-500 hover:text-blue-700"
            title="명제 추가 (Phase 2)"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 italic">비어 있음</p>
      </div>
    </aside>
  );
}
