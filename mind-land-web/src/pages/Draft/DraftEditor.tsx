import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EditorState, EditorSelection } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { history, historyKeymap } from "@codemirror/commands";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDraftAction, setCurrentContent, setSaveStatus, setConflict, bumpVersion } from "@/store/modules/draftStore";
import { removeDraftAction } from "@/store/modules/draftStore";
import EditorToolbar from "./EditorToolbar";
import ConflictToast from "./ConflictToast";
import { typoraPlugin } from "./cm/typoraPlugin";
import { draftInputRules } from "./cm/inputRules";
import { useAutoSave } from "./hooks/useAutoSave";
import { useCursorMemory } from "./hooks/useCursorMemory";
import { useWordCount } from "./hooks/useWordCount";

interface Props {
    docId: number;
}

export default function DraftEditor({ docId }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const current = useAppSelector((s) => s.draft.current);
    const saveStatus = useAppSelector((s) => s.draft.saveStatus);
    const conflict = useAppSelector((s) => s.draft.conflict);

    const editorHostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [ready, setReady] = useState(false);
    const focusTitleRequestedRef = useRef<boolean>(
        Boolean((location.state as { focusTitle?: boolean } | null)?.focusTitle)
    );

    // 加载文档
    useEffect(() => {
        dispatch(fetchDraftAction(docId));
        return () => {
            dispatch(setSaveStatus(""));
            dispatch(setConflict(null));
        };
    }, [docId, dispatch]);

    const content = current?.contentMd ?? "";
    const baseVersion = current?.version ?? 1;

    // hooks 必须在 effect 之前声明，且顺序稳定
    const autoSave = useAutoSave({ docId, content, baseVersion, viewRef });
    const cursorMemory = useCursorMemory({ docId, viewRef, ready });
    const wordCount = useWordCount(content);

    // 重命名入口：聚焦首行（H1 或第一个非空行）
    useEffect(() => {
        if (!ready || !viewRef.current || !focusTitleRequestedRef.current) return;
        const view = viewRef.current;
        const doc = view.state.doc;
        // 找第一个非空行
        let targetLine = 1;
        for (let n = 1; n <= doc.lines; n++) {
            if (doc.line(n).text.trim() !== "") {
                targetLine = n;
                break;
            }
        }
        const line = doc.line(targetLine);
        view.dispatch({
            selection: EditorSelection.cursor(line.from),
            scrollIntoView: true,
        });
        view.focus();
        focusTitleRequestedRef.current = false;
    }, [ready]);

    // 文档加载完成后初始化 CM6（只在 docId 变化或首次加载时创建，保存引起的 version 变化不重建）
    const createdDocIdRef = useRef<number | null>(null);
    const currentDocId = current?.id;
    useEffect(() => {
        if (!currentDocId || currentDocId !== docId || !editorHostRef.current) return;
        if (createdDocIdRef.current === docId && viewRef.current) return;
        if (viewRef.current) {
            viewRef.current.destroy();
            viewRef.current = null;
            setReady(false);
        }
        createdDocIdRef.current = docId;
        // 读取最新的 current 内容（closure 可能是旧的，从 ref 拿）
        const doc = current?.contentMd ?? "";

        const view = new EditorView({
            state: EditorState.create({
                doc,
                extensions: [
                    markdown(),
                    syntaxHighlighting(defaultHighlightStyle),
                    highlightActiveLine(),
                    history(),
                    keymap.of(historyKeymap),
                    typoraPlugin(),
                    draftInputRules(),
                    cursorMemory.cmUpdateListener,
                    EditorView.lineWrapping,
                    EditorView.theme({
                        "&": { height: "100%", fontSize: "15px" },
                        ".cm-content": { padding: "24px 0", maxWidth: "720px", margin: "0 auto" },
                        ".cm-line": { padding: "0 32px" },
                        ".draft-typora-widget h1": { fontSize: "1.8em", fontWeight: 700, margin: "0.6em 0 0.4em", padding: "0 32px" },
                        ".draft-typora-widget h2": { fontSize: "1.5em", fontWeight: 700, margin: "0.5em 0 0.3em", padding: "0 32px" },
                        ".draft-typora-widget h3": { fontSize: "1.25em", fontWeight: 600, margin: "0.4em 0 0.2em", padding: "0 32px" },
                        ".draft-typora-widget p": { margin: "0.3em 0", padding: "0 32px", lineHeight: 1.7 },
                        ".draft-typora-widget ul, .draft-typora-widget ol": { margin: "0.3em 0", paddingLeft: "52px" },
                        ".draft-typora-widget blockquote": { borderLeft: "3px solid var(--border)", paddingLeft: "29px", margin: "0.3em 0", color: "var(--text-secondary)" },
                        ".draft-typora-widget pre": { padding: "12px 32px", background: "var(--surface-elevated, #f5f5f5)", borderRadius: "6px", margin: "0.3em 0", overflow: "auto" },
                        ".draft-typora-widget code": { fontFamily: "var(--font-mono, monospace)", fontSize: "0.9em" },
                        ".draft-typora-widget hr": { border: "none", borderTop: "1px solid var(--border)", margin: "1em 32px" },
                    }),
                    EditorView.updateListener.of((u) => {
                        if (u.docChanged) {
                            dispatch(setCurrentContent(u.state.doc.toString()));
                        }
                    }),
                ],
            }),
            parent: editorHostRef.current,
        });
        viewRef.current = view;
        setReady(true);

        // 同步恢复 cursor memory（在 setReady 之前，避免 cmUpdateListener 写入覆盖旧 memory）
        try {
            const raw = localStorage.getItem(`draft:cursor:${docId}`);
            if (raw) {
                const mem = JSON.parse(raw);
                if (mem && mem.selection) {
                    view.dispatch({
                        selection: { anchor: mem.selection.anchor, head: mem.selection.head },
                    });
                    // scrollTop 在下一帧设（等 CM6 测量完）
                    requestAnimationFrame(() => {
                        if (viewRef.current) {
                            viewRef.current.scrollDOM.scrollTop = mem.scrollTop || 0;
                        }
                    });
                }
            }
        } catch {}

        return () => {
            view.destroy();
            viewRef.current = null;
            setReady(false);
            createdDocIdRef.current = null;
        };
    }, [currentDocId, docId, dispatch, cursorMemory.cmUpdateListener]);

    const handleDelete = () => {
        dispatch(removeDraftAction(docId, () => navigate("/draft")));
    };

    const handleReloadFromServer = () => {
        if (!conflict || !viewRef.current) return;
        const view = viewRef.current;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: conflict.serverContentMd },
        });
        dispatch(setCurrentContent(conflict.serverContentMd));
        dispatch(bumpVersion(conflict.currentVersion));
        dispatch(setConflict(null));
        dispatch(setSaveStatus("saved"));
    };

    const handleOverwriteServer = async () => {
        if (!conflict) return;
        // 用服务端的 currentVersion 作为 baseVersion 立即重 PUT
        dispatch(setConflict(null));
        void autoSave.saveWith(conflict.currentVersion);
    };

    return (
        <div className="h-full flex flex-col">
            <EditorToolbar
                title={current?.title || "无标题"}
                saveStatus={saveStatus}
                wordCount={wordCount}
                onBack={() => navigate("/draft")}
                onDelete={handleDelete}
                docId={docId}
                content={content}
            />
            <div className="flex-1 overflow-hidden bg-background text-text-primary relative">
                <div ref={editorHostRef} className="h-full" />
                {conflict && (
                    <ConflictToast
                        onReload={handleReloadFromServer}
                        onOverwrite={handleOverwriteServer}
                    />
                )}
            </div>
            {/* 隐藏引用确保 autoSave 不被 tree-shake */}
            <span hidden data-autosave={autoSave.save} data-cursor={cursorMemory.cmUpdateListener} data-wc={wordCount} />
        </div>
    );
}
