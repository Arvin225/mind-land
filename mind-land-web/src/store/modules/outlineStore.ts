import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";
import {
  OutlineFolder,
  OutlineDocument,
  OutlineNode,
  OutlineDocumentVersion,
  getFolders,
  getDocuments,
  getDocument,
  createDocument,
  deleteDocument,
  saveNodes,
  getVersions,
  createVersion,
  restoreVersion,
  search,
} from "@/apis/outline";

export interface OutlineState {
  folders: OutlineFolder[];
  documents: OutlineDocument[];
  nodes: OutlineNode[];
  currentDocumentId: number | null;
  currentDocumentTitle: string;
  selectedNodeId: number | null;
  focusModeNodeId: number | null;
  currentView: "all" | "favorite" | "recent" | "trash";
  viewMode: "home" | "editor";
  isMindMapView: boolean;
  saveStatus: "" | "saved" | "saving" | "unsaved";
  searchQuery: string;
  searchResults: any[];
  versions: OutlineDocumentVersion[];
  docListTotal: number;
  loading: boolean;
  currentFolderId: number | null;
  breadcrumbPath: { id: number; name: string; type: "root" | "folder" | "document" }[];
  allDocuments: OutlineDocument[];
}

const initialState: OutlineState = {
  folders: [],
  documents: [],
  nodes: [],
  currentDocumentId: null,
  currentDocumentTitle: "",
  selectedNodeId: null,
  focusModeNodeId: null,
  currentView: "all",
  viewMode: "home",
  isMindMapView: false,
  saveStatus: "",
  searchQuery: "",
  searchResults: [],
  versions: [],
  docListTotal: 0,
  loading: false,
  currentFolderId: null,
  breadcrumbPath: [],
  allDocuments: [],
};

function collectDescendantIds(nodes: OutlineNode[], parentId: number): number[] {
  const ids: number[] = [];
  for (const n of nodes) {
    if (n.parentId === parentId) {
      ids.push(n.id, ...collectDescendantIds(nodes, n.id));
    }
  }
  return ids;
}

function reorderSiblings(nodes: OutlineNode[], parentId: number) {
  const siblings = nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  siblings.forEach((n, i) => {
    n.sortOrder = i;
  });
}

export function computeBreadcrumb(
  currentFolderId: number | null,
  currentDocumentId: number | null,
  currentView: string,
  viewMode: string,
  folders: OutlineFolder[],
  documents: OutlineDocument[]
): { id: number; name: string; type: "root" | "folder" | "document" }[] {
  if (currentView !== "all") {
    const labels: Record<string, string> = { favorite: "收藏", recent: "最近", trash: "回收站" };
    return [{ id: 0, name: labels[currentView] || currentView, type: "root" }];
  }
  const path: any[] = [{ id: 0, name: "我的文档", type: "root" }];
  if (currentFolderId) {
    const segments: any[] = [];
    let current = folders.find((f) => f.id === currentFolderId);
    while (current) {
      segments.unshift({ id: current.id, name: current.name, type: "folder" });
      current = folders.find((f) => f.id === current!.parentId);
    }
    path.push(...segments);
  }
  if (viewMode === "editor" && currentDocumentId) {
    const doc = documents.find((d) => d.id === currentDocumentId);
    if (doc) path.push({ id: doc.id, name: doc.title || "未命名", type: "document" });
  }
  return path;
}

const outlineStore = createSlice({
  name: "outline",
  initialState,
  reducers: {
    setFolders(state, action: PayloadAction<OutlineFolder[]>) {
      state.folders = action.payload;
    },
    setDocuments(state, action: PayloadAction<{ items: OutlineDocument[]; total: number }>) {
      state.documents = action.payload.items;
      state.docListTotal = action.payload.total;
    },
    setNodes(state, action: PayloadAction<OutlineNode[]>) {
      state.nodes = action.payload;
    },
    setCurrentDocumentId(state, action: PayloadAction<number | null>) {
      state.currentDocumentId = action.payload;
    },
    setSelectedNode(state, action: PayloadAction<number | null>) {
      state.selectedNodeId = action.payload;
    },
    setFocusMode(state, action: PayloadAction<number | null>) {
      state.focusModeNodeId = action.payload;
    },
    setCurrentView(state, action: PayloadAction<OutlineState["currentView"]>) {
      state.currentView = action.payload;
    },
    setViewMode(state, action: PayloadAction<OutlineState["viewMode"]>) {
      state.viewMode = action.payload;
    },
    setMindMapView(state, action: PayloadAction<boolean>) {
      state.isMindMapView = action.payload;
    },
    setSaveStatus(state, action: PayloadAction<OutlineState["saveStatus"]>) {
      state.saveStatus = action.payload;
    },
    setDocumentTitle(state, action: PayloadAction<string>) {
      state.currentDocumentTitle = action.payload;
      state.saveStatus = "unsaved";
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSearchResults(state, action: PayloadAction<any[]>) {
      state.searchResults = action.payload;
    },
    setVersions(state, action: PayloadAction<OutlineDocumentVersion[]>) {
      state.versions = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    addNode(state, action: PayloadAction<number>) {
      const targetId = action.payload;
      const target = state.nodes.find((n) => n.id === targetId);
      if (!target) return;

      const maxId = state.nodes.reduce((max, n) => Math.max(max, n.id), 0);
      const newNode: OutlineNode = {
        id: maxId + 1,
        documentId: state.currentDocumentId || target.documentId,
        content: "",
        parentId: target.parentId,
        sortOrder: target.sortOrder + 1,
        isCollapsed: false,
        note: "",
        del: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.nodes.forEach((n) => {
        if (n.parentId === target.parentId && n.sortOrder > target.sortOrder) {
          n.sortOrder += 1;
        }
      });

      state.nodes.push(newNode);
      state.selectedNodeId = newNode.id;
      state.saveStatus = "unsaved";
    },
    insertNodeAbove(state, action: PayloadAction<number>) {
      const targetId = action.payload;
      const target = state.nodes.find((n) => n.id === targetId);
      if (!target) return;

      const maxId = state.nodes.reduce((max, n) => Math.max(max, n.id), 0);
      const newNode: OutlineNode = {
        id: maxId + 1,
        documentId: state.currentDocumentId || target.documentId,
        content: "",
        parentId: target.parentId,
        sortOrder: target.sortOrder,
        isCollapsed: false,
        note: "",
        del: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.nodes.forEach((n) => {
        if (n.parentId === target.parentId && n.sortOrder >= target.sortOrder) {
          n.sortOrder += 1;
        }
      });

      state.nodes.push(newNode);
      state.selectedNodeId = newNode.id;
      state.saveStatus = "unsaved";
    },
    addChildNode(state, action: PayloadAction<number>) {
      const parentId = action.payload;
      const parent = state.nodes.find((n) => n.id === parentId);
      if (!parent) return;

      const children = state.nodes.filter((n) => n.parentId === parentId);
      const maxOrder = children.reduce((max, n) => Math.max(max, n.sortOrder), -1);

      const maxId = state.nodes.reduce((max, n) => Math.max(max, n.id), 0);
      const newNode: OutlineNode = {
        id: maxId + 1,
        documentId: state.currentDocumentId || parent.documentId,
        content: "",
        parentId: parentId,
        sortOrder: maxOrder + 1,
        isCollapsed: false,
        note: "",
        del: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.nodes.push(newNode);
      state.selectedNodeId = newNode.id;
      state.saveStatus = "unsaved";
    },
    indentNode(state, action: PayloadAction<number>) {
      const nodeId = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const prevSibling = state.nodes
        .filter((n) => n.parentId === node.parentId && n.sortOrder < node.sortOrder)
        .sort((a, b) => b.sortOrder - a.sortOrder)[0];

      if (!prevSibling) return;

      node.parentId = prevSibling.id;
      reorderSiblings(state.nodes, node.parentId);
      state.saveStatus = "unsaved";
    },
    outdentNode(state, action: PayloadAction<number>) {
      const nodeId = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const parent = state.nodes.find((n) => n.id === node.parentId);
      if (!parent) return;

      node.parentId = parent.parentId;
      node.sortOrder = parent.sortOrder + 1;

      state.nodes.forEach((n) => {
        if (n.parentId === parent.parentId && n.sortOrder >= node.sortOrder && n.id !== node.id) {
          n.sortOrder += 1;
        }
      });

      reorderSiblings(state.nodes, parent.parentId);
      reorderSiblings(state.nodes, parent.id);
      state.saveStatus = "unsaved";
    },
    deleteNode(state, action: PayloadAction<number>) {
      const nodeId = action.payload;
      const idsToDelete = [nodeId, ...collectDescendantIds(state.nodes, nodeId)];
      const deletedNode = state.nodes.find((n) => n.id === nodeId);

      state.nodes = state.nodes.filter((n) => !idsToDelete.includes(n.id));

      if (deletedNode) {
        reorderSiblings(state.nodes, deletedNode.parentId);
      }

      if (state.selectedNodeId && idsToDelete.includes(state.selectedNodeId)) {
        state.selectedNodeId = null;
      }
      if (state.focusModeNodeId && idsToDelete.includes(state.focusModeNodeId)) {
        state.focusModeNodeId = null;
      }

      state.saveStatus = "unsaved";
    },
    moveNodeUp(state, action: PayloadAction<number>) {
      const nodeId = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const prevSibling = state.nodes
        .filter((n) => n.parentId === node.parentId && n.sortOrder < node.sortOrder)
        .sort((a, b) => b.sortOrder - a.sortOrder)[0];

      if (!prevSibling) return;

      const temp = node.sortOrder;
      node.sortOrder = prevSibling.sortOrder;
      prevSibling.sortOrder = temp;
      state.saveStatus = "unsaved";
    },
    moveNodeDown(state, action: PayloadAction<number>) {
      const nodeId = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const nextSibling = state.nodes
        .filter((n) => n.parentId === node.parentId && n.sortOrder > node.sortOrder)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];

      if (!nextSibling) return;

      const temp = node.sortOrder;
      node.sortOrder = nextSibling.sortOrder;
      nextSibling.sortOrder = temp;
      state.saveStatus = "unsaved";
    },
    updateNodeContent(state, action: PayloadAction<{ id: number; content: string }>) {
      const node = state.nodes.find((n) => n.id === action.payload.id);
      if (node) {
        node.content = action.payload.content;
        state.saveStatus = "unsaved";
      }
    },
    collapseNode(state, action: PayloadAction<number>) {
      const node = state.nodes.find((n) => n.id === action.payload);
      if (node) node.isCollapsed = true;
    },
    expandNode(state, action: PayloadAction<number>) {
      const node = state.nodes.find((n) => n.id === action.payload);
      if (node) node.isCollapsed = false;
    },
    openDocumentReducer(state, action: PayloadAction<{ documentId: number; nodes: OutlineNode[]; title?: string }>) {
      state.currentDocumentId = action.payload.documentId;
      state.currentDocumentTitle = action.payload.title || "";
      state.nodes = action.payload.nodes;
      // Auto-create first node when outline is empty
      if (state.nodes.length === 0) {
        const baseId = Date.now();
        state.nodes = [{
          id: baseId,
          documentId: action.payload.documentId,
          content: "",
          parentId: 0,
          sortOrder: 0,
          isCollapsed: false,
          note: "",
          del: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }
      state.selectedNodeId = null;
      state.focusModeNodeId = null;
      state.viewMode = "editor";
      state.saveStatus = "saved";
      state.currentFolderId = null;
    },
    closeDocument(state) {
      state.currentDocumentId = null;
      state.nodes = [];
      state.selectedNodeId = null;
      state.focusModeNodeId = null;
      state.viewMode = "home";
      state.saveStatus = "";
    },
    setCurrentFolderId(state, action: PayloadAction<number | null>) {
      state.currentFolderId = action.payload;
    },
    setBreadcrumbPath(state, action: PayloadAction<{ id: number; name: string; type: "root" | "folder" | "document" }[]>) {
      state.breadcrumbPath = action.payload;
    },
    setAllDocuments(state, action: PayloadAction<{ items: OutlineDocument[]; total: number }>) {
      state.allDocuments = action.payload.items;
    },
    moveNode(state, action: PayloadAction<{ nodeId: number; targetNodeId: number; position: "above" | "below" | "child" }>) {
      const { nodeId, targetNodeId, position } = action.payload;
      const node = state.nodes.find((n) => n.id === nodeId);
      const target = state.nodes.find((n) => n.id === targetNodeId);
      if (!node || !target) return;

      let newParentId: number;
      let newSortOrder: number;

      if (position === "child") {
        newParentId = target.id;
        const children = state.nodes.filter((n) => n.parentId === target.id);
        newSortOrder = children.length > 0 ? Math.max(...children.map((n) => n.sortOrder)) + 1 : 0;
      } else {
        newParentId = target.parentId;
        newSortOrder = position === "above" ? target.sortOrder : target.sortOrder + 1;
      }

      const oldParentId = node.parentId;
      const oldSortOrder = node.sortOrder;

      if (oldParentId === newParentId && oldSortOrder < newSortOrder) {
        newSortOrder -= 1;
      }

      node.parentId = -1;

      for (const n of state.nodes) {
        if (n.id !== nodeId && n.parentId === newParentId && n.sortOrder >= newSortOrder) {
          n.sortOrder += 1;
        }
      }

      node.parentId = newParentId;
      node.sortOrder = newSortOrder;

      reorderSiblings(state.nodes, oldParentId);
      state.saveStatus = "unsaved";
    },
  },
});

export const {
  setFolders,
  setDocuments,
  setCurrentFolderId,
  setBreadcrumbPath,
  setAllDocuments,
  setNodes,
  setCurrentDocumentId,
  setSelectedNode,
  setFocusMode,
  setCurrentView,
  setViewMode,
  setMindMapView,
  setSaveStatus,
  setSearchQuery,
  setSearchResults,
  setDocumentTitle,
  insertNodeAbove,
  addChildNode,
  setVersions,
  setLoading,
  addNode,
  indentNode,
  outdentNode,
  deleteNode,
  moveNodeUp,
  moveNodeDown,
  updateNodeContent,
  collapseNode,
  expandNode,
  openDocumentReducer,
  closeDocument,
  moveNode,
} = outlineStore.actions;

export function fetchFoldersAction(trash?: boolean) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await getFolders(trash);
      if (res.code === 0 && res.result) {
        dispatch(setFolders(res.result));
      }
    } catch (e) {
      console.error("outline: 获取文件夹列表失败", e);
    }
  };
}

export function fetchDocumentsAction(params?: {
  folderId?: number;
  favorite?: boolean;
  recent?: boolean;
  trash?: boolean;
  page?: number;
  size?: number;
}) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const res = await getDocuments(params);
      if (res.code === 0 && res.result) {
        dispatch(setDocuments(res.result));
      }
    } catch (e) {
      console.error("outline: 获取文档列表失败", e);
    } finally {
      dispatch(setLoading(false));
    }
  };
}

export function openDocumentAction(id: number) {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const res = await getDocument(id, true);
      if (res.code === 0 && res.result) {
        const data = res.result as { document: OutlineDocument; nodes: OutlineNode[] };
        dispatch(openDocumentReducer({ documentId: data.document.id, nodes: data.nodes, title: data.document.title }));
      }
    } catch (e) {
      console.error("outline: 打开文档失败", e);
    } finally {
      dispatch(setLoading(false));
    }
  };
}

export function createDocumentAction(title?: string, folderId?: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await createDocument({ title, folderId });
      if (res.code === 0 && res.result) {
        dispatch(fetchDocumentsAction());
        dispatch(fetchAllDocumentsAction());
        // Auto-open the new document
        dispatch(openDocumentAction(res.result.id));
      }
    } catch (e) {
      console.error("outline: 创建文档失败", e);
    }
  };
}

export function deleteDocumentAction(id: number) {
  return async (dispatch: AppDispatch, getState: () => any) => {
    try {
      const res = await deleteDocument(id);
      if (res.code === 0) {
        dispatch(fetchDocumentsAction());
        dispatch(fetchAllDocumentsAction());
        if (getState().outline.currentDocumentId === id) {
          dispatch(closeDocument());
        }
      }
    } catch (e) {
      console.error("outline: 删除文档失败", e);
    }
  };
}

export function saveNodesAction(docId: number) {
  return async (dispatch: AppDispatch, getState: () => any) => {
    dispatch(setSaveStatus("saving"));
    try {
      const { nodes } = getState().outline;
      const res = await saveNodes(docId, nodes);
      if (res.code === 0) {
        dispatch(setSaveStatus("saved"));
      } else {
        dispatch(setSaveStatus("unsaved"));
      }
    } catch (e) {
      console.error("outline: 保存节点失败", e);
      dispatch(setSaveStatus("unsaved"));
    }
  };
}

export function fetchVersionsAction(docId: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await getVersions(docId);
      if (res.code === 0 && res.result) {
        dispatch(setVersions(res.result));
      }
    } catch (e) {
      console.error("outline: 获取版本列表失败", e);
    }
  };
}

export function createVersionAction(docId: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await createVersion(docId);
      if (res.code === 0) {
        dispatch(fetchVersionsAction(docId));
        dispatch(setSaveStatus("saved"));
      }
    } catch (e) {
      console.error("outline: 创建版本失败", e);
    }
  };
}

export function restoreVersionAction(versionId: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await restoreVersion(versionId);
      if (res.code === 0) {
        dispatch(setSaveStatus("unsaved"));
      }
    } catch (e) {
      console.error("outline: 恢复版本失败", e);
    }
  };
}

export function searchNodesAction(query: string, scope?: string) {
  return async (dispatch: AppDispatch) => {
    dispatch(setSearchQuery(query));
    try {
      const res = await search(query, scope);
      if (res.code === 0 && res.result) {
        dispatch(setSearchResults(res.result.items));
      }
    } catch (e) {
      console.error("outline: 搜索失败", e);
    }
  };
}

export function fetchAllDocumentsAction() {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await getDocuments({ page: 1, size: 9999 });
      if (res.code === 0 && res.result) {
        dispatch(setAllDocuments(res.result));
      }
    } catch (e) {
      console.error("outline: 获取全部文档失败", e);
    }
  };
}

export default outlineStore.reducer;
