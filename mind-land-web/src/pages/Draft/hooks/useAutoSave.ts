import { useEffect, useRef, useCallback } from "react";
import type { EditorView } from "@codemirror/view";
import { updateDraft } from "@/apis/draft";
import { useAppDispatch } from "@/store/hooks";
import { setSaveStatus, bumpVersion, setConflict } from "@/store/modules/draftStore";

interface Props {
    docId: number;
    content: string;
    baseVersion: number;
    viewRef: React.RefObject<EditorView | null>;
}

export function useAutoSave({ docId, content, baseVersion, viewRef }: Props) {
    void viewRef; // 保留参数供未来 diff patch 扩展
    const dispatch = useAppDispatch();

    const contentRef = useRef(content);
    contentRef.current = content;
    const baseVersionRef = useRef(baseVersion);
    baseVersionRef.current = baseVersion;
    const inFlightRef = useRef(false);
    const dirtyAfterSaveRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const doSave = useCallback(async (versionOverride?: number) => {
        if (inFlightRef.current) {
            dirtyAfterSaveRef.current = true;
            return;
        }
        inFlightRef.current = true;
        dispatch(setSaveStatus("saving"));
        try {
            const res = await updateDraft(docId, {
                contentMd: contentRef.current,
                baseVersion: versionOverride ?? baseVersionRef.current,
            });
            if (res.code === 0 && res.result) {
                dispatch(bumpVersion(res.result.version));
                dispatch(setConflict(null));
                if (dirtyAfterSaveRef.current) {
                    dirtyAfterSaveRef.current = false;
                    dispatch(setSaveStatus("unsaved"));
                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => { void doSave(); }, 100);
                } else {
                    dispatch(setSaveStatus("saved"));
                }
            }
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 409) {
                const conflict = e.response?.data?.result;
                if (conflict) {
                    dispatch(setConflict({
                        currentVersion: conflict.currentVersion,
                        serverContentMd: conflict.serverContentMd,
                    }));
                }
                dispatch(setSaveStatus("error"));
            } else {
                dispatch(setSaveStatus("error"));
            }
        } finally {
            inFlightRef.current = false;
        }
    }, [docId, dispatch]);

    const scheduleSave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { void doSave(); }, 800);
    }, [doSave]);

    // 监听 content 变化 → 标记 unsaved + debounce 保存
    // 用 ref 跳过首次（加载阶段 content 从 "" 变为实际值）
    const isFirstContentRef = useRef(true);
    useEffect(() => {
        if (isFirstContentRef.current) {
            // 第一次 content 变化是加载完成的赋值，跳过
            isFirstContentRef.current = false;
            return;
        }
        dispatch(setSaveStatus("unsaved"));
        scheduleSave();
    }, [content, dispatch, scheduleSave]);

    // 卸载兜底：若有 pending 保存，立即触发
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (dirtyAfterSaveRef.current || !inFlightRef.current) {
                void doSave();
            }
        };
    }, [doSave]);

    return { save: doSave, saveWith: doSave };
}
