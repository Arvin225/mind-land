import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Plus, FolderPlus } from "lucide-react";

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
  const folders = useSelector((s: RootState) => s.outline.folders);

  const folderName = useMemo(() => {
    if (currentFolderId === null) return "我的文档";
    const folder = folders.find((f) => f.id === currentFolderId);
    return folder?.name || "我的文档";
  }, [currentFolderId, folders]);

  const showButtons = currentView === "all";

  return (
    <div className="flex items-center justify-between px-6 pt-1 pb-3">
      <div className="max-w-[1000px] mx-auto w-full flex items-center justify-between">
        <h2 className="text-[34px] font-bold text-text-primary pl-8">{folderName}</h2>
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
      </div>
    </div>
  );
}
