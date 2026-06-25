import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

interface Props {
    docId: number;
    viewRef: React.RefObject<EditorView | null>;
    ready: boolean;
}

interface CursorMemory {
    cursorPos: number;
    scrollTop: number;
    selection: { anchor: number; head: number };
    foldedRanges: Array<{ from: number; to: number }>;
    activeHeadingId: string | null;
    updatedAt: number;
}

const KEY = (docId: number) => `draft:cursor:${docId}`;

export function useCursorMemory({ docId, viewRef, ready }: Props) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restoringRef = useRef(false);
    const skipNextWriteRef = useRef(true); // view 创建后的首次 update 跳过写入

    const writeNow = useCallback(() => {
        if (restoringRef.current) return;
        if (skipNextWriteRef.current) { skipNextWriteRef.current = false; return; }
        const view = viewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        const mem: CursorMemory = {
            cursorPos: sel.head,
            scrollTop: view.scrollDOM.scrollTop,
            selection: { anchor: sel.anchor, head: sel.head },
            foldedRanges: [],
            activeHeadingId: null,
            updatedAt: Date.now(),
        };
        try {
            localStorage.setItem(KEY(docId), JSON.stringify(mem));
        } catch {}
    }, [docId, viewRef]);

    const scheduleWrite = useCallback(() => {
        if (restoringRef.current) return;
        if (skipNextWriteRef.current) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(writeNow, 500);
    }, [writeNow]);

    // 返回一个 CM6 extension，由 DraftEditor 在创建 view 时注入
    // 用 useMemo 稳定引用，避免每次渲染都创建新 extension 导致 view 反复重建
    const cmUpdateListener = useMemo<Extension>(
        () => EditorView.updateListener.of((u) => {
            if (u.selectionSet || u.viewportChanged || u.docChanged) {
                scheduleWrite();
            }
        }),
        [scheduleWrite],
    );

    // 恢复在 DraftEditor 的 view 创建 effect 里同步完成（避免 race）
    // 这里不再做恢复，仅负责写入
    void ready;

    // beforeunload + 卸载兜底
    useEffect(() => {
        const onUnload = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            writeNow();
        };
        window.addEventListener("beforeunload", onUnload);
        return () => {
            window.removeEventListener("beforeunload", onUnload);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            writeNow();
        };
    }, [writeNow]);

    return { cmUpdateListener, writeNow, scheduleWrite };
}
