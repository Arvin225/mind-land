import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";
import {
    Draft,
    DraftListItem,
    listDrafts,
    getDraft,
    createDraft,
    updateDraft,
    deleteDraft,
    restoreDraft,
    permanentDeleteDraft,
    emptyDraftTrash,
} from "@/apis/draft";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "";

export interface DraftState {
    list: DraftListItem[];
    current: Draft | null;
    currentId: number | null;
    saveStatus: SaveStatus;
    conflict: { currentVersion: number; serverContentMd: string } | null;
    loading: boolean;
}

const initialState: DraftState = {
    list: [],
    current: null,
    currentId: null,
    saveStatus: "",
    conflict: null,
    loading: false,
};

const draftStore = createSlice({
    name: "draft",
    initialState,
    reducers: {
        setList(state, action: PayloadAction<DraftListItem[]>) {
            state.list = action.payload;
        },
        setCurrent(state, action: PayloadAction<Draft | null>) {
            state.current = action.payload;
            state.currentId = action.payload?.id ?? null;
        },
        setCurrentContent(state, action: PayloadAction<string>) {
            if (state.current) {
                state.current.contentMd = action.payload;
            }
        },
        bumpVersion(state, action: PayloadAction<number>) {
            if (state.current) {
                state.current.version = action.payload;
            }
        },
        setSaveStatus(state, action: PayloadAction<SaveStatus>) {
            state.saveStatus = action.payload;
        },
        setConflict(state, action: PayloadAction<{ currentVersion: number; serverContentMd: string } | null>) {
            state.conflict = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        removeFromList(state, action: PayloadAction<number>) {
            state.list = state.list.filter((d) => d.id !== action.payload);
        },
        addToListHead(state, action: PayloadAction<DraftListItem>) {
            state.list.unshift(action.payload);
        },
        updateListItem(state, action: PayloadAction<{ id: number; title: string; updatedAt: string }>) {
            const item = state.list.find((d) => d.id === action.payload.id);
            if (item) {
                item.title = action.payload.title;
                item.updatedAt = action.payload.updatedAt;
            }
        },
    },
});

export const {
    setList,
    setCurrent,
    setCurrentContent,
    bumpVersion,
    setSaveStatus,
    setConflict,
    setLoading,
    removeFromList,
    addToListHead,
    updateListItem,
} = draftStore.actions;

export default draftStore.reducer;

// ── Thunks ──

export function fetchDraftListAction() {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await listDrafts();
            if (res.code === 0 && res.result) {
                dispatch(setList(res.result));
            }
        } catch (e) {
            console.error("draft: 获取列表失败", e);
        }
    };
}

export function fetchDraftAction(id: number) {
    return async (dispatch: AppDispatch) => {
        dispatch(setLoading(true));
        try {
            const res = await getDraft(id);
            if (res.code === 0 && res.result) {
                dispatch(setCurrent(res.result));
            }
        } catch (e) {
            console.error("draft: 获取草稿失败", e);
        } finally {
            dispatch(setLoading(false));
        }
    };
}

export function createDraftAction(onCreated?: (id: number) => void) {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await createDraft();
            if (res.code === 0 && res.result) {
                const d = res.result;
                dispatch(addToListHead({
                    id: d.id,
                    title: d.title,
                    preview: "",
                    updatedAt: d.updatedAt,
                }));
                onCreated?.(d.id);
            }
        } catch (e) {
            console.error("draft: 创建失败", e);
        }
    };
}

export function removeDraftAction(id: number, onRemoved?: () => void) {
    return async (dispatch: AppDispatch) => {
        try {
            const res = await deleteDraft(id);
            if (res.code === 0) {
                dispatch(removeFromList(id));
                // 同步清理 localStorage cursor memory（draft-cursor-memory spec 要求）
                try { localStorage.removeItem(`draft:cursor:${id}`); } catch {}
                onRemoved?.();
            }
        } catch (e) {
            console.error("draft: 删除失败", e);
        }
    };
}

export function restoreDraftAction(id: number) {
    return async (_dispatch: AppDispatch) => {
        try {
            await restoreDraft(id);
        } catch (e) {
            console.error("draft: 恢复失败", e);
        }
    };
}

export function permanentDeleteDraftAction(id: number) {
    return async (_dispatch: AppDispatch) => {
        try {
            await permanentDeleteDraft(id);
            // 清理 cursor memory
            try { localStorage.removeItem(`draft:cursor:${id}`); } catch {}
        } catch (e) {
            console.error("draft: 彻底删除失败", e);
        }
    };
}

export function emptyDraftTrashAction() {
    return async (_dispatch: AppDispatch) => {
        try {
            await emptyDraftTrash();
        } catch (e) {
            console.error("draft: 清空回收站失败", e);
        }
    };
}

// useAutoSave 会直接调 updateDraft API（避开 thunk），以便精细控制 version/conflict
// 这里仍导出 updateDraft 供需要的地方使用
export { updateDraft };
