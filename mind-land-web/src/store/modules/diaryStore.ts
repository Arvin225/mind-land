import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";
import {
  DiaryEntry,
  getEntriesAPI,
  getEntryAPI,
  createEntryAPI,
  updateEntryAPI,
  deleteEntryAPI,
  getTrashEntriesAPI,
  restoreEntryAPI,
  permanentDeleteAPI,
  emptyTrashAPI,
} from "@/apis/diary";

export interface DiaryState {
  entries: DiaryEntry[];
  loading: boolean;
  selectedId: number | null;
  selectedEntry: DiaryEntry | null;
  editMode: boolean;
  page: number;
  total: number;
  hasMore: boolean;
  trashMode: boolean;
  trashEntries: DiaryEntry[];
  trashPage: number;
  trashTotal: number;
  trashHasMore: boolean;
}

const initialState: DiaryState = {
  entries: [],
  loading: true,
  selectedId: null,
  selectedEntry: null,
  editMode: false,
  page: 1,
  total: 0,
  hasMore: true,
  trashMode: false,
  trashEntries: [],
  trashPage: 1,
  trashTotal: 0,
  trashHasMore: true,
};

const diaryStore = createSlice({
  name: "diary",
  initialState,
  reducers: {
    setEntries(state, action: PayloadAction<DiaryEntry[]>) {
      state.entries = action.payload;
    },
    appendEntries(state, action: PayloadAction<DiaryEntry[]>) {
      state.entries = [...state.entries, ...action.payload];
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSelectedId(state, action: PayloadAction<number | null>) {
      state.selectedId = action.payload;
      state.editMode = false;
    },
    setSelectedEntry(state, action: PayloadAction<DiaryEntry | null>) {
      state.selectedEntry = action.payload;
    },
    setEditMode(state, action: PayloadAction<boolean>) {
      state.editMode = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setTotal(state, action: PayloadAction<number>) {
      state.total = action.payload;
      state.hasMore = state.entries.length < action.payload;
    },
    removeEntry(state, action: PayloadAction<number>) {
      state.entries = state.entries.filter((e) => e.id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = null;
        state.selectedEntry = null;
        state.editMode = false;
      }
    },
    prependEntry(state, action: PayloadAction<DiaryEntry>) {
      state.entries = [action.payload, ...state.entries];
    },
    updateEntryInList(state, action: PayloadAction<DiaryEntry>) {
      const idx = state.entries.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) {
        state.entries[idx] = action.payload;
      }
      if (state.selectedId === action.payload.id) {
        state.selectedEntry = action.payload;
      }
    },
    setTrashEntries(state, action: PayloadAction<DiaryEntry[]>) {
      state.trashEntries = action.payload;
    },
    appendTrashEntries(state, action: PayloadAction<DiaryEntry[]>) {
      state.trashEntries = [...state.trashEntries, ...action.payload];
    },
    setTrashPage(state, action: PayloadAction<number>) {
      state.trashPage = action.payload;
      state.trashHasMore = state.trashEntries.length < state.trashTotal;
    },
    setTrashTotal(state, action: PayloadAction<number>) {
      state.trashTotal = action.payload;
      state.trashHasMore = state.trashEntries.length < action.payload;
    },
    removeTrashEntry(state, action: PayloadAction<number>) {
      state.trashEntries = state.trashEntries.filter((e) => e.id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = null;
        state.selectedEntry = null;
      }
    },
    setTrashMode(state, action: PayloadAction<boolean>) {
      state.trashMode = action.payload;
      if (action.payload) {
        state.selectedId = null;
        state.selectedEntry = null;
        state.editMode = false;
      }
    },
    clearTrash(state) {
      state.trashEntries = [];
      state.trashPage = 1;
      state.trashTotal = 0;
      state.trashHasMore = true;
      state.selectedId = null;
      state.selectedEntry = null;
    },
  },
});

export const {
  setEntries,
  appendEntries,
  setLoading,
  setSelectedId,
  setSelectedEntry,
  setEditMode,
  setPage,
  setTotal,
  removeEntry,
  prependEntry,
  updateEntryInList,
  setTrashEntries,
  appendTrashEntries,
  setTrashPage,
  setTrashTotal,
  removeTrashEntry,
  setTrashMode,
  clearTrash,
} = diaryStore.actions;

export function fetchEntries() {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const res = await getEntriesAPI(1, 20);
      if (res.code === 0 && res.result) {
        dispatch(setEntries(res.result.entries));
        dispatch(setTotal(res.result.total));
        dispatch(setPage(1));
      }
    } catch (e) {
      console.error("获取日记列表失败", e);
    } finally {
      dispatch(setLoading(false));
    }
  };
}

export function fetchMoreEntries() {
  return async (dispatch: AppDispatch, getState: () => any) => {
    const { page } = getState().diary;
    const nextPage = page + 1;
    try {
      const res = await getEntriesAPI(nextPage, 20);
      if (res.code === 0 && res.result) {
        dispatch(appendEntries(res.result.entries));
        dispatch(setTotal(res.result.total));
        dispatch(setPage(nextPage));
      }
    } catch (e) {
      console.error("加载更多日记失败", e);
    }
  };
}

export function selectEntry(id: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await getEntryAPI(id);
      if (res.code === 0 && res.result) {
        dispatch(setSelectedId(id));
        dispatch(setSelectedEntry(res.result));
      }
    } catch (e) {
      console.error("获取日记详情失败", e);
    }
  };
}

export function createEntry(content: string) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await createEntryAPI(content);
      if (res.code === 0 && res.result) {
        dispatch(prependEntry(res.result));
        dispatch(setSelectedId(res.result.id));
        dispatch(setSelectedEntry(res.result));
        dispatch(setEditMode(true));
      }
    } catch (e) {
      console.error("创建日记失败", e);
    }
  };
}

export function updateEntry(id: number, content: string) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await updateEntryAPI(id, content);
      if (res.code === 0 && res.result) {
        dispatch(updateEntryInList(res.result));
      }
    } catch (e) {
      console.error("更新日记失败", e);
    }
  };
}

export function deleteEntry(id: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await deleteEntryAPI(id);
      if (res.code === 0) {
        dispatch(removeEntry(id));
      }
    } catch (e) {
      console.error("删除日记失败", e);
    }
  };
}

export function fetchTrashEntries() {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const res = await getTrashEntriesAPI(1, 20);
      if (res.code === 0 && res.result) {
        dispatch(setTrashEntries(res.result.entries));
        dispatch(setTrashTotal(res.result.total));
        dispatch(setTrashPage(1));
      }
    } catch (e) {
      console.error("获取回收站列表失败", e);
    } finally {
      dispatch(setLoading(false));
    }
  };
}

export function fetchMoreTrashEntries() {
  return async (dispatch: AppDispatch, getState: () => any) => {
    const { trashPage } = getState().diary;
    const nextPage = trashPage + 1;
    try {
      const res = await getTrashEntriesAPI(nextPage, 20);
      if (res.code === 0 && res.result) {
        dispatch(appendTrashEntries(res.result.entries));
        dispatch(setTrashTotal(res.result.total));
        dispatch(setTrashPage(nextPage));
      }
    } catch (e) {
      console.error("加载更多回收站条目失败", e);
    }
  };
}

export function restoreEntry(id: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await restoreEntryAPI(id);
      if (res.code === 0) {
        dispatch(removeTrashEntry(id));
        dispatch(fetchEntries());
      }
    } catch (e) {
      console.error("恢复日记失败", e);
    }
  };
}

export function permanentDeleteEntry(id: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await permanentDeleteAPI(id);
      if (res.code === 0) {
        dispatch(removeTrashEntry(id));
      }
    } catch (e) {
      console.error("永久删除失败", e);
    }
  };
}

export function emptyTrash() {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await emptyTrashAPI();
      if (res.code === 0) {
        dispatch(clearTrash());
      }
    } catch (e) {
      console.error("清空回收站失败", e);
    }
  };
}

export default diaryStore.reducer;
