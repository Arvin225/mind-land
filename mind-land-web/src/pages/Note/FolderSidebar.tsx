import { useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  fetchFoldersAction,
  fetchDocumentsAction,
  openDocumentAction,
} from "@/store/modules/outlineStore";
import { OutlineDocument, OutlineFolder } from "@/apis/outline";
import { deleteFolder, updateFolder, createFolder } from "@/apis/outline";
import FolderTreeItem from "./FolderTreeItem";
import ContextMenu from "@/pages/Diary/ContextMenu";
import { showConfirm } from "@/lib/confirm";
import { useToast } from "@/components/ToastProvider";
import { Plus, FileText, Star, Clock, Trash2 } from "lucide-react";

interface FolderSidebarProps {
  currentView: string;
  onViewChange: (view: "all" | "favorite" | "recent" | "trash") => void;
  onCreateFolder: () => void;
}

type ViewType = "all" | "favorite" | "recent" | "trash";

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: "all", label: "全部文档", icon: <FileText className="w-4 h-4" /> },
  { view: "favorite", label: "收藏", icon: <Star className="w-4 h-4" /> },
  { view: "recent", label: "最近", icon: <Clock className="w-4 h-4" /> },
  { view: "trash", label: "回收站", icon: <Trash2 className="w-4 h-4" /> },
];

export default function FolderSidebar({ currentView, onViewChange, onCreateFolder }: FolderSidebarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { folders, allDocuments, currentFolderId, currentDocumentId } = useSelector(
    (s: RootState) => s.outline
  );
  const toast = useToast();
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(
    () => new Set(folders.filter((f) => f.isExpanded).map((f) => f.id))
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folder: OutlineFolder;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const rootFolders = useMemo(
    () =>
      folders
        .filter((f) => !f.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [folders]
  );

  const toggleExpand = useCallback((id: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleFolderContextMenu = useCallback(
    (e: React.MouseEvent, folder: OutlineFolder) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, folder });
    },
    []
  );

  const handleRenameFolder = useCallback(
    (folder: OutlineFolder) => {
      setRenamingId(folder.id);
      setRenameValue(folder.name);
    },
    []
  );

  const submitRename = useCallback(
    async (folder: OutlineFolder) => {
      if (!renameValue.trim() || renameValue === folder.name) {
        setRenamingId(null);
        return;
      }
      try {
        await updateFolder(folder.id, { name: renameValue.trim() });
        dispatch(fetchFoldersAction());
        toast.success("已重命名");
      } catch {
        toast.error("重命名失败");
      }
      setRenamingId(null);
    },
    [renameValue, dispatch, toast]
  );

  const handleDeleteFolder = useCallback(
    async (folder: OutlineFolder) => {
      const confirmed = await showConfirm({
        title: "删除文件夹",
        description: `确定要删除"${folder.name}"吗？`,
        confirmText: "删除",
      });
      if (!confirmed) return;
      try {
        await deleteFolder(folder.id);
        dispatch(fetchFoldersAction());
        toast.success("已删除");
      } catch {
        toast.error("删除失败");
      }
    },
    [dispatch, toast]
  );

  const handleCreateSubFolder = useCallback(
    async (parent: OutlineFolder) => {
      try {
        await createFolder({ name: "未命名文件夹", parentId: parent.id });
        dispatch(fetchFoldersAction());
        setExpandedFolders((prev) => new Set([...prev, parent.id]));
        toast.success("已创建");
      } catch {
        toast.error("创建失败");
      }
    },
    [dispatch, toast]
  );

  const handleSelectFolder = useCallback(
    (folder: OutlineFolder) => {
      onViewChange("all");
      dispatch(fetchDocumentsAction({ folderId: folder.id }));
    },
    [dispatch, onViewChange]
  );

  const handleSelectDocument = useCallback(
    (doc: OutlineDocument) => {
      dispatch(openDocumentAction(doc.id));
    },
    [dispatch]
  );

  return (
    <div className="w-[280px] shrink-0 border-r border-border h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-text-secondary">文件夹</span>
        <button
          className="p-1 rounded-lg hover:bg-hover transition-colors text-text-muted hover:text-text-secondary"
          onClick={onCreateFolder}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <nav className="px-2 py-1 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm ${
              currentView === item.view
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-hover hover:text-text-primary"
            }`}
            onClick={() => onViewChange(item.view)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {rootFolders.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            depth={0}
            allFolders={folders}
            allDocuments={allDocuments}
            documents={allDocuments.filter(d => d.folderId === folder.id)}
            expandedFolders={expandedFolders}
            renamingId={renamingId}
            renameValue={renameValue}
            currentFolderId={currentFolderId}
            currentDocumentId={currentDocumentId}
            onToggleExpand={toggleExpand}
            onSelectFolder={handleSelectFolder}
            onSelectDocument={handleSelectDocument}
            onContextMenu={handleFolderContextMenu}
            onRenameChange={setRenameValue}
            onSubmitRename={submitRename}
          />
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { label: "重命名", onClick: () => handleRenameFolder(contextMenu.folder) },
            { label: "新建子文件夹", onClick: () => handleCreateSubFolder(contextMenu.folder) },
            { label: "删除", onClick: () => handleDeleteFolder(contextMenu.folder), danger: true },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
