import { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  createDocumentAction,
  fetchFoldersAction,
  setCurrentFolderId,
  setCurrentView,
  fetchDocumentsAction,
} from "@/store/modules/outlineStore";
import { createFolder } from "@/apis/outline";

interface CreateDialogProps {
  onClose: () => void;
  parentFolderId?: number;
  defaultFolderId?: number | null;
  /** When set, locks the type and hides the toggle — the button itself implies the type */
  defaultType?: "document" | "folder";
}

export default function CreateDialog({ onClose, parentFolderId, defaultFolderId, defaultType }: CreateDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const folders = useSelector((s: RootState) => s.outline.folders);
  const [type, setType] = useState<"document" | "folder">(defaultType || "document");
  const defaultTitle = defaultType === "folder" ? "未命名文件夹" : "未命名大纲";
  const [title, setTitle] = useState(defaultTitle);
  const [folderId, setFolderId] = useState<number | undefined>(defaultFolderId ?? parentFolderId ?? undefined);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (type === "document") {
        await dispatch(createDocumentAction(title || "未命名大纲", folderId));
      } else {
        const res = await createFolder({ name: title || "未命名文件夹", parentId: folderId });
        if (res.code === 0 && res.result) {
          dispatch(fetchFoldersAction());
          dispatch(setCurrentFolderId(res.result.id));
          dispatch(setCurrentView("all"));
          dispatch(fetchDocumentsAction({ folderId: res.result.id }));
        }
      }
      onClose();
    } catch {
      setSubmitting(false);
    }
  }, [type, title, folderId, submitting, dispatch, onClose]);

  const showToggle = !defaultType;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-surface rounded-xl shadow-xl p-6 w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {type === "document" ? "新建文档" : "新建文件夹"}
        </h3>

        {showToggle && (
          <div className="flex gap-2 mb-4">
            <button
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                type === "document"
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-hover hover:text-text-secondary"
              }`}
              onClick={() => { setType("document"); setTitle("未命名大纲") }}
            >
              文档
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                type === "folder"
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-hover hover:text-text-secondary"
              }`}
              onClick={() => { setType("folder"); setTitle("未命名文件夹") }}
            >
              文件夹
            </button>
          </div>
        )}

        <input
          className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm text-text-primary outline-none focus:border-accent/50 mb-4"
          placeholder={type === "document" ? "文档标题" : "文件夹名称"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        {type === "document" && (
          <select
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary outline-none mb-4"
            value={folderId ?? ""}
            onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">无文件夹</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded-lg hover:bg-hover transition-colors text-text-muted"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            onClick={handleConfirm}
            disabled={submitting}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
