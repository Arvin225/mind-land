import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDraftListAction, createDraftAction, removeDraftAction } from "@/store/modules/draftStore";
import { Plus, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export default function DraftList() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const list = useAppSelector((s) => s.draft.list);

    // 行菜单状态
    const [menuFor, setMenuFor] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    // 删除确认状态
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(fetchDraftListAction());
    }, [dispatch]);

    // 点击外部关闭行菜单
    useEffect(() => {
        if (menuFor === null) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuFor(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuFor]);

    const handleCreate = () => {
        dispatch(createDraftAction((id) => navigate(`/draft/${id}`)));
    };

    const handleRename = (id: number) => {
        setMenuFor(null);
        // 进入编辑器并聚焦首行（通过 location state 传信号）
        navigate(`/draft/${id}`, { state: { focusTitle: true } });
    };

    const handleAskDelete = (id: number) => {
        setMenuFor(null);
        setConfirmDeleteId(id);
    };

    const handleConfirmDelete = () => {
        if (confirmDeleteId === null) return;
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        dispatch(removeDraftAction(id)); // thunk 内部会清 localStorage cursor key + 从列表移除
    };

    const handleCancelDelete = () => setConfirmDeleteId(null);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* 顶栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h1 className="text-lg font-serif-display text-text-primary">稿纸</h1>
                {list.length > 0 && (
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        新建稿纸
                    </button>
                )}
            </div>

            {/* 列表 / 空态 */}
            <div className="flex-1 overflow-auto">
                {list.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <FileText className="w-16 h-16 text-text-muted/30 mb-6" />
                        <p className="text-text-secondary mb-6">还没有稿纸。开始第一篇吧。</p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            开始第一篇稿纸
                        </button>
                    </div>
                ) : (
                    <ul className="max-w-3xl mx-auto px-6 py-4 space-y-1">
                        {list.map((d) => (
                            <li
                                key={d.id}
                                className="relative rounded-lg hover:bg-hover transition-colors group"
                            >
                                <button
                                    onClick={() => navigate(`/draft/${d.id}`)}
                                    className="w-full text-left px-4 py-3 rounded-lg"
                                >
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="font-medium text-text-primary truncate">
                                            {d.title || "无标题"}
                                        </span>
                                        <span className="text-xs text-text-muted shrink-0">
                                            {formatDate(d.updatedAt)}
                                        </span>
                                    </div>
                                    {d.preview && (
                                        <p className="text-sm text-text-secondary truncate mt-0.5">
                                            {d.preview}
                                        </p>
                                    )}
                                </button>
                                {/* 三点菜单触发按钮（hover 显示） */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuFor((cur) => (cur === d.id ? null : d.id));
                                    }}
                                    className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-hover/80 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="更多"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {/* 行菜单 */}
                                {menuFor === d.id && (
                                    <div
                                        ref={menuRef}
                                        className="absolute right-2 top-9 z-10 min-w-[140px] rounded-lg border border-border bg-surface shadow-lg py-1"
                                    >
                                        <button
                                            onClick={() => handleRename(d.id)}
                                            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-text-primary hover:bg-hover transition-colors rounded-lg mx-1"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            重命名
                                        </button>
                                        <button
                                            onClick={() => handleAskDelete(d.id)}
                                            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-red-600 hover:bg-hover transition-colors rounded-lg mx-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            删除
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 删除确认对话框 */}
            {confirmDeleteId !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={handleCancelDelete}
                >
                    <div
                        className="rounded-lg border border-border bg-surface shadow-xl p-5 max-w-sm w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-medium text-text-primary mb-2">删除稿纸？</h3>
                        <p className="text-sm text-text-secondary mb-4">
                            稿纸将移入回收站，可在后端恢复。此操作不会立即物理删除。
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleCancelDelete}
                                className="px-3 py-1.5 rounded-lg text-sm bg-hover hover:bg-hover/80 text-text-primary transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-3 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString([], sameYear ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
}
