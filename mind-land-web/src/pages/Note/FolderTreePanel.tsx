import { useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  setCurrentFolderId,
  setCurrentView,
  fetchDocumentsAction,
  fetchFoldersAction,
  openDocumentAction,
  closeDocument,
} from "@/store/modules/outlineStore";
import { OutlineDocument, OutlineFolder } from "@/apis/outline";
import { deleteFolder, updateFolder, createFolder } from "@/apis/outline";
import FolderTreeItem from "./FolderTreeItem";
import ContextMenu from "@/pages/Diary/ContextMenu";
import { showConfirm } from "@/lib/confirm";
import { useToast } from "@/components/ToastProvider";
import { Plus, FileText, Star, Clock, Trash2, ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import CreateDialog from "./CreateDialog";

export default function FolderTreePanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { folders, allDocuments, currentFolderId, currentView, currentDocumentId } = useSelector(
    (s: RootState) => s.outline
  );
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
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
      dispatch(closeDocument());
      dispatch(setCurrentFolderId(folder.id));
      dispatch(setCurrentView("all"));
      dispatch(fetchDocumentsAction({ folderId: folder.id }));
    },
    [dispatch]
  );

  const handleSelectDocument = useCallback(
    (doc: OutlineDocument) => {
      dispatch(openDocumentAction(doc.id));
    },
    [dispatch]
  );

  const getChildFolders = useCallback(
    (parentId: number) =>
      folders
        .filter((f) => f.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [folders]
  );

  const navItems = [
    { view: "favorite", label: "收藏", icon: <Star size={16} /> },
    { view: "recent", label: "最近", icon: <Clock size={16} /> },
    { view: "trash", label: "回收站", icon: <Trash2 size={16} /> },
  ] as const;

  // 「我的文档」虚拟根节点 — 始终展开
  const [myDocExpanded, setMyDocExpanded] = useState(true);

  // 根级文档（folderId=0），展示在「我的文档」下
  const rootDocuments = useMemo(
    () => allDocuments.filter((d) => d.folderId === 0 && !d.del),
    [allDocuments]
  );

  const isAtRoot = currentFolderId === null && currentView === "all" && currentDocumentId === null;

  return (
    <div className="w-[280px] shrink-0 border-r border-border h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-text-secondary">导航</span>
        <button
          className="p-1 rounded-lg hover:bg-hover transition-colors text-text-muted hover:text-text-secondary"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <nav className="px-3 py-1 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm ${
              currentView === item.view
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-hover hover:text-text-primary"
            }`}
            onClick={() => {
              dispatch(closeDocument());
              dispatch(setCurrentView(item.view));
              dispatch(setCurrentFolderId(null));
              if (item.view === "trash") {
                dispatch(fetchFoldersAction(true));
                dispatch(fetchDocumentsAction({ page: 1, size: 50, trash: true }));
              } else {
                dispatch(fetchFoldersAction());
                dispatch(fetchDocumentsAction({
                  page: 1, size: 50,
                  favorite: item.view === "favorite" ? true : undefined,
                  recent: item.view === "recent" ? true : undefined,
                }));
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-border mx-3 my-2" />

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {/* 「我的文档」虚拟根节点 */}
        <div>
          <div
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              isAtRoot ? "bg-accent/10 text-accent" : "hover:bg-hover text-text-secondary"
            }`}
            style={{ paddingLeft: 12 }}
            onClick={() => {
              dispatch(closeDocument());
              dispatch(setCurrentView("all"));
              dispatch(setCurrentFolderId(null));
              dispatch(fetchDocumentsAction({ page: 1, size: 50, folderId: 0 }));
            }}
          >
            <div
              className="w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setMyDocExpanded((v) => !v); }}
            >
              {myDocExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              )}
            </div>
            {myDocExpanded ? (
              <FolderOpen className="w-4 h-4 text-text-muted shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-text-muted shrink-0" />
            )}
            <span className="text-sm truncate flex-1">我的文档</span>
          </div>
          {myDocExpanded && (
            <div>
              {/* 根级子文件夹 */}
              {rootFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  depth={1}
                  allFolders={folders}
                  allDocuments={allDocuments}
                  documents={allDocuments.filter(d => d.folderId === folder.id && !d.del)}
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
              {/* 根级文档 */}
              {rootDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-hover transition-colors cursor-pointer text-sm ${
                    currentDocumentId === doc.id ? "bg-accent/10 text-accent" : "text-text-secondary"
                  }`}
                  style={{ paddingLeft: 44 }}
                  onClick={() => handleSelectDocument(doc)}
                >
                  <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="text-sm truncate">{doc.title || "未命名"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {showCreate && (
        <CreateDialog onClose={() => setShowCreate(false)} defaultFolderId={currentFolderId} />
      )}
    </div>
  );
}
