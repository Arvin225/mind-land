import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import SaveStatusDot from "./SaveStatusDot";
import type { SaveStatus } from "@/store/modules/draftStore";

interface Props {
    title: string;
    saveStatus: SaveStatus;
    wordCount: number;
    docId: number;
    content: string;
    onBack: () => void;
    onDelete: () => void;
}

export default function EditorToolbar({ title, saveStatus, wordCount, docId, content, onBack, onDelete }: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen]);

    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = title && title !== "无标题" ? `${title}.md` : `draft-${docId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMenuOpen(false);
    };

    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                    onClick={onBack}
                    className="p-1.5 rounded-lg hover:bg-hover transition-colors text-text-secondary"
                    title="返回列表"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-text-primary truncate font-serif-display">
                    {title}
                </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-text-muted tabular-nums">{wordCount} 字</span>
                <SaveStatusDot status={saveStatus} />
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-1.5 rounded-lg hover:bg-hover transition-colors text-text-secondary"
                        title="更多"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg border border-border bg-surface shadow-lg z-10 py-1">
                            <button
                                onClick={handleDownload}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-hover transition-colors rounded-lg mx-1"
                            >
                                下载 .md
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); onDelete(); }}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-hover transition-colors rounded-lg mx-1"
                            >
                                删除
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
