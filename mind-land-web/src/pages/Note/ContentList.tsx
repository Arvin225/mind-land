import { useMemo, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  openDocumentAction,
  deleteDocumentAction,
  fetchDocumentsAction,
  fetchFoldersAction,
  fetchAllDocumentsAction,
} from "@/store/modules/outlineStore";
import { OutlineDocument, OutlineFolder } from "@/apis/outline";
import { updateDocument, duplicateDocument, deleteFolder } from "@/apis/outline";
import ContextMenu from "@/pages/Diary/ContextMenu";
import { showConfirm } from "@/lib/confirm";
import { useToast } from "@/components/ToastProvider";
import { Folder, FileText, MoreHorizontal, Star } from "lucide-react";

interface ContentListProps {
  currentFolderId: number | null;
  currentView: string;
  onFolderClick: (folderId: number) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString("zh-CN");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

type ContextTarget =
  | { type: "document"; docId: number }
  | { type: "folder"; folder: OutlineFolder };

function countFolderChildren(
  folderId: number,
  folders: OutlineFolder[],
  allDocuments: OutlineDocument[]
): number {
  const childFolders = folders.filter((f) => f.parentId === folderId && !f.del);
  const childDocs = allDocuments.filter(
    (d) => d.folderId === folderId && !d.del
  );
  let total = childFolders.length + childDocs.length;
  for (const cf of childFolders) {
    total += countFolderChildren(cf.id, folders, allDocuments);
  }
  return total;
}

export default function ContentList({
  currentFolderId,
  currentView,
  onFolderClick,
}: ContentListProps) {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const { documents, folders, allDocuments, loading } = useSelector(
    (s: RootState) => s.outline
  );

  const [contextTarget, setContextTarget] = useState<{
    x: number;
    y: number;
    target: ContextTarget;
  } | null>(null);

  const subFolders = useMemo(
    () =>
      folders
        .filter((f) =>
          currentFolderId === null
            ? f.parentId === 0
            : f.parentId === currentFolderId
        )
        .filter((f) => !f.del)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [folders, currentFolderId]
  );

  const filteredDocuments = useMemo(() => {
    let docs = documents;
    if (currentView === "all") {
      const targetFolderId = currentFolderId ?? 0;
      docs = docs.filter((d) => d.folderId === targetFolderId);
    }
    return docs;
  }, [documents, currentFolderId, currentView]);

  // ── Actions ──

  const handleOpenDocument = useCallback(
    (doc: OutlineDocument) => {
      dispatch(openDocumentAction(doc.id));
    },
    [dispatch]
  );

  const handleDeleteDocument = useCallback(
    async (doc: OutlineDocument) => {
      const confirmed = await showConfirm({
        title: "删除文档",
        description: `确定要删除"${doc.title || "未命名"}"吗？`,
        confirmText: "删除",
      });
      if (!confirmed) return;
      await dispatch(deleteDocumentAction(doc.id));
      toast.success("已删除");
    },
    [dispatch, toast]
  );

  const handleFavoriteDocument = useCallback(
    async (doc: OutlineDocument) => {
      try {
        await updateDocument(doc.id, { isFavorite: !doc.isFavorite });
        dispatch(fetchDocumentsAction());
        toast.success(doc.isFavorite ? "已取消收藏" : "已收藏");
      } catch {
        toast.error("操作失败");
      }
    },
    [dispatch, toast]
  );

  const handleRenameDocument = useCallback(
    async (doc: OutlineDocument) => {
      // Using toast info + inline rename would be better, but for now prompt
      const name = window.prompt("重命名", doc.title);
      if (name && name !== doc.title) {
        try {
          await updateDocument(doc.id, { title: name });
          dispatch(fetchDocumentsAction());
          dispatch(fetchAllDocumentsAction());
          toast.success("已重命名");
        } catch {
          toast.error("重命名失败");
        }
      }
    },
    [dispatch, toast]
  );

  const handleDuplicateDocument = useCallback(
    async (doc: OutlineDocument) => {
      try {
        await duplicateDocument(doc.id);
        dispatch(fetchDocumentsAction());
        dispatch(fetchAllDocumentsAction());
        toast.success("已复制");
      } catch {
        toast.error("复制失败");
      }
    },
    [dispatch, toast]
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
        dispatch(fetchAllDocumentsAction());
        toast.success("已删除");
      } catch {
        toast.error("删除失败");
      }
    },
    [dispatch, toast]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, target: ContextTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setContextTarget({ x: e.clientX + 2, y: e.clientY + 2, target });
    },
    []
  );

  const resolveContextMenuItems = useCallback((): {
    label: string;
    onClick: () => void;
    danger?: boolean;
  }[] => {
    if (!contextTarget) return [];
    if (contextTarget.target.type === "folder") {
      const f = contextTarget.target.folder;
      return [
        { label: "删除文件夹", onClick: () => handleDeleteFolder(f), danger: true },
      ];
    }
    const doc = documents.find(
      (d) => d.id === (contextTarget.target as { type: "document"; docId: number }).docId
    );
    if (!doc) return [];
    return [
      { label: "打开", onClick: () => handleOpenDocument(doc) },
      { label: "重命名", onClick: () => handleRenameDocument(doc) },
      { label: "复制", onClick: () => handleDuplicateDocument(doc) },
      { label: doc.isFavorite ? "取消收藏" : "收藏", onClick: () => handleFavoriteDocument(doc) },
      { label: "删除", onClick: () => handleDeleteDocument(doc), danger: true },
    ];
  }, [contextTarget, documents, handleOpenDocument, handleRenameDocument, handleDuplicateDocument, handleFavoriteDocument, handleDeleteDocument, handleDeleteFolder]);

  const showFolders = currentView === "all";
  const totalItems = subFolders.length + filteredDocuments.length;

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable content with max-width */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-text-muted">
              加载中...
            </div>
          ) : showFolders && subFolders.length === 0 && filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-text-muted">
              <span>暂无内容</span>
            </div>
          ) : !showFolders && filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-text-muted">
              <span>暂无文档</span>
            </div>
          ) : (
            <>
              {/* ── Folders ── */}
              {showFolders &&
                subFolders.map((f) => {
                  const childCount = countFolderChildren(f.id, folders, allDocuments);
                  return (
                    <div
                      key={`folder-${f.id}`}
                      onClick={() => onFolderClick(f.id)}
                      onContextMenu={(e) =>
                        handleContextMenu(e, { type: "folder", folder: f })
                      }
                      className="mx-4 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-hover transition-colors cursor-pointer group"
                    >
                      {/* Left: icon + name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Folder className="w-8 h-8 text-text-muted shrink-0" />
                        <div className="min-w-0">
                          <h3 className="text-base font-medium text-text-primary truncate">
                            {f.name}
                          </h3>
                        </div>
                      </div>
                      {/* Middle: metadata */}
                      <div className="text-xs text-text-muted whitespace-nowrap shrink-0 hidden sm:block">
                        {childCount > 0 ? `${childCount} 个子项` : ""}
                      </div>
                      {/* Right: more actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextTarget({
                            x: e.clientX + 2,
                            y: e.clientY + 2,
                            target: { type: "folder", folder: f },
                          });
                        }}
                        className="p-1 rounded-lg hover:bg-accent/10 text-text-muted hover:text-text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

              {/* ── Documents ── */}
              {filteredDocuments.map((doc) => (
                <div
                  key={`doc-${doc.id}`}
                  onClick={() => handleOpenDocument(doc)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, { type: "document", docId: doc.id })
                  }
                  className="mx-4 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-hover transition-colors cursor-pointer group"
                >
                  {/* Left: icon + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-8 h-8 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-base font-medium text-text-primary truncate">
                        {doc.title || "未命名"}
                      </h3>
                    </div>
                  </div>
                  {/* Middle: metadata */}
                  <div className="flex items-center gap-2 text-xs text-text-muted whitespace-nowrap shrink-0">
                    {/* Favorite star */}
                    {doc.isFavorite && (
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                    )}
                    <span className="hidden sm:inline">更新于 {formatRelativeTime(doc.updatedAt)}</span>
                  </div>
                  {/* Right: more actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextTarget({
                        x: e.clientX + 2,
                        y: e.clientY + 2,
                        target: { type: "document", docId: doc.id },
                      });
                    }}
                    className="p-1 rounded-lg hover:bg-accent/10 text-text-muted hover:text-text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      {totalItems > 0 && (
        <div>
          <div className="max-w-[1000px] mx-auto px-4 py-2 text-xs text-text-muted text-right">
            共 {totalItems} 项
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextTarget && (
        <ContextMenu
          x={contextTarget.x}
          y={contextTarget.y}
          items={resolveContextMenuItems()}
          onClose={() => setContextTarget(null)}
        />
      )}
    </div>
  );
}
