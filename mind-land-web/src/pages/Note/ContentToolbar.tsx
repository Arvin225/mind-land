import { useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { fetchDocumentsAction, fetchFoldersAction, fetchAllDocumentsAction } from "@/store/modules/outlineStore";
import { emptyTrash } from "@/apis/outline";
import { showConfirm } from "@/lib/confirm";
import { useToast } from "@/components/ToastProvider";
import { Plus, FolderPlus, Trash2 } from "lucide-react";

interface ContentToolbarProps {
  currentFolderId: number | null;
  currentView: string;
  onCreateDocument: (folderId?: number | null) => void;
  onCreateFolder: (folderId?: number | null) => void;
}

export default function ContentToolbar({
  currentFolderId,
  currentView,
  onCreateDocument,
  onCreateFolder,
}: ContentToolbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const folders = useSelector((s: RootState) => s.outline.folders);

  const handleEmptyTrash = useCallback(async () => {
    const confirmed = await showConfirm({
      title: "清空回收站",
      description: "确定要清空回收站中的所有内容吗？此操作不可撤销。",
      confirmText: "清空",
    });
    if (!confirmed) return;
    try {
      await emptyTrash();
      dispatch(fetchFoldersAction(true));
      dispatch(fetchDocumentsAction({ trash: true }));
      dispatch(fetchAllDocumentsAction());
      toast.success("回收站已清空");
    } catch {
      toast.error("清空失败");
    }
  }, [dispatch, toast]);

  const title = useMemo(() => {
    if (currentView === "trash") return "回收站";
    if (currentView === "favorite") return "收藏";
    if (currentView === "recent") return "最近";
    if (currentFolderId === null) return "我的文档";
    const folder = folders.find((f) => f.id === currentFolderId);
    return folder?.name || "我的文档";
  }, [currentView, currentFolderId, folders]);

  const showButtons = currentView === "all";

  return (
    <div className="flex items-center justify-between px-6 pt-1 pb-3">
      <div className="max-w-[1000px] mx-auto w-full flex items-center justify-between">
        <h2 className="text-[34px] font-bold text-text-primary pl-8">{title}</h2>
        {showButtons && (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-muted hover:bg-hover hover:text-text-secondary transition-colors text-sm"
              onClick={() => onCreateFolder(currentFolderId)}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              新建文件夹
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm"
              onClick={() => onCreateDocument(currentFolderId)}
            >
              <Plus className="w-3.5 h-3.5" />
              新建文档
            </button>
          </div>
        )}
        {currentView === "trash" && (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm"
              onClick={handleEmptyTrash}
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空回收站
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
