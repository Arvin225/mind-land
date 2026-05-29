# 日记模块：右键菜单 + 回收站 设计文档

## 1. 概述

为日记模块新增两个功能：
- **右键菜单**：在日记卡片上右键弹出上下文菜单
- **回收站**：软删除的日记可恢复、查看、彻底删除

## 2. 后端 API

### 2.1 现有
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/diary/entries` | 列表（`del=false`） |
| GET | `/diary/entries/:id` | 详情 |
| POST | `/diary/entries` | 创建 |
| PUT | `/diary/entries/:id` | 更新 |
| DELETE | `/diary/entries/:id` | 软删除（`del=true`） |

### 2.2 新增
| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | `/diary/entries/:id/restore` | 恢复（`del=false`） |
| DELETE | `/diary/entries/:id/permanent` | 彻底删除（硬删） |
| GET | `/diary/entries?trash=true` | 回收站列表（`del=true`） |
| DELETE | `/diary/entries/trash` | 清空回收站 |

### 2.3 实现要点

**service.go**
```go
// GetTrashEntries 回收站列表
func (s *Service) GetTrashEntries(page, size int) (*PaginatedResult, error) {
    // WHERE del = true
}

// RestoreEntry 恢复
func (s *Service) RestoreEntry(id uint) error {
    return s.db.Model(&DiaryEntry{}).Where("id = ?", id).Update("del", false).Error
}

// PermanentDelete 硬删除
func (s *Service) PermanentDelete(id uint) error {
    return s.db.Delete(&DiaryEntry{}, id).Error
}

// EmptyTrash 清空回收站
func (s *Service) EmptyTrash() error {
    return s.db.Where("del = ?", true).Delete(&DiaryEntry{}).Error
}
```

**handler.go**  
新增 4 个 handler：`RestoreEntry`, `PermanentDelete`, `GetTrashEntries`, `EmptyTrash`

**main.go**  
注册路由：
```go
diaryGroup.PATCH("/entries/:id/restore", diaryH.RestoreEntry)
diaryGroup.DELETE("/entries/:id/permanent", diaryH.PermanentDelete)
diaryGroup.GET("/entries", func(c *gin.Context) {
    if c.Query("trash") == "true" {
        diaryH.GetTrashEntries(c)
        return
    }
    diaryH.GetEntries(c)
})
diaryGroup.DELETE("/entries/trash", diaryH.EmptyTrash)
```

> ⚠️ 路由顺序注意：`/entries/trash` 必须在 `/entries/:id` 之前注册，否则 `/trash` 会被 `:id` 匹配。

## 3. 前端

### 3.1 数据模型

**diary.ts (API)**
```ts
// 新增 API 函数
export function restoreEntryAPI(id: number)      // PATCH /diary/entries/:id/restore
export function permanentDeleteAPI(id: number)    // DELETE /diary/entries/:id/permanent
export function getTrashEntriesAPI(page, size)    // GET /diary/entries?trash=true
export function emptyTrashAPI()                   // DELETE /diary/entries/trash
```

### 3.2 Redux Store

**diaryStore.ts** 新增：
- State: `trashMode: boolean`, `trashEntries: DiaryEntry[]`, `trashPage/page/total/hasMore`（或复用现有分页字段，切换模式时清空）
- Thunks: `fetchTrashEntries`, `fetchMoreTrashEntries`, `restoreEntry`, `permanentDelete`, `emptyTrash`
- Reducers: `removeTrashEntry`, `clearTrash`

### 3.3 组件树

```
Diary/index.tsx
├── DiaryList (左侧列表)
│   ├── 标题栏: 「日记」| 🗑️ 按钮 | ✏️ 新建
│   ├── 回收站模式:
│   │   ├── 「清空回收站」按钮
│   │   └── DiaryCard[] (onContextMenu → 恢复/彻底删除)
│   └── 正常模式:
│       └── DiaryCard[] (onContextMenu → 删除)
│
├── DiaryEditor (右侧编辑区)
│   └── 回收站条目只读展示（禁用编辑）
│
└── ContextMenu (右键菜单 popover)
    ├── 正常条目: [删除]
    └── 回收站条目: [恢复, 彻底删除]
```

### 3.4 右键菜单 ContextMenu 组件

**新建文件**: `src/pages/Diary/ContextMenu.tsx`

```tsx
interface ContextMenuProps {
  x: number          // 鼠标 X 坐标
  y: number          // 鼠标 Y 坐标
  items: { label: string; onClick: () => void; danger?: boolean }[]
  onClose: () => void
}
```

- 绝对定位 `position: fixed; left: {x}px; top: {y}px`
- 样式参考 `SortMenu`：`bg-surface border border-[--border] rounded-lg shadow-lg py-1 min-w-[120px]`
- 每个 item：`px-3 py-2 rounded-lg hover:bg-hover transition-colors`
- danger item 用红色文字
- 点击任意 item 或外部自动关闭
- `useEffect` 监听 `mousedown` 关闭

### 3.5 DiaryCard 改动

新增 props:
```tsx
interface DiaryCardProps {
  // ...现有
  onContextMenu?: (e: React.MouseEvent) => void
}
```

卡片 div 上添加 `onContextMenu={onContextMenu}`

### 3.6 DiaryList 改动

- 新增 `trashMode` 状态（可用 Redux 或本地 state）
- 标题栏新增 🗑️ 按钮，点击切换模式
- 回收站模式下显示「清空回收站」按钮
- 使用不同数据源：正常用 `entries`，回收站用 `trashEntries`
- 每个 `DiaryCard` 传入 `onContextMenu` handler
- 管理 `ContextMenu` 的位置和显隐状态

### 3.7 DiaryEditor 改动

- 回收站模式下选中条目设为只读（`editMode=false`），隐藏编辑/阅读切换按钮
- 隐藏删除按钮（回收站条目用右键菜单操作）
- 查看功能：正常展示内容即可（阅读模式）

### 3.8 交互确认

| 操作 | 确认方式 |
|------|----------|
| 正常删除 | `showConfirm`（已有） |
| 恢复 | 直接执行 |
| 彻底删除 | `showConfirm("确定永久删除？此操作不可恢复。")` |
| 清空回收站 | `showConfirm("确定清空回收站？所有条目将永久删除。")` |

## 4. 文件变更清单

| 文件 | 操作 |
|------|------|
| `mind-land-server/diary/model.go` | 不改 |
| `mind-land-server/diary/service.go` | 新增 4 个方法 |
| `mind-land-server/diary/handler.go` | 新增 4 个 handler |
| `mind-land-server/main.go` | 注册 4 条路由 |
| `mind-land-web/src/apis/diary.ts` | 新增 4 个 API 函数 |
| `mind-land-web/src/store/modules/diaryStore.ts` | 新增 state + thunks |
| `mind-land-web/src/pages/Diary/ContextMenu.tsx` | **新建** |
| `mind-land-web/src/pages/Diary/DiaryCard.tsx` | 新增 onContextMenu prop |
| `mind-land-web/src/pages/Diary/DiaryList.tsx` | 回收站模式、右键菜单逻辑 |
| `mind-land-web/src/pages/Diary/DiaryEditor.tsx` | 回收站只读 |
| `mind-land-web/src/pages/Diary/index.tsx` | 无需大改 |
