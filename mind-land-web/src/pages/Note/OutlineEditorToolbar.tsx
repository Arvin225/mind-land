import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { setMindMapView, setDocumentTitle } from "@/store/modules/outlineStore";
import { Network, ListTree, MoreHorizontal, History } from "lucide-react";

interface OutlineEditorToolbarProps {
  onVersionHistory?: () => void;
}

export default function OutlineEditorToolbar({ onVersionHistory }: OutlineEditorToolbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentDocumentTitle, isMindMapView, saveStatus, documents, currentDocumentId } =
    useSelector((s: RootState) => s.outline);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const title = currentDocumentTitle || documents.find((d) => d.id === currentDocumentId)?.title || "无标题";

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setDocumentTitle(e.target.value));
    },
    [dispatch],
  );

  const finishTitleEdit = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const saveStatusDot = useMemo(() => {
    if (saveStatus === "saved") return "bg-emerald-400";
    if (saveStatus === "saving") return "bg-amber-400 animate-pulse";
    if (saveStatus === "unsaved") return "bg-orange-400";
    return "bg-gray-400";
  }, [saveStatus]);

  return (
    <div className="flex items-center justify-center px-4 py-2 border-b border-border bg-surface shrink-0">
      <div className="max-w-[1000px] mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full ${saveStatusDot} shrink-0`} title={saveStatus || "就绪"} />
          {isEditingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={handleTitleChange}
              onBlur={finishTitleEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishTitleEdit();
              }}
              className="bg-transparent border-b border-accent/30 px-1 py-0.5 text-sm font-medium text-text-primary focus:outline-none min-w-[120px]"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-medium text-text-primary cursor-text hover:bg-hover rounded-lg px-1.5 py-0.5 transition-colors truncate"
            >
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => dispatch(setMindMapView(!isMindMapView))}
            className={`p-1.5 rounded-lg transition-colors ${
              isMindMapView
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:text-text-primary hover:bg-hover"
            }`}
            title={isMindMapView ? "切换到大纲视图" : "切换到脑图视图"}
          >
            {isMindMapView ? <ListTree size={16} /> : <Network size={16} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors cursor-pointer"
              title="更多"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-surface border border-border rounded-xl shadow-xl py-1">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onVersionHistory?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-hover transition-colors text-xs text-text-primary"
                  >
                    <History size={14} />
                    版本历史
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
