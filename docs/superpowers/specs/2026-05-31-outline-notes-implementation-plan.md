# 大纲笔记模块实现计划

**日期：** 2026-05-31  
**状态：** 初稿，待执行  
**关联需求：** [大纲笔记模块需求文档](./2026-05-31-outline-notes-requirements.md)

---

## Context

mind-land 当前 `/note` 和 `/mindmap` 路由均为占位页。需要基于需求文档建设完整的结构化大纲笔记模块：树状大纲编辑器、思维导图切换、文件组织、搜索、回收站、历史版本。

技术路线采用**方案 A（自研树编辑器 + 复用局部 TipTap/contentEditable）**——大纲核心是树操作和键盘操作，富文本作为节点内容的一部分。

## 实现阶段

| 阶段 | 内容 | 依赖 |
|------|------|------|
| 1 | 后端基础：数据模型、CRUD、树操作、回收站、搜索、版本历史 API | 无 |
| 2 | 前端文件管理：Redux Store、API 层、文档首页、文件夹侧栏、列表/网格 | 阶段 1 |
| 3 | 前端大纲编辑器：树渲染、键盘快捷键、拖拽、折叠/展开、聚焦模式、右键菜单、自动保存、撤销/重做 | 阶段 2 |
| 4 | 前端思维导图：Canvas 渲染、布局算法、缩放/平移、节点交互、视图切换 | 阶段 3 |
| 5 | 搜索、回收站、历史版本面板 | 阶段 2 |
| 6 | 收尾：路由更新、导航集成、边界情况、Markdown 输入转换 | 以上全部 |

---

## 阶段 1：后端实现

### 新建文件

```
mind-land-server/outline/
├── model.go      # 4 个 GORM 模型
├── service.go    # ~30 个业务方法
└── handler.go    # ~22 个 HTTP handler
```

### 数据模型 (`model.go`)

```go
OutlineFolder {
    ID, Name, ParentID uint (0=root), SortOrder int,
    IsExpanded bool, Del bool,
    CreatedAt, UpdatedAt time.Time
}

OutlineDocument {
    ID, Title, FolderID uint (0=root), SortOrder int,
    IsFavorite bool, Del bool,
    CreatedAt, UpdatedAt time.Time
}

OutlineNode {
    ID, DocumentID uint (indexed), Content string (text/HTML),
    ParentID uint (0=root, indexed), SortOrder int,
    IsCollapsed bool, Note string, Del bool,
    CreatedAt, UpdatedAt time.Time
}

OutlineDocumentVersion {
    ID, DocumentID uint (indexed),
    Snapshot string (text, JSON blob of []OutlineNode),
    NodeCount int, Source string (auto/manual/title-change/pre-restore),
    Summary string,
    CreatedAt time.Time
}
```

软删除统一用 `Del bool` + `gorm:"default:false"`，遵循 diary/slipbox 已有模式。

### Service 关键方法

**文件夹:** GetFolders, CreateFolder, UpdateFolder (patch), DeleteFolder (软删), RestoreFolder, PermanentDeleteFolder

**文档:** GetDocuments (分页+多筛选), GetDocument, GetDocumentWithNodes, CreateDocument, UpdateDocument, DeleteDocument (软删), DuplicateDocument, MoveDocument

**节点（批量保存策略）:**
- `SaveNodes(documentID, []OutlineNode)` — 事务内：删旧插新，ID=0 的节点自动分配新 ID
- `ReorderNodes(documentID, []NodeOrder)` — 轻量排序更新

**回收站:** GetTrashFolders, GetTrashDocuments, RestoreDocument, RestoreFolder, PermanentDeleteDocument, PermanentDeleteFolder, EmptyTrash

**搜索:** `Search(query, scope, page, size)` — `LIKE %q%` 跨文档标题+文件夹名+节点内容

**版本:** GetVersions, GetVersion, CreateVersion, RestoreVersion (恢复前自动创建备份), DeleteVersion

### API 路由表（`/api/outline`）

路由注册顺序：字面量路由（`/trash`, `/search`）必须注册在参数化路由之前（遵循 diary 模块经验）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/folders` | 文件夹列表 `?trash=` |
| POST | `/folders` | 新建文件夹 |
| PUT | `/folders/:id` | 更新文件夹 |
| PATCH | `/folders/:id/restore` | 恢复文件夹 |
| DELETE | `/folders/:id` | 软删文件夹 |
| DELETE | `/folders/:id/permanent` | 硬删文件夹 |
| GET | `/documents` | 文档列表 `?folderId=&favorite=&recent=&trash=&page=&size=` |
| GET | `/documents/:id` | 文档详情 `?withNodes=true` |
| POST | `/documents` | 新建文档 |
| PUT | `/documents/:id` | 更新文档元信息 |
| POST | `/documents/:id/duplicate` | 复制文档 |
| PATCH | `/documents/:id/move` | 移动文档 |
| DELETE | `/documents/:id` | 软删文档 |
| PATCH | `/documents/:id/restore` | 恢复文档 |
| DELETE | `/documents/:id/permanent` | 硬删文档 |
| PUT | `/documents/:id/nodes` | 批量保存节点树 |
| POST | `/documents/:id/nodes/reorder` | 轻量节点排序 |
| DELETE | `/trash` | 清空回收站 |
| GET | `/search` | 全局搜索 `?q=&scope=` |
| GET | `/documents/:id/versions` | 版本列表 |
| GET | `/documents/:id/versions/:vId` | 版本快照 |
| POST | `/documents/:id/versions` | 创建版本 |
| POST | `/documents/:id/versions/:vId/restore` | 恢复到版本 |
| DELETE | `/documents/:id/versions/:vId` | 删除版本 |

### 修改文件：`main.go`

- 添加 `"mind-land-server/outline"` import
- `AutoMigrate` 加入 4 个新模型
- 创建 service + handler + 路由注册块

---

## 阶段 2：前端文件管理

### 新建文件

```
mind-land-web/src/
├── apis/outline.ts                    # API 函数 + 类型定义
├── store/modules/outlineStore.ts      # Redux slice + async thunks
└── pages/Note/
    ├── index.tsx                      # 路由出口（home / editor 切换）
    ├── DocumentHome.tsx               # 双栏文件管理页
    ├── FolderSidebar.tsx              # 文件夹树侧栏
    ├── DocumentList.tsx               # 文档列表（无限滚动）
    ├── DocumentCard.tsx               # 文档卡片
    ├── TrashView.tsx                  # 回收站视图
    └── CreateDialog.tsx               # 新建文档/文件夹对话框
```

### Redux Store 设计

**State 核心字段:**
```
folders[], documents[], nodes[],
currentDocumentId, selectedNodeId, focusModeNodeId,
currentView ('all'|'favorite'|'recent'|'trash'),
viewMode ('home'|'editor'), isMindMapView,
saveStatus ('saved'|'saving'|'unsaved'|''),
searchQuery, searchResults[], searchActive,
versions[]
```

**关键 Async Thunks:** fetchFolders, fetchDocuments, fetchMoreDocuments, openDocument, createDocument, deleteDocument, saveNodes (debounced), createVersion, restoreVersion

**树操作 Reducers（乐观更新，标记 unsaved）:** addNode, indentNode, outdentNode, deleteNode, moveNodeUp/Down, updateNodeContent, collapseNode/expandNode, setFocusMode

### 修改文件

- `store/index.ts` — 添加 `outline: outlineReducer`
- `router/index.tsx` — Note 路由改为嵌套路由（`/note` → DocumentHome, `/note/:docId` → OutlineEditor）

### 页面布局（参照 Diary 双栏模式）

```
┌──────────────────────────────────────────────────────┐
│ 左侧栏 (w-[280px])          │ 主区域                  │
│  ├ 全部文档                  │ 工具栏 + 文档列表/网格   │
│  ├ 收藏                     │                        │
│  ├ 最近                     │                        │
│  ├ 文件夹树                  │                        │
│  └ 回收站                   │                        │
└──────────────────────────────────────────────────────┘
```

每个文件夹/文档支持右键菜单（重命名、移动、复制、删除、收藏），复用 Diary 的 `ContextMenu` 组件。

---

## 阶段 3：前端大纲编辑器

### 新建文件

```
pages/Note/
├── OutlineEditor.tsx           # 编辑器主容器（顶栏 + 内容区 + 自动保存）
├── OutlineEditorToolbar.tsx    # 工具栏（视图切换、聚焦、版本、搜索）
├── OutlineTree.tsx             # 树渲染 + 拖放
├── OutlineNode.tsx             # 单节点行（缩进、折叠、拖拽柄、内容、菜单）
├── NodeContent.tsx             # 内联编辑（contentEditable + DOMPurify）
├── BreadcrumbNav.tsx           # 聚焦模式面包屑
├── ShortcutHelp.tsx            # 快捷键列表面板
└── NodeContextMenu.tsx         # 节点右键菜单（可复用 ContextMenu）
```

### 编辑器布局

```
┌──────────────────────────────────────────────────────────┐
│ [文档标题] [保存状态] [面包屑]    [大纲|脑图切换] [⋯更多]  │
├──────────────────────────────────────────────────────────┤
│ ● 一级主题                                               │
│   ● 二级主题                                             │
│     ● 三级主题                                           │
│   ▸ 已折叠主题                                           │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

### 树渲染算法

将扁平的 `nodes[]`（邻接表模型）渲染为可视化树：

1. 构建 `parentId → children[]` 索引
2. 若处于聚焦模式，过滤到仅聚焦节点的子树
3. DFS 遍历，跳过已折叠节点的子节点
4. 输出可见节点扁平数组，每项附带 `depth` 和 `hasChildren`

### 快捷键（全局键盘事件监听）

| 键 | 操作 |
|------|------|
| `Enter` | 创建同级节点 |
| `Tab` | 缩进一级 |
| `Shift+Tab` | 提升一级 |
| `Backspace` | 空节点时删除并聚焦上一节点 |
| `Delete` | 删除当前节点及其子树 |
| `Ctrl+Z` / `Ctrl+Shift+Z` | 撤销 / 重做 |
| `Ctrl+B/I/U` | 加粗 / 斜体 / 下划线 |
| `Alt+ArrowUp/Down` | 上移 / 下移 |
| `Ctrl+[` / `Escape` | 从聚焦模式返回 |
| `Ctrl+F` | 文档内搜索 |
| `Ctrl+/` | 快捷键列表 |
| `Ctrl+S` | 强制保存 |

### 撤销/重做

本地撤销栈（`OutlineNode[][]` 快照数组 + 指针），最大 50 条。每次树变更前 push 当前状态。新变更清空 redo 栈。

### 拖放（原生 HTML5 DnD，遵循 ToDo 模式）

- 拖拽手柄：`GripVertical` 图标，`data-drag-handle` 属性
- 放置指示器：目标节点上方/下方边框高亮
- 拖拽到右侧区域 → 成为目标的子节点
- 放置后重新计算 sortOrder，标记 unsaved

### 聚焦模式

- 右键节点 → "聚焦" 或双击节点圆点
- 仅显示聚焦节点及其子树
- 顶部显示面包屑：`[首页] > [章节] > [当前焦点]`
- 按 Escape 或点击面包屑退出

### 自动保存（遵循 DiaryEditor 800ms debounce）

```
saveStatus 变为 'unsaved' → 启动 800ms timeout
→ 调度 saveNodes() thunk (PUT /outline/documents/:id/nodes)
→ saveStatus: 'saved' | toast.error('保存失败')
```

### Markdown 输入转换（P0）

在 `NodeContent` 的 `onInput` 中检测 Markdown 语法并自动转换：
- `# ` / `## ` / `### ` → 标题样式（对应不同字号）
- `**text**` → `<strong>`, `*text*` → `<em>`
- `` `code` `` → `<code>`
- `- ` → 无序列表前缀
- `> ` → 引用块样式

---

## 阶段 4：前端思维导图

### 新建文件

```
pages/Note/
├── MindMapView.tsx        # 思维导图容器（Canvas + 控制面板）
├── mindmap-layout.ts      # 树→位置布局算法
└── mindmap-renderer.ts    # Canvas 2D 绘图函数
```

### 布局算法

自右展开的树布局：
1. 构建 `parentId → children[]` 映射
2. 递归计算：子树高度 = 子节点竖直堆叠
3. 父节点位于子节点竖直中点左侧
4. 多根节点竖直堆叠
5. 常量：层间距 120px，节点间距 24px，节点宽 160px，高 40px

### Canvas 渲染

- 连接线：二次贝塞尔曲线
- 节点：圆角矩形填充 + 边框
- 深度着色：gold → blue → pink 循环（匹配项目 CSS 变量）
- 选中节点：金色边框 + 辉光效果
- 视口裁剪：仅渲染可见节点

### 交互

- 滚轮缩放（0.1x–2.0x），点击拖拽平移
- 点击节点选中，双击切换回大纲定位到该节点
- 点击折叠/展开三角切换子树
- 控制面板：放大/缩小/适应屏幕/回到中心/返回大纲

### 视图切换

工具栏切换按钮，`isMindMapView` 状态控制。同一份 `nodes` 数据驱动两个视图，选中节点 ID 双向同步。

---

## 阶段 5：搜索、回收站、版本历史

### 搜索

**全局搜索 (`GlobalSearchPanel.tsx`):**
- 搜索栏触发（Container 顶栏已有 `searchOpen` 状态）
- 搜索输入 300ms debounce → `GET /api/outline/search?q=...`
- 结果分组：文档/文件夹/节点
- 点击跳转到文档 + 定位节点
- 键盘上下导航

**文档内搜索 (`InDocSearchBar.tsx`):**
- `Ctrl+F` 触发，编辑器顶部显示搜索条
- 客户端遍历 `nodes[]` 匹配（节点树已在内存）
- 高亮命中、上一个/下一个、展开包含命中的折叠父节点

### 回收站 (`TrashView.tsx`)

遵循 Diary 回收站模式：
- 显示已删除文档和文件夹列表（名称、类型、删除时间）
- 各项操作：恢复 / 永久删除（带 `showConfirm`）
- 清空回收站按钮（带 `showConfirm`）
- 空状态："回收站为空"

### 版本历史 (`VersionHistoryPanel.tsx`)

- 侧边滑出面板或模态框
- 版本列表：时间、来源（auto/manual）、节点数
- 预览：只读渲染版本快照的节点树
- 恢复：`showConfirm` → API 调用 → 刷新当前节点
- 手动创建版本按钮

版本生成策略（服务端）：
- 首次保存文档
- 标题变更
- 距上次版本 > 5 分钟且有内容变化
- 手动创建

---

## 阶段 6：收尾

### 路由更新

- `/note` → DocumentHome（文件管理）
- `/note/:docId` → OutlineEditor（大纲编辑器）
- `/mindmap` → 最近打开文档的思维导图视图（或空状态引导）
- `/note/:docId?view=mindmap` → 直接进入思维导图

### 导航集成

- Container 侧边栏 "大纲笔记" (`/note`) 和 "脑图" (`/mindmap`) 保持不变
- MindMap 页面与 Note 共享同一套数据和 Redux store

### 边界情况

- 空文档 → "按 Enter 创建第一个节点" 占位提示
- 深层嵌套（10+ 层）→ 编辑器水平可滚动
- 保存失败 → toast 错误提示 + 重试按钮
- 拖放循环检测（不能将节点拖到自己的后代中）
- 恢复版本时当前状态未保存 → 自动创建"恢复前备份"

---

## 可复用的现有组件/模式

| 来源 | 复用内容 |
|------|----------|
| `pages/Diary/index.tsx` | 双栏布局 (360px sidebar + flex-1) |
| `pages/Diary/DiaryEditor.tsx` | 自动保存模式 (800ms debounce + saveStatus) |
| `pages/Diary/ContextMenu.tsx` | 通用右键菜单组件（直接复用） |
| `pages/Diary/DiaryList.tsx` | 回收站切换 + 垃圾桶按钮模式 |
| `lib/confirm.tsx` | `showConfirm()` 确认对话框 |
| `components/ToastProvider.tsx` | `useToast()` 通知 |
| `pages/ToDo/index.tsx` | Alt+Arrow 键盘排序 + HTML5 DnD 模式 |
| `store/modules/diaryStore.ts` | Redux slice + async thunk 模板 |
| `apis/diary.ts` | API 函数组织模板 |

---

## 验收测试（全部自动化）

### 后端自动化测试（Go test）

后端采用 Go 标准测试框架，使用 SQLite 内存数据库（`:memory:`）隔离测试，无需外部依赖。

测试文件：`mind-land-server/outline/service_test.go`（或按功能拆分 `folder_test.go`、`document_test.go`、`node_test.go`、`search_test.go`、`version_test.go`）

**测试工具链：**
- Go 标准 `testing` 包
- `gorm.io/driver/sqlite` 内存数据库（`:memory:`）提供隔离的测试环境
- 每个测试用例独立 `AutoMigrate` + 种子数据，确保无交叉污染
- 表驱动测试（table-driven tests）覆盖正常路径和错误路径

**测试覆盖范围：**

| 测试文件 | 覆盖内容 |
|---------|---------|
| `folder_test.go` | 创建文件夹、获取文件夹树、更新文件夹（重命名/移动/排序）、软删除文件夹、恢复文件夹、永久删除文件夹（含子文档级联处理） |
| `document_test.go` | 创建文档、按条件查询（folderId/favorite/recent/trash）带分页、获取文档含节点树、更新文档元信息（标题/收藏/移动）、软删除文档、恢复文档、复制文档（深层拷贝节点）、永久删除文档（含节点和版本级联清理） |
| `node_test.go` | 批量保存节点树（删旧插新事务）、获取节点树、节点排序更新、空树保存、大批量节点（500+）性能测试 |
| `search_test.go` | 按文档标题搜索、按文件夹名搜索、按节点内容搜索、跨 scope 搜索、空结果、分页搜索 |
| `version_test.go` | 创建版本快照、获取版本列表、获取版本详情、恢复到版本（自动创建恢复前备份）、删除版本 |
| `trash_test.go` | 获取回收站文档/文件夹列表、恢复文档/文件夹（含原路径不存在时回退到根目录）、永久删除单个、清空回收站 |

**运行方式：**
```bash
cd mind-land-server
go test ./outline/... -v
```

### 前端自动化测试（Playwright）

前端使用 Playwright 进行端到端浏览器自动化测试，模拟真实用户操作。

测试文件：`mind-land-web/tests/outline/`（或按功能拆分 `file-management.spec.ts`、`editor.spec.ts`、`mindmap.spec.ts`、`search-trash-version.spec.ts`）

**测试工具链：**
- `@playwright/test` — 浏览器自动化框架
- 测试浏览器：Chromium（headless + headed 两种模式）
- 测试前启动后端（`:3100`）和前端开发服务器（`:3000`），测试后清理

**测试覆盖范围：**

| 测试文件 | 覆盖内容 |
|---------|---------|
| `file-management.spec.ts` | 导航到 `/note` 验证文档首页布局（侧边栏 + 主区域）；创建文件夹；创建文档；右键重命名文档；移动文档到文件夹；复制文档；收藏/取消收藏；切换列表/网格视图；切换排序方式；验证最近编辑视图；验证收藏视图；验证空状态 |
| `trash.spec.ts` | 删除文档确认对话框；验证删除后进入回收站；回收站恢复文档；回收站永久删除；清空回收站确认；验证空回收站状态 |
| `editor-basic.spec.ts` | 打开文档进入编辑视图；`Enter` 创建同级节点；`Tab` 缩进；`Shift+Tab` 提升层级；`Backspace` 删除空节点；选中节点输入文本；验证自动保存状态变化（未保存→保存中→已保存）；刷新页面验证持久化 |
| `editor-advanced.spec.ts` | `Alt+ArrowUp/Down` 移动节点；拖拽节点改变位置和层级（模拟 dragstart/dragover/drop）；折叠/展开节点；刷新后折叠状态保持；聚焦进入节点（右键菜单→聚焦）；面包屑导航返回；`Escape` 退出聚焦；`Ctrl+Z` 撤销 / `Ctrl+Shift+Z` 重做 |
| `editor-formatting.spec.ts` | `Ctrl+B` 加粗 / `Ctrl+I` 斜体 / `Ctrl+U` 下划线；Markdown 输入转换（`# ` 标题、`**text**` 加粗）；`Ctrl+/` 打开快捷键列表；`Esc` 关闭快捷键列表 |
| `mindmap.spec.ts` | 从大纲切换到思维导图视图；验证 Canvas 渲染节点和连线；滚轮缩放；拖拽画布平移；点击节点选中；双击节点回到大纲定位；适应屏幕按钮；回到中心按钮；从大纲切换到脑图 |
| `search.spec.ts` | `Ctrl+F` 打开文档内搜索；输入关键词高亮匹配节点；上一个/下一个跳转；全局搜索面板打开；搜索关键词跨文档命中；点击搜索结果跳转 |
| `version.spec.ts` | 编辑文档后打开版本历史面板；手动创建版本；预览历史版本（只读）；恢复到指定版本；确认恢复前备份已生成 |
| `cross-module.spec.ts` | 大纲模块操作后确认 Diary/ToDo/SlipBox 页面正常加载和基础操作不受影响 |

**Playwright 配置要点：**
```typescript
// playwright.config.ts 关键配置
{
  testDir: './tests/outline',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    headless: true,       // CI 模式
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'cd ../mind-land-server && go run main.go',
      port: 3100,
      reuseExistingServer: true,
    },
    {
      command: 'cd . && npm run dev',
      port: 3000,
      reuseExistingServer: true,
    },
  ],
}
```

**运行方式：**
```bash
cd mind-land-web
npx playwright install chromium
npx playwright test tests/outline/
```
