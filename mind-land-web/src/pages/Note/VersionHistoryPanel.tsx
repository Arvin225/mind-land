import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  fetchVersionsAction,
  createVersionAction,
  restoreVersionAction,
} from "@/store/modules/outlineStore";
import { deleteVersion, OutlineNode } from "@/apis/outline";
import { X, Clock, RotateCcw, Plus, Trash2, Eye } from "lucide-react";

interface VersionHistoryPanelProps {
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  auto: "自动保存",
  manual: "手动保存",
  "title-change": "标题变更",
  "pre-restore": "恢复前备份",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source;
}

export default function VersionHistoryPanel({ onClose }: VersionHistoryPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { versions, currentDocumentId } = useSelector((s: RootState) => s.outline);

  const [previewVersionId, setPreviewVersionId] = useState<number | null>(null);
  const [previewNodes, setPreviewNodes] = useState<OutlineNode[]>([]);
  const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(null);

  useEffect(() => {
    if (currentDocumentId) {
      dispatch(fetchVersionsAction(currentDocumentId));
    }
  }, [currentDocumentId, dispatch]);

  const handleCreate = useCallback(() => {
    if (currentDocumentId) {
      dispatch(createVersionAction(currentDocumentId));
    }
  }, [currentDocumentId, dispatch]);

  const handleRestore = useCallback(
    (versionId: number) => {
      dispatch(restoreVersionAction(versionId));
      setConfirmRestoreId(null);
      onClose();
    },
    [dispatch, onClose],
  );

  const handleDelete = useCallback(
    async (versionId: number) => {
      if (!currentDocumentId) return;
      try {
        await deleteVersion(versionId);
        dispatch(fetchVersionsAction(currentDocumentId));
      } catch (e) {
        console.error("删除版本失败", e);
      }
    },
    [currentDocumentId, dispatch],
  );

  const handlePreview = useCallback(
    (versionId: number) => {
      if (previewVersionId === versionId) {
        setPreviewVersionId(null);
        setPreviewNodes([]);
        return;
      }
      const version = versions.find((v) => v.id === versionId);
      if (!version) return;
      try {
        const parsed = JSON.parse(version.snapshot);
        setPreviewNodes(Array.isArray(parsed) ? parsed : []);
      } catch {
        setPreviewNodes([]);
      }
      setPreviewVersionId(versionId);
    },
    [versions, previewVersionId],
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 z-50 h-full w-[380px] bg-surface border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-primary" />
            <h2 className="text-sm font-medium text-text-primary">版本历史</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-xs"
            >
              <Plus className="w-3 h-3" />
              创建版本
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-text-muted">
              暂无版本记录
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="border-b border-border/50 last:border-0"
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-primary font-medium">
                      {formatTime(version.createdAt)}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-background border border-border text-text-muted">
                      {sourceLabel(version.source)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      {version.nodeCount} 个节点
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePreview(version.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          previewVersionId === version.id
                            ? "bg-accent/10 text-accent"
                            : "text-text-muted hover:text-text-primary hover:bg-hover"
                        }`}
                        title="预览"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(version.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                        title="恢复"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(version.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {previewVersionId === version.id && previewNodes.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="bg-background border border-border rounded-lg p-3 max-h-[240px] overflow-y-auto space-y-1">
                      {previewNodes.map((node) => (
                        <div
                          key={node.id}
                          className="text-xs text-text-secondary py-0.5 pl-3 border-l-2 border-accent/30"
                        >
                          {node.content || "(空)"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {confirmRestoreId !== null && (
          <div className="shrink-0 px-4 py-3 border-t border-border bg-background">
            <p className="text-xs text-text-secondary mb-2">
              恢复版本将替换当前内容，确定要恢复此版本吗？
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRestore(confirmRestoreId)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs hover:bg-[#c49564] transition-colors"
              >
                确定恢复
              </button>
              <button
                onClick={() => setConfirmRestoreId(null)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border text-text-secondary text-xs hover:bg-hover transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
