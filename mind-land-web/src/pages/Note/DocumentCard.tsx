import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import {
  openDocumentAction,
  deleteDocumentAction,
  fetchDocumentsAction,
} from "@/store/modules/outlineStore";
import { OutlineDocument } from "@/apis/outline";
import { updateDocument, duplicateDocument } from "@/apis/outline";
import ContextMenu from "@/pages/Diary/ContextMenu";
import { showConfirm } from "@/lib/confirm";
import { useToast } from "@/components/ToastProvider";
import { Star } from "lucide-react";

interface DocumentCardProps {
  document: OutlineDocument;
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

export default function DocumentCard({ document: doc }: DocumentCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleClick = useCallback(() => {
    dispatch(openDocumentAction(doc.id));
  }, [dispatch, doc.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleOpen = useCallback(() => {
    dispatch(openDocumentAction(doc.id));
  }, [dispatch, doc.id]);

  const handleDelete = useCallback(async () => {
    const confirmed = await showConfirm({
      title: "删除文档",
      description: `确定要删除"${doc.title || "未命名"}"吗？`,
      confirmText: "删除",
    });
    if (!confirmed) return;
    await dispatch(deleteDocumentAction(doc.id));
    toast.success("已删除");
  }, [dispatch, doc, toast]);

  const handleFavorite = useCallback(async () => {
    try {
      await updateDocument(doc.id, { isFavorite: !doc.isFavorite });
      dispatch(fetchDocumentsAction());
      toast.success(doc.isFavorite ? "已取消收藏" : "已收藏");
    } catch {
      toast.error("操作失败");
    }
  }, [dispatch, doc, toast]);

  const handleRename = useCallback(async () => {
    const name = window.prompt("重命名", doc.title);
    if (name && name !== doc.title) {
      try {
        await updateDocument(doc.id, { title: name });
        dispatch(fetchDocumentsAction());
        toast.success("已重命名");
      } catch {
        toast.error("重命名失败");
      }
    }
  }, [dispatch, doc, toast]);

  const handleDuplicate = useCallback(async () => {
    try {
      await duplicateDocument(doc.id);
      dispatch(fetchDocumentsAction());
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  }, [dispatch, doc.id, toast]);

  return (
    <>
      <div
        className="mx-4 py-3 px-4 rounded-lg hover:bg-hover transition-colors cursor-pointer"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {doc.title || "未命名"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              更新于 {formatRelativeTime(doc.updatedAt)}
            </p>
          </div>
          <button
            className={`p-1 rounded-lg hover:bg-hover transition-colors shrink-0 ${
              doc.isFavorite ? "text-yellow-500" : "text-text-muted"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleFavorite();
            }}
          >
            <Star
              className={`w-4 h-4 ${doc.isFavorite ? "fill-yellow-500" : ""}`}
            />
          </button>
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { label: "打开", onClick: handleOpen },
            { label: "重命名", onClick: handleRename },
            { label: "复制", onClick: handleDuplicate },
            { label: "收藏", onClick: handleFavorite },
            { label: "删除", onClick: handleDelete, danger: true },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
