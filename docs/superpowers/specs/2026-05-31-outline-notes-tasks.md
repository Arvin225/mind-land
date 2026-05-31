# 大纲笔记模块 — TDD 任务拆分

**日期：** 2026-05-31  
**关联计划：** [实现计划](./2026-05-31-outline-notes-implementation-plan.md)  
**关联需求：** [需求文档](./2026-05-31-outline-notes-requirements.md)

---

## 任务总览

```
T01 后端模型 + 迁移          ──┐
T02 后端文件夹 CRUD + 测试      ├── 阶段 1：后端基础
T03 后端文档 CRUD + 测试        │
T04 后端节点批量保存 + 测试      │
T05 后端回收站 + 测试           │
T06 后端搜索 + 测试             │
T07 后端版本历史 + 测试         │
T08 后端路由注册               ──┘
T09 前端 API 层 + 类型         ──┐
T10 前端 Redux Store + 测试     ├── 阶段 2：前端文件管理
T11 前端 DocumentHome 页面      │
T12 前端 FolderSidebar + Trash  │
T13 前端路由集成                ──┘
T14 前端 OutlineNode 组件       ──┐
T15 前端 OutlineTree 渲染       │
T16 前端键盘快捷键系统          ├── 阶段 3：前端大纲编辑器
T17 前端拖拽 + 聚焦 + 菜单      │
T18 前端自动保存 + 撤销重做     │
T19 前端 Markdown 输入转换      ──┘
T20 前端思维导图布局算法        ──┐
T21 前端思维导图 Canvas 渲染    ├── 阶段 4：前端思维导图
T22 前端思维导图交互 + 切换     ──┘
T23 前端全局搜索 + 文档内搜索   ──┐
T24 前端版本历史面板            ├── 阶段 5：搜索 + 版本
T25 前端 MindMap 路由集成       ──┘
T26 Playwright 文件管理 E2E     ──┐
T27 Playwright 大纲编辑器 E2E   ├── 阶段 6：E2E 测试
T28 Playwright 思维导图 E2E     │
T29 Playwright 搜索版本回收站    │
T30 Playwright 跨模块回归测试   ──┘
```

---

## T01 — 后端模型定义 + 数据库迁移

**阶段：** 1 | **依赖：** 无 | **预估：** 小

### 输入
- 现有模型参考：`mind-land-server/diary/model.go`、`mind-land-server/todo/model.go`
- 现有迁移模式：`mind-land-server/main.go` 的 `AutoMigrate` 调用

### 任务
1. 创建 `mind-land-server/outline/model.go`
2. 定义 4 个 GORM 模型：`OutlineFolder`、`OutlineDocument`、`OutlineNode`、`OutlineDocumentVersion`
3. 字段对齐需求文档第 9.1 节数据模型草案
4. 在 `main.go` 中添加 `AutoMigrate` 注册

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/model.go` | 新建 |
| `mind-land-server/main.go` | 修改（import + AutoMigrate） |

### 验收标准
- [ ] `go build` 编译通过
- [ ] 启动服务后 SQLite 自动创建 4 张表
- [ ] 表结构可通过 `.schema` 验证字段类型和默认值

### 模型规格

```go
// OutlineFolder
ID uint primarykey
Name string
ParentID uint default:0
SortOrder int default:0
IsExpanded bool default:true
Del bool default:false
CreatedAt/UpdatedAt time.Time (GORM 自动管理)

// OutlineDocument
ID uint primarykey
Title string
FolderID uint default:0
SortOrder int default:0
IsFavorite bool default:false
Del bool default:false
CreatedAt/UpdatedAt time.Time

// OutlineNode
ID uint primarykey
DocumentID uint (index)
Content string type:text
ParentID uint default:0 (index)
SortOrder int default:0
IsCollapsed bool default:false
Note string type:text
Del bool default:false
CreatedAt/UpdatedAt time.Time

// OutlineDocumentVersion
ID uint primarykey
DocumentID uint (index)
Snapshot string type:text
NodeCount int
Source string default:"manual"
Summary string
CreatedAt time.Time
```

---

## T02 — 后端文件夹 CRUD + 自动化测试

**阶段：** 1 | **依赖：** T01 | **预估：** 中

### 输入
- T01 的模型定义
- 参考：`mind-land-server/diary/service.go` 的 Service 模式

### 任务
1. 创建 `mind-land-server/outline/service.go`，含 `Service` 结构体和 `NewService(db *gorm.DB) *Service`
2. 实现文件夹方法：`GetFolders`、`CreateFolder`、`UpdateFolder`、`DeleteFolder`
3. 创建 `mind-land-server/outline/handler.go`，含 `Handler` 结构体和对应 Gin handler
4. **先写测试**：`mind-land-server/outline/folder_test.go`
   - 用 `:memory:` SQLite 初始化 Service
   - 表驱动测试覆盖：创建根文件夹、创建子文件夹、获取文件夹树、更新名称、更新 parentId、更新排序、正常路径 + 错误路径

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/service.go` | 新建（文件夹部分） |
| `mind-land-server/outline/handler.go` | 新建（文件夹 handler） |
| `mind-land-server/outline/folder_test.go` | 新建 |

### 验收标准
- [ ] `go test ./outline/... -v` 全部通过
- [ ] `CreateFolder` 返回带 ID 的文件夹
- [ ] `GetFolders` 返回按 sortOrder 排序的树
- [ ] `UpdateFolder` patch 模式：传入 map 只更新指定字段
- [ ] `DeleteFolder` 软删除（Del=true）
- [ ] 错误路径：更新不存在的文件夹返回 error

### API handler 规格（不在本任务注册路由，仅定义）
```go
func (h *Handler) GetFolders(c *gin.Context)     // ?trash=true → 回收站
func (h *Handler) CreateFolder(c *gin.Context)    // { name, parentId }
func (h *Handler) UpdateFolder(c *gin.Context)    // PUT /:id  { name?, parentId?, sortOrder?, isExpanded? }
func (h *Handler) DeleteFolder(c *gin.Context)    // DELETE /:id → 软删除
```

---

## T03 — 后端文档 CRUD + 自动化测试

**阶段：** 1 | **依赖：** T02 | **预估：** 中

### 任务
1. 在 `service.go` 中实现文档方法：`GetDocuments`、`GetDocument`、`GetDocumentWithNodes`、`CreateDocument`、`UpdateDocument`、`DeleteDocument`、`DuplicateDocument`、`MoveDocument`
2. 在 `handler.go` 中添加对应 Gin handler
3. **先写测试**：`mind-land-server/outline/document_test.go`
   - 创建文档、按 folderId/favorite/recent/trash 筛选查询、分页、获取文档含节点树、更新标题/收藏/移动、软删除、复制文档（验证节点深层拷贝）、永久删除（验证节点和版本级联清理）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/service.go` | 修改（文档方法） |
| `mind-land-server/outline/handler.go` | 修改（文档 handler） |
| `mind-land-server/outline/document_test.go` | 新建 |

### 验收标准
- [ ] `go test ./outline/... -v` 全部通过（含 T02 测试）
- [ ] `GetDocuments` 支持组合筛选：`?folderId=1&favorite=true&page=1&size=20`
- [ ] `GetDocuments` 支持 `?recent=true` 按 updatedAt DESC 排序
- [ ] `GetDocument` withNodes=true 返回文档 + 所有未删除节点
- [ ] `CreateDocument` 自动创建一条根节点（"未命名大纲"）
- [ ] `DuplicateDocument` 深层拷贝所有节点，标题追加" (副本)"
- [ ] `DeleteDocument` 软删除文档及其节点

---

## T04 — 后端节点批量保存 + 自动化测试

**阶段：** 1 | **依赖：** T03 | **预估：** 中

### 任务
1. 在 `service.go` 中实现 `SaveNodes`（事务内删旧插新）和 `ReorderNodes`（轻量排序）
2. 在 `handler.go` 中添加对应 Gin handler
3. **先写测试**：`mind-land-server/outline/node_test.go`
   - 批量保存新节点、更新已有节点（ID 已存在）、混合新增和更新、空数组保存（清空所有节点）、500+ 节点批量性能测试、排序更新、事务回滚（模拟失败场景）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/service.go` | 修改（节点方法） |
| `mind-land-server/outline/handler.go` | 修改（节点 handler） |
| `mind-land-server/outline/node_test.go` | 新建 |

### 验收标准
- [ ] `SaveNodes` 事务内完成：删除旧节点 → 插入新节点
- [ ] ID=0 的节点被分配新 ID
- [ ] ID>0 的节点保留 ID（更新模式）
- [ ] 不在传入数组中的已有节点被删除
- [ ] `ReorderNodes` 仅更新 sortOrder 和 parentId，不动 content
- [ ] 大批量（500+ 节点）在 1 秒内完成

---

## T05 — 后端回收站 + 自动化测试

**阶段：** 1 | **依赖：** T03 | **预估：** 小

### 任务
1. 在 `service.go` 中实现回收站方法：`GetTrashFolders`、`GetTrashDocuments`、`RestoreDocument`、`RestoreFolder`、`PermanentDeleteDocument`、`PermanentDeleteFolder`、`EmptyTrash`
2. 在 `handler.go` 中添加对应 handler
3. **先写测试**：`mind-land-server/outline/trash_test.go`

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/service.go` | 修改（回收站方法） |
| `mind-land-server/outline/handler.go` | 修改（回收站 handler） |
| `mind-land-server/outline/trash_test.go` | 新建 |

### 验收标准
- [ ] 软删除后 `GetTrashDocuments` 可查到
- [ ] `RestoreDocument` 将 Del 置回 false
- [ ] `PermanentDeleteDocument` 硬删除文档 + 节点 + 版本
- [ ] `PermanentDeleteFolder` 级联硬删除子文档
- [ ] `EmptyTrash` 清空所有软删除项
- [ ] 恢复文档时，原文件夹已被硬删除 → 恢复到根目录

---

## T06 — 后端搜索 + 自动化测试

**阶段：** 1 | **依赖：** T03 | **预估：** 小

### 任务
1. 在 `service.go` 中实现 `Search` 方法（`LIKE %q%` 跨文档标题+文件夹名+节点内容）
2. 在 `handler.go` 中添加 `Search` handler
3. **先写测试**：`mind-land-server/outline/search_test.go`

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/service.go` | 修改（搜索方法） |
| `mind-land-server/outline/handler.go` | 修改（搜索 handler） |
| `mind-land-server/outline/search_test.go` | 新建 |

### 验收标准
- [ ] 搜索文档标题命中
- [ ] 搜索文件夹名称命中
- [ ] 搜索节点内容命中
- [ ] `scope=documents` 仅搜文档
- [ ] `scope=folders` 仅搜文件夹
- [ ] `scope=nodes` 仅搜节点
- [ ] 空关键词返回空结果
- [ ] 分页搜索正常

---

## T07 — 后端版本历史 + 自动化测试

**阶段：** 1 | **依赖：** T04 | **预估：** 中

### 任务
1. 在 `service.go` 中实现版本方法：`GetVersions`、`GetVersion`、`CreateVersion`、`RestoreVersion`、`DeleteVersion`
2. 在 `handler.go` 中添加对应 handler
3. **先写测试**：`mind-land-server/outline/version_test.go`
   - 创建版本快照、获取版本列表（按时间倒序）、获取单个版本详情、恢复到指定版本（验证节点被替换）、恢复前自动创建备份版本（Source="pre-restore"）、删除版本

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/outline/service.go` | 修改（版本方法） |
| `mind-land-server/outline/handler.go` | 修改（版本 handler） |
| `mind-land-server/outline/version_test.go` | 新建 |

### 验收标准
- [ ] `CreateVersion` 快照当前所有节点为 JSON 存入 Snapshot 字段
- [ ] `GetVersions` 按 CreatedAt DESC 排序
- [ ] `RestoreVersion` 将当前节点替换为快照节点（旧节点硬删除）
- [ ] 恢复前自动创建备份版本，Source="pre-restore"
- [ ] `DeleteVersion` 硬删除单条版本记录

---

## T08 — 后端路由注册

**阶段：** 1 | **依赖：** T02–T07 | **预估：** 小

### 任务
1. 在 `main.go` 中完成 outline 路由注册
2. 遵循 diary 模块经验：字面量路由在参数化路由之前
3. 启动服务，手动验证所有端点可达

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-server/main.go` | 修改（路由注册块） |

### 路由注册规格
```go
outlineSvc := outline.NewService(db)
outlineH := outline.NewHandler(outlineSvc)
out := api.Group("/outline")
{
    // 字面量路由必须先于参数化路由
    out.DELETE("/trash", outlineH.EmptyTrash)
    out.GET("/search", outlineH.Search)

    // 文件夹
    out.GET("/folders", outlineH.GetFolders)
    out.POST("/folders", outlineH.CreateFolder)
    out.PATCH("/folders/:id/restore", outlineH.RestoreFolder)
    out.DELETE("/folders/:id/permanent", outlineH.PermanentDeleteFolder)
    out.PUT("/folders/:id", outlineH.UpdateFolder)
    out.DELETE("/folders/:id", outlineH.DeleteFolder)

    // 文档
    out.GET("/documents", outlineH.GetDocuments)
    out.POST("/documents", outlineH.CreateDocument)
    out.POST("/documents/:id/duplicate", outlineH.DuplicateDocument)
    out.PATCH("/documents/:id/move", outlineH.MoveDocument)
    out.PATCH("/documents/:id/restore", outlineH.RestoreDocument)
    out.DELETE("/documents/:id/permanent", outlineH.PermanentDeleteDocument)
    out.PUT("/documents/:id/nodes", outlineH.SaveNodes)
    out.POST("/documents/:id/nodes/reorder", outlineH.ReorderNodes)
    out.GET("/documents/:id/versions", outlineH.GetVersions)
    out.GET("/documents/:id/versions/:versionId", outlineH.GetVersion)
    out.POST("/documents/:id/versions", outlineH.CreateVersion)
    out.POST("/documents/:id/versions/:versionId/restore", outlineH.RestoreVersion)
    out.DELETE("/documents/:id/versions/:versionId", outlineH.DeleteVersion)
    out.GET("/documents/:id", outlineH.GetDocument)
    out.PUT("/documents/:id", outlineH.UpdateDocument)
    out.DELETE("/documents/:id", outlineH.DeleteDocument)
}
```

### 验收标准
- [ ] `go build && go run main.go` 启动无报错
- [ ] `curl http://localhost:3100/api/outline/folders` 返回 `{"code":0,...}`
- [ ] `curl http://localhost:3100/api/outline/documents` 返回 `{"code":0,...}`
- [ ] `curl -X DELETE http://localhost:3100/api/outline/trash` 返回 `{"code":0,...}`

---

## T09 — 前端 API 层 + 类型定义

**阶段：** 2 | **依赖：** T08 | **预估：** 小

### 输入
- 参考：`mind-land-web/src/apis/diary.ts` 的 API 函数模式
- 参考：`mind-land-web/src/apis/interfaces/Response.ts` 的 Response 类型

### 任务
1. 创建 `mind-land-web/src/apis/outline.ts`
2. 定义所有 TypeScript 接口（匹配后端模型 JSON 字段）
3. 实现所有 API 函数（每个后端端点一个）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/apis/outline.ts` | 新建 |

### 验收标准
- [ ] TypeScript 编译通过（`npx tsc --noEmit`）
- [ ] 接口类型与后端模型 JSON tag 一一对应
- [ ] 每个 API 函数签名与后端路由表一一对应
- [ ] 包含 `request.get/post/put/patch/delete<any, Response<T>>(...)` 标准模式

---

## T10 — 前端 Redux Store + 单元测试

**阶段：** 2 | **依赖：** T09 | **预估：** 中

### 输入
- 参考：`mind-land-web/src/store/modules/diaryStore.ts` 的 slice + thunk 模式
- 参考：`mind-land-web/src/store/index.ts` 的 configureStore

### 任务
1. 创建 `mind-land-web/src/store/modules/outlineStore.ts`
2. 定义 `OutlineState` 接口（按计划文档 State 核心字段）
3. 实现同步 reducers：树操作（addNode, indentNode, outdentNode, deleteNode, moveNodeUp/Down, updateNodeContent, collapseNode, expandNode, setFocusMode, setMindMapView）
4. 实现 async thunks：fetchFolders, fetchDocuments, openDocument, createDocument, deleteDocument, saveNodes, createVersion, restoreVersion 等
5. 在 `store/index.ts` 中注册 `outlineReducer`
6. **写单元测试**：用 Jest/Vitest 测试关键 reducers 的纯逻辑（addNode 插入位置、indentNode 层级变更、deleteNode 子树级联、focusMode 过滤）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/store/modules/outlineStore.ts` | 新建 |
| `mind-land-web/src/store/index.ts` | 修改（注册 reducer） |
| `mind-land-web/src/store/modules/outlineStore.test.ts` | 新建 |

### 验收标准
- [ ] `npm run build` 编译通过
- [ ] Reducer 单元测试通过：addNode 在指定节点后正确插入
- [ ] indentNode：将节点移到上一个同级节点下方成为其子节点
- [ ] outdentNode：将节点提升到父节点同级
- [ ] deleteNode：删除节点及其所有后代
- [ ] collapseNode/expandNode：切换 IsCollapsed 且不丢失数据
- [ ] focusMode：过滤后仅显示焦点节点子树

### 树操作 Reducer 规格（核心逻辑）
```
addNode(state, targetId):
  在 targetId 节点下方插入新的空节点（同级，sortOrder+1）
  后续节点 sortOrder 顺延

indentNode(state, nodeId):
  找到 nodeId 的上一个同级节点（prevSibling）
  将 nodeId 的 parentId 设为 prevSibling.id
  nodeId 的 sortOrder 设为 prevSibling 子节点数

outdentNode(state, nodeId):
  找到 nodeId 的父节点
  将 nodeId 提升到父节点同级（parentId = 祖父节点 id）
  sortOrder = 父节点.sortOrder + 1

deleteNode(state, nodeId):
  递归收集 nodeId 及其所有后代 ID
  从 nodes 数组中移除所有收集到的 ID

moveNodeUp/Down(state, nodeId):
  在同级节点中交换 sortOrder（与上一个/下一个同级）

collapseNode/expandNode(state, nodeId):
  原地翻转 IsCollapsed 布尔值

setFocusMode(state, nodeId|null):
  设置 focusModeNodeId
```

---

## T11 — 前端 DocumentHome 页面

**阶段：** 2 | **依赖：** T10 | **预估：** 中

### 输入
- 参考：`mind-land-web/src/pages/Diary/index.tsx` 的双栏布局模式
- 可复用：`mind-land-web/src/pages/Diary/ContextMenu.tsx`（右键菜单）
- 可复用：`mind-land-web/src/lib/confirm.tsx`（确认对话框）
- 可复用：`mind-land-web/src/components/ToastProvider.tsx`（通知）

### 任务
1. 创建 `DocumentHome.tsx`：双栏布局（左侧 280px 侧栏 + 主区域）
2. 创建 `DocumentList.tsx`：文档列表/网格，支持无限滚动
3. 创建 `DocumentCard.tsx`：单文档卡片（标题、节点数、更新时间、收藏星标）
4. 创建 `CreateDialog.tsx`：新建文档/文件夹模态框
5. 创建 `TrashView.tsx`：回收站视图（复用 Diary 回收站模式）
6. 所有可交互元素添加 `rounded-lg` 遵循 CLAUDE.md hover 规范

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/DocumentHome.tsx` | 新建 |
| `mind-land-web/src/pages/Note/DocumentList.tsx` | 新建 |
| `mind-land-web/src/pages/Note/DocumentCard.tsx` | 新建 |
| `mind-land-web/src/pages/Note/CreateDialog.tsx` | 新建 |
| `mind-land-web/src/pages/Note/TrashView.tsx` | 新建 |

### 验收标准
- [ ] 页面渲染：左侧栏（全部文档/收藏/最近/回收站导航）+ 主区域文档列表
- [ ] 点击"新建文档"弹出模态框，输入标题可选文件夹，创建后列表刷新
- [ ] 文档卡片显示标题、节点数、最后更新时间、收藏星标
- [ ] 右键文档卡片弹出 ContextMenu（重命名、移动、复制、删除、收藏）
- [ ] 删除文档弹出 `showConfirm` 确认框，确认后文档移入回收站
- [ ] 切换到回收站视图显示已删除文档和文件夹
- [ ] 空文档列表显示空状态："创建你的第一篇大纲笔记"
- [ ] 深色/浅色主题下 UI 正常

---

## T12 — 前端 FolderSidebar 文件夹树

**阶段：** 2 | **依赖：** T10 | **预估：** 中

### 任务
1. 创建 `FolderSidebar.tsx`：文件夹树侧栏
   - 导航项：全部文档 / 收藏 / 最近 / 回收站（带图标）
   - 文件夹树：展开/收起、缩进表示层级
   - 每个文件夹右侧显示文档计数
   - 右键菜单：重命名、新建子文件夹、删除
   - 顶部"+"按钮新建文件夹
2. 创建 `FolderTreeItem.tsx`：单个文件夹项（可展开、可拖放文档到文件夹）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/FolderSidebar.tsx` | 新建 |

### 验收标准
- [ ] 导航项全部文档/收藏/最近/回收站可点击切换
- [ ] 文件夹树层级正确，支持展开收起
- [ ] 右键文件夹弹出菜单（重命名/新建子文件夹/删除）
- [ ] 新建文件夹后树自动更新
- [ ] 活动项高亮（bg-accent/10 text-accent）
- [ ] 删除文件夹前 showConfirm

---

## T13 — 前端路由集成

**阶段：** 2 | **依赖：** T11, T12 | **预估：** 小

### 输入
- `mind-land-web/src/router/index.tsx` 当前路由配置
- `mind-land-web/src/pages/Note/index.tsx` 当前占位页

### 任务
1. 重写 `pages/Note/index.tsx` 为路由出口（根据 URL 参数渲染 DocumentHome 或 OutlineEditor 占位）
2. 更新 `router/index.tsx`：添加嵌套路由 `/note/:docId`
3. 更新 `pages/MindMap/index.tsx`：整合到大纲数据体系（本期可为重定向占位）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/index.tsx` | 重写 |
| `mind-land-web/src/router/index.tsx` | 修改 |
| `mind-land-web/src/pages/MindMap/index.tsx` | 修改 |

### 验收标准
- [ ] `/note` 渲染 DocumentHome
- [ ] `/note/1` 渲染 OutlineEditor（或占位）
- [ ] `/mindmap` 可访问（本期可为空状态引导页）
- [ ] 侧边栏导航"大纲笔记"和"脑图"正确高亮

---

## T14 — 前端 OutlineNode 单节点组件

**阶段：** 3 | **依赖：** T13 | **预估：** 中

### 任务
1. 创建 `OutlineNode.tsx`：单节点行组件
   - 左侧：折叠三角（有子节点时显示）→ 拖拽手柄（GripVertical）→ 节点圆点 → 内容区（NodeContent 占位）
   - 右侧：hover 时显示三个点菜单按钮
   - 缩进：`marginLeft = depth * 24px`
   - 状态样式：默认 / 选中（bg-hover）/ 拖拽中（opacity-50）
2. 创建 `NodeContent.tsx`：contentEditable 内联编辑区
   - 单行或自动增高
   - 选中文字后出现浮动格式条（加粗/斜体/下划线）
   - onBlur 时 DOMPurify 清洗 HTML
3. 创建 `NodeContextMenu.tsx`：节点右键菜单
   - 插入上方/下方、创建子节点、缩进/提升、删除、折叠/展开、聚焦

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/OutlineNode.tsx` | 新建 |
| `mind-land-web/src/pages/Note/NodeContent.tsx` | 新建 |
| `mind-land-web/src/pages/Note/NodeContextMenu.tsx` | 新建 |

### 验收标准
- [ ] 节点按 depth 正确缩进
- [ ] 有子节点时显示折叠三角，点击切换折叠
- [ ] hover 显示拖拽手柄（`data-drag-handle`）和菜单按钮
- [ ] contentEditable 可输入文字
- [ ] 选中文字出现格式浮动条，可加粗/斜体/下划线
- [ ] onBlur 自动 DOMPurify 清洗
- [ ] 右键弹出菜单，各项操作可点击
- [ ] 选中状态有明显视觉反馈

---

## T15 — 前端 OutlineTree 树渲染 + 虚拟滚动

**阶段：** 3 | **依赖：** T14 | **预估：** 中

### 任务
1. 创建 `OutlineTree.tsx`：
   - 树渲染算法：`nodes[]` 扁平数组 → 构建 `parentId→children[]` 索引 → DFS 遍历生成可见节点列表（含 depth、hasChildren）
   - 跳过已折叠节点的子节点
   - 聚焦模式：仅渲染 focusModeNodeId 的子树
   - 键盘焦点管理：ArrowUp/Down 在可见节点间移动 selectedNodeId

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/OutlineTree.tsx` | 新建 |

### 验收标准
- [ ] 扁平 nodes 正确渲染为缩进树
- [ ] 折叠父节点后子节点不可见
- [ ] 展开后子节点重新可见
- [ ] 聚焦模式下仅显示子树
- [ ] ArrowUp/Down 在可见节点间正确导航
- [ ] 1000 节点渲染无明显卡顿（<200ms）

---

## T16 — 前端键盘快捷键系统

**阶段：** 3 | **依赖：** T15 | **预估：** 中

### 任务
1. 创建 `OutlineEditor.tsx`：主编辑器容器
   - 全局 `onKeyDown` 事件监听
   - 实现所有快捷键（Enter、Tab、Shift+Tab、Backspace、Delete、Ctrl+Z/Y、Ctrl+B/I/U、Alt+Arrow、Ctrl+[、Ctrl+F、Ctrl+/、Ctrl+S）
2. 创建 `ShortcutHelp.tsx`：Ctrl+/ 弹出快捷键列表面板
3. 创建 `OutlineEditorToolbar.tsx`：顶部工具栏（标题输入、保存状态、面包屑占位、视图切换按钮、更多菜单）
4. 创建 `BreadcrumbNav.tsx`：聚焦模式面包屑

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/OutlineEditor.tsx` | 新建 |
| `mind-land-web/src/pages/Note/OutlineEditorToolbar.tsx` | 新建 |
| `mind-land-web/src/pages/Note/ShortcutHelp.tsx` | 新建 |
| `mind-land-web/src/pages/Note/BreadcrumbNav.tsx` | 新建 |

### 验收标准
- [ ] `Enter`：在当前节点下方创建同级空节点，聚焦到新节点
- [ ] `Tab`：当前节点缩进（成为上一个同级节点的子节点），非法缩进（无上一同级）被阻止
- [ ] `Shift+Tab`：当前节点提升一级，已是根级则无操作
- [ ] `Backspace`：空节点时删除并聚焦上一节点；非空时正常删字符
- [ ] `Delete`：删除当前节点及其子树
- [ ] `Alt+ArrowUp/Down`：在同级中上下移动
- [ ] `Ctrl+Z/Y`：撤销/重做
- [ ] `Ctrl+/`：弹出快捷键列表，Esc 关闭
- [ ] `Ctrl+S`：阻止默认保存对话框，强制触发保存
- [ ] `Ctrl+F`：聚焦到文档内搜索栏
- [ ] Mac 对应 `Cmd` 键同样生效

---

## T17 — 前端拖拽排序 + 聚焦模式 + 右键菜单

**阶段：** 3 | **依赖：** T16 | **预估：** 中

### 任务
1. 在 `OutlineTree.tsx` 中实现 HTML5 拖放：
   - `data-drag-handle` 限制拖拽仅从手柄发起（遵循 ToDo 模式）
   - 拖拽到节点上方/下方 → 同级移动
   - 拖拽到右侧偏移区域 → 成为目标的子节点
   - 拖拽中显示放置指示器（border-t-2 border-accent）
2. 实现聚焦模式：
   - 右键节点 → "聚焦" 或双击节点圆点进入
   - 面包屑导航：`[文档根] > [父级] > [当前焦点]`，点击段可回退
   - Escape 或 Ctrl+[ 退出聚焦
3. 右键菜单集成：复制节点文本、复制节点及子树

### 验收标准
- [ ] 从拖拽手柄拖拽到目标上方，节点成为目标的上一个同级
- [ ] 从拖拽手柄拖拽到目标下方，节点成为目标的下一个同级
- [ ] 拖拽到目标右侧 → 节点成为目标的子节点
- [ ] 不能将节点拖到自己的后代中（循环检测）
- [ ] 聚焦模式：仅显示焦点节点子树
- [ ] 面包屑正确显示祖先链，点击祖先可向上跳转
- [ ] Escape 退出聚焦模式
- [ ] 右键菜单：复制节点文本、复制节点及子树到剪贴板

---

## T18 — 前端自动保存 + 撤销重做

**阶段：** 3 | **依赖：** T16 | **预估：** 中

### 任务
1. 在 `OutlineEditor.tsx` 中实现自动保存（遵循 Diary 800ms debounce）：
   - `saveStatus` 状态机：`saved → unsaved → saving → saved`
   - 显示保存状态文本 + 圆点指示器
   - 保存失败 toast 错误 + 重试机制
2. 在 `OutlineEditor.tsx` 中实现撤销/重做：
   - 本地撤销栈：`OutlineNode[][]` 快照数组 + 指针
   - 每次树变更前 push 当前 nodes 到撤销栈
   - 新变更清空 redo 栈
   - 最大保留 50 条快照

### 验收标准
- [ ] 编辑节点内容后 saveStatus 变为 unsaved
- [ ] 800ms 无操作后触发保存，状态变为 saving → saved
- [ ] 保存成功后显示"已保存"（绿色）
- [ ] 保存失败显示"保存失败"（红色）+ toast 提示
- [ ] `Ctrl+Z` 撤销节点操作（新增/删除/移动/编辑）
- [ ] `Ctrl+Shift+Z` / `Ctrl+Y` 重做
- [ ] 撤销超过栈大小时丢弃最早的快照

---

## T19 — 前端 Markdown 输入转换

**阶段：** 3 | **依赖：** T14 | **预估：** 小

### 任务
1. 在 `NodeContent.tsx` 中实现 Markdown 输入自动转换：
   - `# ` / `## ` / `### ` → 字号梯度（文本前缀移除，应用对应 HTML 样式）
   - `**text**` → `<strong>text</strong>`
   - `*text*` / `_text_` → `<em>text</em>`
   - `` `code` `` → `<code>code</code>`
   - `~~text~~` → `<del>text</del>`
   - `- ` 开头 → 无序列表指示器
   - `> ` 开头 → 引用块样式

### 验收标准
- [ ] 在空节点输入 `# 标题` → 渲染为大号标题文本
- [ ] 输入 `**粗体**` → 自动转换为 `<strong>粗体</strong>`
- [ ] 输入 `` `代码` `` → 自动转换为 `<code>代码</code>`
- [ ] 输入 `~~删除~~` → 自动转换为 `<del>删除</del>`
- [ ] 非 Markdown 语法的特殊字符不受影响

---

## T20 — 前端思维导图布局算法

**阶段：** 4 | **依赖：** T15 | **预估：** 中

### 任务
1. 创建 `mindmap-layout.ts`：
   - 输入：`OutlineNode[]`（扁平）
   - 输出：`LayoutNode[]`（含 x, y, width, height, children）
   - 右展开树布局算法（自建，不使用第三方库）
   - 常量：层间距 120px，节点间距 24px，节点宽 160px，高 40px
2. **写纯函数单元测试**：验证不同树形状的布局正确性

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/mindmap-layout.ts` | 新建 |
| `mind-land-web/src/pages/Note/mindmap-layout.test.ts` | 新建 |

### 验收标准
- [ ] 单根节点：位于 (0, 0)
- [ ] 根节点 + 3 子节点：孩子竖直堆叠在右侧
- [ ] 深度 3 树：每层水平间距 120px
- [ ] 折叠节点：其子树不参与布局
- [ ] 多根节点：竖直堆叠
- [ ] 布局函数为纯函数，相同输入始终相同输出

---

## T21 — 前端思维导图 Canvas 渲染

**阶段：** 4 | **依赖：** T20 | **预估：** 中

### 任务
1. 创建 `mindmap-renderer.ts`：
   - Canvas 2D 绘图：连接线（二次贝塞尔曲线）、节点圆角矩形、文本（truncate）
   - 层级着色：gold → blue → pink 循环
   - 选中节点：金色边框 + glow 效果
   - 折叠节点标记（+ 数字）

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/mindmap-renderer.ts` | 新建 |

### 验收标准
- [ ] 连接线从父节点右边缘到子节点左边缘，贝塞尔曲线平滑
- [ ] 节点绘制圆角矩形 + 文本
- [ ] 不同深度不同颜色
- [ ] 选中节点有金色边框 + 辉光
- [ ] 有子节点时显示折叠/展开三角标记

---

## T22 — 前端思维导图容器 + 交互 + 视图切换

**阶段：** 4 | **依赖：** T21 | **预估：** 中

### 任务
1. 创建 `MindMapView.tsx`：
   - Canvas 元素 + `requestAnimationFrame` 渲染循环
   - 变换矩阵：`ctx.translate(offsetX, offsetY)` + `ctx.scale(scale, scale)`
   - 滚轮缩放（0.1x–2.0x，以鼠标位置为中心）
   - 点击拖拽画布平移
   - 点击节点选中 → 回调通知父组件
   - 双击节点 → 切回大纲 + 定位到该节点
   - 控制面板浮层（放大/缩小/适应屏幕/回到中心/返回大纲）
2. 在 `OutlineEditor.tsx` 中集成视图切换：`isMindMapView` 状态切换 OutlineTree / MindMapView

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/MindMapView.tsx` | 新建 |

### 验收标准
- [ ] 大纲视图切换到思维导图，同一数据渲染
- [ ] 滚轮缩放，最小 0.1x，最大 2.0x
- [ ] 拖拽画布平移
- [ ] "适应屏幕"按钮使所有节点可见
- [ ] "回到中心"按钮重置 pan/zoom
- [ ] 点击节点选中（视觉反馈）
- [ ] 双击节点切回大纲并定位到该节点
- [ ] "返回大纲"按钮切回大纲视图
- [ ] 展开/收起子树在脑图中生效

---

## T23 — 前端全局搜索 + 文档内搜索

**阶段：** 5 | **依赖：** T11, T16 | **预估：** 中

### 任务
1. 创建 `GlobalSearchPanel.tsx`：
   - 搜索输入框 300ms debounce
   - 搜索结果分组（文档/文件夹/节点）
   - 键盘 ArrowUp/Down 导航，Enter 选中
   - 点击结果跳转到 `/note/:docId` 并定位节点
2. 创建 `InDocSearchBar.tsx`：
   - Ctrl+F 显示，Esc 关闭
   - 客户端在 nodes 数组中匹配
   - 高亮命中节点，显示当前命中/总命中数
   - 上一个/下一个按钮
   - 自动展开包含命中的折叠父节点

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/GlobalSearchPanel.tsx` | 新建 |
| `mind-land-web/src/pages/Note/InDocSearchBar.tsx` | 新建 |

### 验收标准
- [ ] 全局搜索：输入关键词 300ms 后发起 API 请求
- [ ] 搜索结果分文档/文件夹/节点三组显示
- [ ] 点击文档结果跳转到编辑页
- [ ] 点击节点结果跳转到编辑页并定位（scrollIntoView）
- [ ] Ctrl+F 打开文档内搜索，Esc 关闭
- [ ] 文档内搜索高亮所有命中节点
- [ ] 上一个/下一个按钮切换当前命中
- [ ] 自动展开包含命中的折叠父节点
- [ ] 清空搜索框清除所有高亮

---

## T24 — 前端版本历史面板

**阶段：** 5 | **依赖：** T16 | **预估：** 中

### 任务
1. 创建 `VersionHistoryPanel.tsx`：
   - 从右侧滑入面板（overlay 在编辑器上）
   - 版本列表（时间、来源、节点数）
   - 手动创建版本按钮
   - 预览按钮：只读渲染版本快照的节点树
   - 恢复按钮：`showConfirm` → API → 刷新当前节点
   - 删除按钮：删除版本记录
2. 版本来源中文化显示：
   - `auto` → "自动保存"
   - `manual` → "手动保存"
   - `title-change` → "标题变更"
   - `pre-restore` → "恢复前备份"

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/Note/VersionHistoryPanel.tsx` | 新建 |

### 验收标准
- [ ] 面板从右侧滑入，有遮罩层
- [ ] 版本列表按时间倒序排列
- [ ] 每个版本显示：时间、来源（中文）、节点数
- [ ] 点击预览：面板内只读展示版本快照的节点树
- [ ] 点击恢复：showConfirm → 恢复成功 → toast 提示 → 刷新编辑器
- [ ] 点击删除：删除版本记录
- [ ] 手动创建版本：调用 POST /versions API → 列表刷新
- [ ] 面板可关闭（X 按钮或点击遮罩）

---

## T25 — 前端 MindMap 路由 + 导航收尾

**阶段：** 5 | **依赖：** T22, T23, T24 | **预估：** 小

### 任务
1. 更新 `pages/MindMap/index.tsx`：MindMap 页面从最近打开的文档直接进入脑图模式
   - 无最近文档时显示引导页
2. 支持 URL 参数：`/note/:docId?view=mindmap` 直接进入脑图
3. Container 顶栏搜索按钮连接到 GlobalSearchPanel

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/src/pages/MindMap/index.tsx` | 重写 |

### 验收标准
- [ ] `/mindmap` 显示最近文档的脑图（或空状态引导）
- [ ] `/note/1?view=mindmap` 直接进入脑图模式
- [ ] 侧边栏"脑图"导航正确高亮

---

## T26 — Playwright E2E：文件管理

**阶段：** 6 | **依赖：** T13 | **预估：** 中

### 任务
1. 安装 Playwright：`npm install -D @playwright/test && npx playwright install chromium`
2. 创建 `mind-land-web/tests/outline/file-management.spec.ts`
3. 编写测试用例：文档首页布局、创建文件夹、创建文档、右键重命名、移动、复制、收藏、删除、回收站恢复/永久删除/清空

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/playwright.config.ts` | 新建（或修改） |
| `mind-land-web/tests/outline/file-management.spec.ts` | 新建 |

### 验收标准
- [ ] 测试用例全部通过（`npx playwright test tests/outline/file-management.spec.ts`）
- [ ] 每个测试用例对应需求文档第 12.1 节验收项
- [ ] 测试包含失败截图

---

## T27 — Playwright E2E：大纲编辑器

**阶段：** 6 | **依赖：** T19 | **预估：** 中

### 任务
1. 创建 `mind-land-web/tests/outline/editor.spec.ts`
2. 编写测试用例：Enter 创建节点、Tab/Shift+Tab 层级调整、Backspace 删除空节点、文本输入、拖拽排序、折叠展开、聚焦模式、键盘快捷键（全部 P0 快捷键）、Markdown 输入转换、自动保存状态

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/tests/outline/editor.spec.ts` | 新建 |

### 验收标准
- [ ] 测试用例全部通过
- [ ] 每个测试对应需求文档第 12.2、12.3 节验收项

---

## T28 — Playwright E2E：思维导图

**阶段：** 6 | **依赖：** T22 | **预估：** 中

### 任务
1. 创建 `mind-land-web/tests/outline/mindmap.spec.ts`
2. 编写测试用例：大纲切脑图、Canvas 渲染验证、缩放、平移、点击选中、双击回大纲、适应屏幕、回到中心

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/tests/outline/mindmap.spec.ts` | 新建 |

### 验收标准
- [ ] 测试用例全部通过
- [ ] 每个测试对应需求文档第 12.4 节验收项

---

## T29 — Playwright E2E：搜索 + 版本 + 回收站

**阶段：** 6 | **依赖：** T23, T24 | **预估：** 中

### 任务
1. 创建 `mind-land-web/tests/outline/search-version-trash.spec.ts`
2. 编写测试用例：全局搜索、文档内搜索、版本创建/预览/恢复、回收站恢复/永久删除

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/tests/outline/search-version-trash.spec.ts` | 新建 |

### 验收标准
- [ ] 测试用例全部通过
- [ ] 每个测试对应需求文档第 12.5、12.6、12.7 节验收项

---

## T30 — Playwright E2E：跨模块回归测试

**阶段：** 6 | **依赖：** T26–T29 | **预估：** 小

### 任务
1. 创建 `mind-land-web/tests/outline/cross-module-regression.spec.ts`
2. 在大纲模块操作后，验证 Diary/ToDo/SlipBox 页面正常加载和基础功能不受影响

### 输出文件
| 文件 | 操作 |
|------|------|
| `mind-land-web/tests/outline/cross-module-regression.spec.ts` | 新建 |

### 验收标准
- [ ] Diary 页面正常加载，新建/编辑条目正常
- [ ] ToDo 页面正常加载，新建/完成/删除任务正常
- [ ] SlipBox 页面正常加载，新建/编辑卡片正常
- [ ] 主题切换和各模块 UI 正常

---

## 任务依赖图

```
T01 ──→ T02 ──→ T03 ──→ T04 ──→ T07
                    │         │
                    ├──→ T05  │
                    │         │
                    └──→ T06  │
                              │
                    T08 ←─────┘
                    │
                    ▼
              T09 ──→ T10 ──→ T11 ──→ T13
                           │    │        │
                           │    ├──→ T12─┘
                           │    │
                           │    └──→ T23 ───┐
                           │                 │
                           └──→ T14 ──→ T15 ──→ T16 ──→ T17 ──→ T18
                                                   │
                                                   └──→ T19
                                                   │
                                                   └──→ T24 ───┘
                                        │
                                   T15 ──→ T20 ──→ T21 ──→ T22
                                                             │
                                                             └──→ T25 ──┐
                                                                         │
                    T13 ──────────────────────────────────────────→ T26  │
                    T19 ──────────────────────────────────────────→ T27  │
                    T22 ──────────────────────────────────────────→ T28  │
                    T23+T24 ──────────────────────────────────────→ T29  │
                    T26+T27+T28+T29 ──────────────────────────────→ T30  │
```

## 并行执行建议

以下任务组之间无依赖，可并行交给不同 Agent：

- **组 A（后端）：** T01 → T02 → T03 → T04 → T05/T06/T07（T05/T06/T07 可并行）→ T08
- **组 B（前端基础设施）：** T09 → T10
- **组 B 完成后并行：**
  - **组 C（文件管理）：** T11 + T12 → T13
  - **组 D（编辑器核心）：** T14 → T15 → T16
- **组 D 完成后并行：**
  - **组 E（编辑器高级）：** T17 + T18 + T19
  - **组 F（思维导图）：** T20 → T21 → T22
- **组 C+E+F 完成后并行：**
  - **组 G（搜索版本）：** T23 + T24
- **收尾：** T25
- **E2E：** T26 → T27 → T28 → T29 → T30（顺序依赖较弱，也可并行）

---

## 每个 Agent 的执行模板

```
你正在执行任务 TXX：[任务名称]

## 背景
[从计划文档复制的相关背景]

## 你应该先读的文件
- [已有参考文件 1]
- [已有参考文件 2]

## 你需要创建/修改的文件
| 文件 | 操作 |
|------|------|
| ... | ... |

## TDD 步骤
1. **RED**：先写测试，验证测试失败
2. **GREEN**：实现最小代码让测试通过
3. **REFACTOR**：清理代码，确保无重复

## 验收标准
- [ ] ...
- [ ] ...

## 禁止事项
- 不要修改不相关的文件
- 不要引入计划外的依赖
- 不要跳过测试直接写实现
```
