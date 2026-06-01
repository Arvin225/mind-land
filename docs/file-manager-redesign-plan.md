# Outline 文件管理系统重设计 — 实现计划

## 1. 设计目标摘要

| 问题 | 解决方案 |
|---|---|
| 左侧导航与文件夹树分离 | 统一为一个 `FolderTreePanel`，`我的文档` 为根节点 |
| 进入编辑器后左侧消失 | `viewMode === "editor"` 时不再切换整页，只切换右侧面板 |
| 面包屑只在 focus mode 出现 | 新增 `BreadcrumbBar`，页面顶部始终可见 |
| 全局搜索按钮多余 | 移除 `DocumentHome` 中的全局搜索入口按钮 |
| 文件夹下不显示文档 | `FolderTreeItem` 支持渲染子文档节点 |

---

## 2. 需新增的组件

### 2.1 `BreadcrumbBar.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/BreadcrumbBar.tsx`

**功能：**
- 位于页面顶部，横跨全宽
- 根据 `currentView`、`currentFolderId`、`currentDocumentId` 动态计算路径
- 每段可点击跳转（调用对应的导航 action）
- 显示规则：
  - `currentView === "all"` + `currentFolderId === null` → `我的文档`（不可点击）
  - `currentView === "all"` + `currentFolderId !== null` → `我的文档 > 文件夹A > 文件夹B`
  - `currentView === "favorite"` → `收藏`
  - `currentView === "recent"` → `最近`
  - `currentView === "trash"` → `回收站`
  - `viewMode === "editor"` → `我的文档 > 文件夹A > 文档标题`

**Props 接口:**
```typescript
// 无外部 props，全部从 Redux 读取
interface BreadcrumbBarProps {} // (empty — reads from Redux)
```

**样式：**
- `bg-surface`, `border-b border-border`, `px-4 py-1.5`
- 每个 segment 为 `<button>`，样式：`rounded-lg hover:bg-hover transition-colors`
- 分隔符：`ChevronRight` 图标
- 文本：`text-xs text-text-muted`，hover 时 `text-text-primary`
- 当前段 bold/高亮

---
### 2.2 `ContentToolbar.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/ContentToolbar.tsx`

**功能：**
- 右侧内容区的顶部工具栏
- 显示 `新建文档` 和 `新建文件夹` 按钮
- 仅在 `viewMode === "home"` 且非特殊视图（如回收站）时显示创建按钮

**Props 接口:**
```typescript
interface ContentToolbarProps {
  currentFolderId: number | null;
  currentView: string;
  onCreateDocument: (folderId?: number | null) => void;
  onCreateFolder: (folderId?: number | null) => void;
}
```

**样式：**
- `flex items-center justify-between px-6 py-2 border-b border-border`
- 按钮：`rounded-lg`，新建文档 `bg-accent/10 text-accent hover:bg-accent/20`，新建文件夹 `text-text-muted hover:bg-hover`

---
### 2.3 `ContentList.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/ContentList.tsx`

**功能：**
- 显示当前文件夹的子文件夹 + 文档
- 文件夹卡片在上，文档卡片在下
- 点击文件夹 → 进入该文件夹（dispatch `setCurrentFolderId`）
- 点击文档 → 打开编辑器
- 保留右键菜单
- 保留局部搜索

**Props 接口:**
```typescript
interface ContentListProps {
  currentFolderId: number | null;
  currentView: string;
  onFolderClick: (folderId: number) => void;
}
```

**从 Redux 读取:** `documents`, `folders`, `loading`, `docListTotal`

**显示逻辑：**
- `currentView === "all"` → 显示 `folders.filter(f => f.parentId === currentFolderId)` + `documents`（API 已按 folderId 过滤）
- 特殊视图 (收藏/最近/回收站) → 只显示文档列表（现有行为）
- 保留 `DocumentCard` 组件用于文档项
- 新增文件夹卡片：`FolderCard`（内联小型组件）

**样式：**
- 继承 `DocumentList` 的现有布局结构
- 文件夹卡片：卡片式展示，`rounded-lg hover:bg-hover cursor-pointer`，带 `Folder` 图标

---
## 3. 需修改的现有组件

### 3.1 `Note/index.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/index.tsx`

**变更摘要：**
- 不再根据 `viewMode` 条件渲染整页，改为始终渲染双栏布局
- 布局结构变为：

```
<div className="h-full flex flex-col">          ← 新增顶层包裹
  <BreadcrumbBar />                              ← 新增，顶部常驻
  <div className="flex-1 flex min-h-0">          ← 双栏布局
    <FolderTreePanel />                          ← 从 DocumentHome 提升到此处
    <div className="flex-1 flex flex-col min-w-0">
      {viewMode === "editor" ? <OutlineEditor /> : <DocumentHome />}
    </div>
  </div>
</div>
```

- 移除 `DocumentHome` 的直接渲染（改为条件渲染在右侧面板内）
- 引入 `BreadcrumbBar` 和 `FolderTreePanel`（替换 `FolderSidebar`）

**新代码:**
```tsx
import BreadcrumbBar from "./BreadcrumbBar";
import FolderTreePanel from "./FolderTreePanel";

// 始终渲染双栏布局
return (
  <div className="h-full flex flex-col">
    <BreadcrumbBar />
    <div className="flex-1 flex min-h-0">
      <FolderTreePanel />
      <div className="flex-1 flex flex-col min-w-0">
        {viewMode === "editor" ? <OutlineEditor /> : <DocumentHome />}
      </div>
    </div>
  </div>
);
```

### 3.2 `DocumentHome.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/DocumentHome.tsx`

**变更摘要：**
- 移除 `FolderSidebar` 的渲染（左侧面板已提升到 `Note/index.tsx`）
- 移除顶部全局搜索按钮（含 `Search` 图标按钮和 `GlobalSearchPanel` 模态）
- 移除 `showGlobalSearch` 状态
- 移除 `GlobalSearchPanel` 和 `Search` 的 import
- 重组为：`ContentToolbar` + `ContentList` 结构
- 新增 `currentFolderId` 和 `currentView` 感知：
  - 进文件夹时显示该文件夹的子内容（文件夹 + 文档）
  - 特殊视图时显示对应文档列表
- 保留 `CreateDialog`（新建文档/文件夹对话框）

**去除的 import:**
```tsx
// 删除
import GlobalSearchPanel from "./GlobalSearchPanel";
import { Search } from "lucide-react";
```

**新增的 import:**
```tsx
import ContentToolbar from "./ContentToolbar";
import ContentList from "./ContentList";
```

**Props 不需要改变**（通过 Redux 读取 `currentFolderId`）

**修改后的 useEffect 逻辑:**
```tsx
useEffect(() => {
  dispatch(fetchFoldersAction());
}, [dispatch]);

useEffect(() => {
  const state = (store.getState() as any).outline;
  const { currentFolderId, currentView } = state;
  const params: any = { page: 1, size: 50 };
  if (currentView === "favorite") params.favorite = true;
  else if (currentView === "recent") params.recent = true;
  else if (currentView === "trash") params.trash = true;
  else if (currentFolderId !== null && currentFolderId !== undefined) {
    params.folderId = currentFolderId;
  }
  dispatch(fetchDocumentsAction(params));
}, [dispatch, currentView, currentFolderId]);
```

### 3.3 `FolderSidebar.tsx` → 重构为 `FolderTreePanel.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/FolderTreePanel.tsx`（新文件，`FolderSidebar.tsx` 废弃）

**变更摘要：**
- 添加「我的文档」根节点，始终存在、不可删除/重命名
- 底部保留收藏、最近、回收站导航
- 集成 `selectedFolderId` 选中态（从 Redux `currentFolderId` 读取）
- 传递 `allDocuments` 给 `FolderTreeItem` 以显示文件夹内的文档
- 点击文件夹时 dispatch `setCurrentFolderId(folder.id)`
- 点击文档时 dispatch `openDocumentAction(doc.id)`
- 移除 `onViewChange` prop（内部直接 dispatch）
- `onCreateFolder` 改为内部管理

**新 Props 接口:**
```typescript
// 简化 — 无需外部 props
interface FolderTreePanelProps {}
```

**核心变更：**
1. 从 Redux 读取 `currentFolderId`, `currentView`, `currentDocumentId`
2. 顶部「我的文档」按钮：
   ```tsx
   <button
     className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm ${
       currentFolderId === null && currentView === "all"
         ? "bg-accent/10 text-accent"
         : "text-text-secondary hover:bg-hover hover:text-text-primary"
     }`}
     onClick={() => {
       dispatch(setCurrentView("all"));
       dispatch(setCurrentFolderId(null));
       dispatch(fetchDocumentsAction({ folderId: 0 }));
     }}
   >
     <FileText className="w-4 h-4" /> 我的文档
   </button>
   ```
3. 文件夹树传递 `allDocuments` 过滤出当前文件夹下的文档
4. 底部 navItems 操作：点击时 dispatch `setCurrentView` + `setCurrentFolderId(null)`

### 3.4 `FolderTreeItem.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/FolderTreeItem.tsx`

**变更摘要：**
- 新增 `documents` prop（当前文件夹下的文档列表）
- 新增 `currentFolderId`、`currentDocumentId` prop（用于选中态高亮）
- 文件夹下方渲染文档子节点（`FileText` 图标，缩进一级）
- 文档节点可点击打开编辑器

**新 Props 接口:**
```typescript
interface FolderTreeItemProps {
  folder: OutlineFolder;
  depth: number;
  allFolders: OutlineFolder[];
  expandedFolders: Set<number>;
  renamingId: number | null;
  renameValue: string;
  // 新增 ↓
  documents: OutlineDocument[];            // 此文件夹下的文档
  currentFolderId: number | null;          // 当前选中文件夹
  currentDocumentId: number | null;        // 当前打开文档
  // 新增 ↓
  onSelectDocument: (doc: OutlineDocument) => void;
  // 保持不变 ↓
  onToggleExpand: (id: number) => void;
  onSelectFolder: (folder: OutlineFolder) => void;
  onContextMenu: (e: React.MouseEvent, folder: OutlineFolder) => void;
  onRenameChange: (value: string) => void;
  onSubmitRename: (folder: OutlineFolder) => void;
}
```

**新增渲染 — 文档子节点:**
```tsx
{isExpanded && (
  <div>
    {/* 子文件夹 */}
    {children.map(child => <FolderTreeItem ... />)}
    {/* 此文件夹下的文档 */}
    {documents.map(doc => (
      <div
        key={doc.id}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-hover transition-colors cursor-pointer
          ${currentDocumentId === doc.id ? "bg-accent/10 text-accent" : "text-text-secondary"}
        `}
        style={{ paddingLeft: (depth + 1) * 16 + 28 }}
        onClick={() => onSelectDocument(doc)}
      >
        <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span className="text-sm truncate">{doc.title || "未命名"}</span>
      </div>
    ))}
  </div>
)}
```

### 3.5 `OutlineEditor.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/OutlineEditor.tsx`

**变更摘要：**
- 移除全屏假设 — 外层容器改为 `flex-1` 而非 `h-full`
- 保留工具栏（但移除返回按钮的逻辑？实际上 `OutlineEditorToolbar` 自己管理返回按钮）
- 整体功能不变（大纲编辑、脑图、搜索、版本历史均保留）
- 面包屑 `BreadcrumbNav`（focus mode）保留——它显示文档内节点路径，不同于顶部的 `BreadcrumbBar`

**变更点：**
```tsx
// Before:
<div className="h-full flex flex-col overflow-hidden">

// After: 不需要 h-full（由父容器 flex-1 控制）
<div className="flex-1 flex flex-col overflow-hidden min-h-0">
```

### 3.6 `OutlineEditorToolbar.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/OutlineEditorToolbar.tsx`

**变更摘要：**
- **移除返回按钮**（`ArrowLeft` 按钮 + `handleBack` 逻辑）——面包屑已提供导航
- 返回按钮的相关代码删除：
  ```tsx
  // 删除
  const handleBack = useCallback(() => {
    dispatch(closeDocument());
  }, [dispatch]);
  // 删除 <button> with ArrowLeft
  ```
- 保留：保存状态指示点、文档标题编辑、大脑图切换、更多菜单

### 3.7 `BreadcrumbNav.tsx`（现有，保留不变）
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/BreadcrumbNav.tsx`

无需修改。此组件显示大纲编辑器内 focus mode 的节点路径（文档内导航），与新增的 `BreadcrumbBar`（文件夹路径导航）职责不同。

### 3.8 `DocumentCard.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/DocumentCard.tsx`

**变更摘要：** 无需结构性修改。保留现有所有功能（点击打开、右键菜单、收藏切换等）。

### 3.9 `CreateDialog.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/CreateDialog.tsx`

**变更摘要：**
- 新增 `defaultFolderId` prop（新建文档/文件夹时自动填入当前文件夹）
- 当 `currentFolderId !== null` 时，预设 `folderId` 为 `currentFolderId`

**新 Props:**
```typescript
interface CreateDialogProps {
  onClose: () => void;
  defaultFolderId?: number | null;  // 新增
}
```

### 3.10 `GlobalSearchPanel.tsx`
**路径:** `/root/mind-land/mind-land-web/src/pages/Note/GlobalSearchPanel.tsx`

**变更摘要：** 不被直接删除（可从快捷键 `Ctrl+F` 在编辑器内触发），但移除 `DocumentHome` 中的入口按钮。文件保留，后续可在编辑器工具栏或其他位置添加触发入口。

---

## 4. Redux State 变更

### 4.1 新增字段

```typescript
// 在 OutlineState 接口中新增：
currentFolderId: number | null;     // 当前选中的文件夹 ID，null = 根「我的文档」
breadcrumbPath: { id: number; name: string }[];  // 计算出的面包屑路径
allDocuments: OutlineDocument[];    // 所有文档（供左侧树展示用，不被 currentView 过滤）
```

### 4.2 initial state 新增

```typescript
currentFolderId: null,
breadcrumbPath: [],
allDocuments: [],
```

### 4.3 新增 Reducers

```typescript
setCurrentFolderId(state, action: PayloadAction<number | null>) {
  state.currentFolderId = action.payload;
},
setBreadcrumbPath(state, action: PayloadAction<{ id: number; name: string }[]>) {
  state.breadcrumbPath = action.payload;
},
setAllDocuments(state, action: PayloadAction<{ items: OutlineDocument[]; total: number }>) {
  state.allDocuments = action.payload.items;
},
```

### 4.4 修改现有 Reducers

#### `openDocumentReducer` — 不再切换 `viewMode` 逻辑？
**保持 `viewMode = "editor"` 不变**，因为 `Note/index.tsx` 用 `viewMode` 决定右侧面板内容。

#### `closeDocument` — 清理 `currentDocumentId` 但保留 `currentFolderId`
```typescript
closeDocument(state) {
  state.currentDocumentId = null;
  state.nodes = [];
  state.selectedNodeId = null;
  state.focusModeNodeId = null;
  state.viewMode = "home";
  state.saveStatus = "";
  // 不重置 currentFolderId — 保持用户在文件夹内
}
```

### 4.5 新增 Thunk

```typescript
// 获取所有文档（供左侧树展示）
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
```

### 4.6 新增面包屑计算 Helper

```typescript
// 放在 outlineStore.ts 内或 BreadcrumbBar 组件内
export function computeBreadcrumb(
  currentFolderId: number | null,
  currentDocumentId: number | null,
  currentView: string,
  viewMode: string,
  folders: OutlineFolder[],
  documents: OutlineDocument[]
): { id: number; name: string; type: "root" | "folder" | "document" }[] {
  if (currentView !== "all") {
    // 特殊视图：收藏、最近、回收站
    const labels: Record<string, string> = { favorite: "收藏", recent: "最近", trash: "回收站" };
    return [{ id: 0, name: labels[currentView] || currentView, type: "root" }];
  }

  const path: { id: number; name: string; type: "root" | "folder" | "document" }[] = [
    { id: 0, name: "我的文档", type: "root" },
  ];

  if (currentFolderId) {
    const segments: { id: number; name: string; type: "folder" }[] = [];
    let current = folders.find((f) => f.id === currentFolderId);
    while (current) {
      segments.unshift({ id: current.id, name: current.name, type: "folder" });
      current = folders.find((f) => f.id === current!.parentId);
    }
    path.push(...segments);
  }

  if (viewMode === "editor" && currentDocumentId) {
    const doc = documents.find((d) => d.id === currentDocumentId);
    if (doc) {
      path.push({ id: doc.id, name: doc.title || "未命名", type: "document" });
    }
  }

  return path;
}
```

### 4.7 修改现有 Thunk

#### `createDocumentAction` — 创建后自动 refresh `allDocuments`
```typescript
export function createDocumentAction(title?: string, folderId?: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await createDocument({ title, folderId });
      if (res.code === 0) {
        dispatch(fetchDocumentsAction());
        dispatch(fetchAllDocumentsAction());  // 新增
      }
    } catch (e) { ... }
  };
}
```

#### `deleteDocumentAction` — 删除后自动 refresh `allDocuments`
```typescript
// 在 dispatch(fetchDocumentsAction()) 后新增：
dispatch(fetchAllDocumentsAction());
```

类似地，`updateDocument` 的调用方（`DocumentCard.tsx` handleFavorite, handleRename, handleDuplicate）若需要更新树，可在 thunk 中处理或由调用方 dispatch `fetchAllDocumentsAction`。

### 4.8 导出新增的 Actions

```typescript
export const {
  setCurrentFolderId,
  setBreadcrumbPath,
  setAllDocuments,
  // ... 现有 exports 不变
} = outlineStore.actions;
```

---

## 5. API 层变更

**无需调整 API 接口**。`outline.ts` 中现有接口已能满足所有需求：

| 需求 | 使用的 API | 状态 |
|---|---|---|
| 获取所有文档（树展示） | `GET /outline/documents`（无过滤） | 已有 |
| 获取文件夹内文档 | `GET /outline/documents?folderId=N` | 已有 |
| 获取文件夹列表 | `GET /outline/folders` | 已有 |
| 新建/删除/更新文档和文件夹 | `POST/PUT/DELETE` 接口 | 已有 |
| 搜索 | `GET /outline/search` | 已有（保留给编辑器内快捷键） |

唯一注意：调用 `getDocuments({ page: 1, size: 9999 })` 获取全量文档时确保后端支持较大的 size 值。如果后端有限制，需要改为分页拉取。

---

## 6. 需删除的代码/组件

| 文件 | 处理方式 |
|---|---|
| `FolderSidebar.tsx` | **废弃**（由 `FolderTreePanel.tsx` 取代），可以删除或保留作为参考 |

| 代码片段 | 位置 | 操作 |
|---|---|---|
| 全局搜索按钮（`Search` 图标 + "全局搜索" 文字） | `DocumentHome.tsx:48-56` | **删除** |
| `showGlobalSearch` state + `setShowGlobalSearch` | `DocumentHome.tsx:19` | **删除** |
| `<GlobalSearchPanel>` 渲染 | `DocumentHome.tsx:64-66` | **删除** |
| `FolderSidebar` 渲染（整段） | `DocumentHome.tsx:42-46` | **删除** |
| `handleViewChange` callback | `DocumentHome.tsx:33-38` | **删除**（改为直接 dispatch） |
| 返回按钮 (ArrowLeft) | `OutlineEditorToolbar.tsx` | **删除** |
| `handleBack` callback | `OutlineEditorToolbar.tsx:19-21` | **删除** |

---

## 7. 组件 Props 接口变化

| 组件 | 变更 |
|---|---|
| `Note/index.tsx` | 无外部 props 变化，内部布局完全重写 |
| `DocumentHome.tsx` | **移除** `onCreateDocument` prop（内部管理），新增从 Redux 读取 `currentFolderId` |
| `FolderSidebar.tsx` → `FolderTreePanel.tsx` | **重命名+重写**，移除 `currentView`/`onViewChange`/`onCreateFolder` props |
| `FolderTreeItem.tsx` | **新增** `documents`, `currentFolderId`, `currentDocumentId`, `onSelectDocument` props |
| `DocumentList.tsx` → `ContentList.tsx` | **新增** `currentFolderId`, `currentView`, `onFolderClick` props |
| `ContentToolbar.tsx` | **新增组件** |
| `CreateDialog.tsx` | **新增** `defaultFolderId` prop |
| `OutlineEditor.tsx` | 无 props 变化，仅容器 className 调整 |
| `OutlineEditorToolbar.tsx` | **移除** `onVersionHistory` prop 中的返回按钮逻辑 |
| `BreadcrumbBar.tsx` | **新增组件**，无外部 props |
| `DocumentCard.tsx` | 无变化 |
| `BreadcrumbNav.tsx` | 无变化 |

---

## 8. 样式注意事项 (Tailwind v4 合规)

- **所有 hover/可交互元素** 必须使用 `rounded-lg` + `hover:bg-hover` 模式
- **Overlay/弹出层** 使用 `bg-surface`（不用 `bg-[--background]` 或 `bg-background`）
- **选中态** 使用 `bg-accent/10 text-accent`
- **分隔线** 使用 `border-b border-border`
- **文本层级**：`text-text-primary`（主）>`text-text-secondary`（次）>`text-text-muted`（辅助）
- **过渡动画**：`transition-colors` 用于颜色变化
- **不需要 rounded-xxl** 或自定义圆角值 — 统一 `rounded-lg`（对应项目的 `--radius-lg: 20px`）

具体到各组件：
- `BreadcrumbBar`：`px-4 py-1.5 border-b border-border bg-surface` + 每项 `rounded-lg hover:bg-hover`
- `FolderTreePanel`：`w-[280px] shrink-0 border-r border-border h-full flex flex-col`
- `FolderTreeItem`（含文档节点）：`px-3 py-2 rounded-lg hover:bg-hover`
- `ContentToolbar`：`px-6 py-2 border-b border-border`
- 所有按钮：`rounded-lg` + `transition-colors`
- Dropdown/modal：`bg-surface border border-border rounded-xl shadow-xl`

---

## 9. 改动顺序与依赖关系

按依赖顺序排列（每个步骤必须在前一步完成后才能开始）：

### Step 1: Redux Store (`outlineStore.ts`)
- 新增字段：`currentFolderId`, `breadcrumbPath`, `allDocuments`
- 新增 reducers：`setCurrentFolderId`, `setBreadcrumbPath`, `setAllDocuments`
- 新增 thunk：`fetchAllDocumentsAction`
- 修改 `closeDocument`（不重置 `currentFolderId`）
- 导出新增 actions
- **依赖：无**

### Step 2: `BreadcrumbBar.tsx` (新增)
- 从 Redux 读取 `currentFolderId`, `currentDocumentId`, `currentView`, `viewMode`, `folders`, `allDocuments`
- 实现 `computeBreadcrumb` 逻辑
- 渲染面包屑 UI
- **依赖：Step 1**（需要新增的 Redux actions）

### Step 3: `FolderTreeItem.tsx` (修改)
- 新增 props：`documents`, `currentFolderId`, `currentDocumentId`, `onSelectDocument`
- 添加文档子节点渲染
- 添加选中态逻辑
- 重命名旧 `onSelect` prop 为 `onSelectFolder`
- **依赖：Step 1**（新增字段不影响此组件，但选中态需要 `currentFolderId`）

### Step 4: `ContentToolbar.tsx` (新增)
- 新建文档/新建文件夹按钮
- 根据 `currentFolderId` 预填创建对话框
- **依赖：Step 1**

### Step 5: `ContentList.tsx` (新增)
- 文件夹卡片 + 文档卡片混合列表
- 从 Redux 读取数据
- 局部搜索保留
- **依赖：Step 1, 复用 `DocumentCard`**

### Step 6: `FolderTreePanel.tsx` (新增，替换 FolderSidebar)
- 整合「我的文档」根节点
- 集成 `currentFolderId` 选中态
- 传递 `allDocuments` 给 `FolderTreeItem`
- 底部 nav 改为直接 dispatch Redux actions
- **依赖：Steps 1, 3**（需要新的 `FolderTreeItem` props）

### Step 7: `DocumentHome.tsx` (重写)
- 移除 `FolderSidebar` 渲染
- 移除全局搜索按钮和 `GlobalSearchPanel`
- 集成 `ContentToolbar` + `ContentList`
- 读取 `currentFolderId` 控制 document 请求
- **依赖：Steps 4, 5**

### Step 8: `OutlineEditorToolbar.tsx` (修改)
- 移除返回按钮
- **依赖：无**

### Step 9: `OutlineEditor.tsx` (修改)
- 容器 className 从 `h-full` 改为 `flex-1 min-h-0`
- **依赖：无**

### Step 10: `CreateDialog.tsx` (修改)
- 新增 `defaultFolderId` prop，初始 `folderId` 使用此值
- **依赖：无**

### Step 11: `Note/index.tsx` (重写)
- 组装最终布局：`BreadcrumbBar` + 双栏（`FolderTreePanel` | 条件渲染右面板）
- `useEffect` 新增 `fetchAllDocumentsAction` 调度
- **依赖：Steps 1, 2, 6, 7, 9**（所有子组件就绪）

### Step 12: 清理
- 删除 `FolderSidebar.tsx`（或标记为废弃）
- 移除 `DocumentHome.tsx` 中无用的 import

### Step 13: 验证
- `npm run build` 确保 typecheck 通过
- 手动测试所有交互流程：
  1. 进入 `/note` → 看到「我的文档」+ 文件夹树 + 内容区
  2. 点击文件夹 → 面包屑更新 + 内容区更新
  3. 点击文档 → 编辑器打开，左侧树保持，面包屑显示文档路径
  4. 在编辑器中点击面包屑「我的文档」→ 回到首页
  5. 收藏/最近/回收站视图正常
  6. 在编辑器中关闭文档 → 回到浏览器视图
  7. `Ctrl+F` 在编辑器内搜索正常
  8. `Ctrl+[` 退出 focus mode 正常
  9. 新建文档/文件夹 → 树和内容区同步刷新
