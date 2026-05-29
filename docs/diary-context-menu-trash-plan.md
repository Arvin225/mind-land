# 日记右键菜单 + 回收站 — 实现计划

## 任务总览（按依赖顺序）

```
Task 1 (后端-Service) ──→ Task 2 (后端-Handler) ──→ Task 3 (后端-路由)
Task 4 (前端-API) ──→ Task 5 (前端-Store) ──→ Task 6~9 (前端-组件) ──→ Task 10 (验证)
```

---

## Task 1: 后端 Service — 新增 4 个方法

**文件:** `mind-land-server/diary/service.go`

### 改动

在现有文件末尾新增以下 4 个方法：

| 方法 | 签名 | 逻辑 |
|------|------|------|
| `GetTrashEntries` | `(page, size int) (*PaginatedResult, error)` | 翻页查询 `WHERE del = true`，排序 `created_at DESC`，复用已有的 `PaginatedResult` 结构体和分页逻辑（page/size 校验、Count + Offset+Limit 双查询模式） |
| `RestoreEntry` | `(id uint) error` | `s.db.Model(&DiaryEntry{}).Where("id = ?", id).Update("del", false).Error` |
| `PermanentDelete` | `(id uint) error` | `s.db.Delete(&DiaryEntry{}, id).Error`（硬删除） |
| `EmptyTrash` | `() error` | `s.db.Where("del = ?", true).Delete(&DiaryEntry{}).Error`（批量硬删除所有回收站条目） |

### 实现细节

```go
// GetTrashEntries 复刻 GetEntries 的分页模式，区别仅在于 Where("del = ?", true)
func (s *Service) GetTrashEntries(page, size int) (*PaginatedResult, error) {
    if page < 1 { page = 1 }
    if size <= 0 { size = DefaultPageSize }
    var total int64
    if err := s.db.Model(&DiaryEntry{}).Where("del = ?", true).Count(&total).Error; err != nil {
        return nil, err
    }
    var entries []DiaryEntry
    offset := (page - 1) * size
    if err := s.db.Where("del = ?", true).
        Order("created_at DESC").Offset(offset).Limit(size).
        Find(&entries).Error; err != nil {
        return nil, err
    }
    return &PaginatedResult{Entries: entries, Total: total, Page: page, Size: size}, nil
}

func (s *Service) RestoreEntry(id uint) error {
    return s.db.Model(&DiaryEntry{}).Where("id = ?", id).Update("del", false).Error
}

func (s *Service) PermanentDelete(id uint) error {
    return s.db.Delete(&DiaryEntry{}, id).Error
}

func (s *Service) EmptyTrash() error {
    return s.db.Where("del = ?", true).Delete(&DiaryEntry{}).Error
}
```

### 风险
- `model.go` 不改动。`DiaryEntry` 已有 `Del bool` 字段，无需新增。

---

## Task 2: 后端 Handler — 新增 4 个 handler + 修改 GetEntries

**文件:** `mind-land-server/diary/handler.go`

### 改动 A: 修改现有 `GetEntries`

在 `GetEntries` 开头读取 `trash` query param，根据值调用不同 service：

```go
func (h *Handler) GetEntries(c *gin.Context) {
    trash := c.DefaultQuery("trash", "false")
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

    var result *PaginatedResult
    var err error

    if trash == "true" {
        result, err = h.svc.GetTrashEntries(page, size)
    } else {
        result, err = h.svc.GetEntries(page, size)
    }

    if err != nil {
        common.Error(c, http.StatusInternalServerError, "获取日记列表失败")
        return
    }
    common.Success(c, result)
}
```

> 不做成独立的路由 handler 是为了避免路由冲突 — `GET /entries?trash=true` 和 `GET /entries` 是同一条路由，只是在 handler 内部根据 query 分发。

### 改动 B: 在文件末尾新增 3 个 handler

```go
// RestoreEntry PATCH /diary/entries/:id/restore
func (h *Handler) RestoreEntry(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 64)
    if err != nil {
        common.Error(c, http.StatusBadRequest, "无效的ID")
        return
    }
    if err := h.svc.RestoreEntry(uint(id)); err != nil {
        common.Error(c, http.StatusInternalServerError, "恢复日记失败")
        return
    }
    common.Success(c, nil)
}

// PermanentDelete DELETE /diary/entries/:id/permanent
func (h *Handler) PermanentDelete(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 64)
    if err != nil {
        common.Error(c, http.StatusBadRequest, "无效的ID")
        return
    }
    if err := h.svc.PermanentDelete(uint(id)); err != nil {
        common.Error(c, http.StatusInternalServerError, "永久删除日记失败")
        return
    }
    common.Success(c, nil)
}

// EmptyTrash DELETE /diary/entries/trash
func (h *Handler) EmptyTrash(c *gin.Context) {
    if err := h.svc.EmptyTrash(); err != nil {
        common.Error(c, http.StatusInternalServerError, "清空回收站失败")
        return
    }
    common.Success(c, nil)
}
```

### 命名约定
- Handler 方法名与 Service 方法名一一对应：`RestoreEntry` / `PermanentDelete` / `EmptyTrash`
- 错误消息沿用中文风格（与现有 "无效的ID"、"删除日记失败" 保持一致）

---

## Task 3: 后端路由注册 — 注意顺序

**文件:** `mind-land-server/main.go`

### 改动

在 `dr := api.Group("/diary")` 的 `{}` 块内，**在原有路由之前**新增以下路由：

```go
dr := api.Group("/diary")
{
    dr.GET("/entries", diaryH.GetEntries)           // 现有（已修改，内部按 trash query 分发）
    dr.GET("/entries/:id", diaryH.GetEntry)          // 现有

    // ==== 新增路由 (必须在 entries/:id 之前) ====
    dr.DELETE("/entries/trash", diaryH.EmptyTrash)   // ⚠️ 抢先注册！否则 /trash 被 :id 匹配
    // ==== 新增路由 (id-based) ====
    dr.PATCH("/entries/:id/restore", diaryH.RestoreEntry)
    dr.DELETE("/entries/:id/permanent", diaryH.PermanentDelete)
    // ==== 现有路由 ====
    dr.POST("/entries", diaryH.CreateEntry)
    dr.PUT("/entries/:id", diaryH.UpdateEntry)
    dr.DELETE("/entries/:id", diaryH.DeleteEntry)
}
```

### 关键：路由注册顺序

Gin 的 radix tree 路由匹配规则是**先注册先匹配**。`/entries/trash` 如果写在 `/entries/:id` 之后，`"trash"` 会被 `:id` 匹配然后引发 400 错误（"无效的ID" — `strconv.ParseUint("trash", ...)` 失败）。

**正确顺序：**
1. `/entries/trash`（字面量路径）
2. `/entries/:id/restore`、`/entries/:id/permanent`、`/entries/:id`（参数化路径）
3. 字面量路由必须位于参数化路由之前

### 风险
- 如果路由顺序写错，清空回收站请求会被 `:id` 拦截。验证方法：`curl -X DELETE http://localhost:3100/api/diary/entries/trash` 应返回 200 而非 400。

---

## Task 4: 前端 API 层 — 新增 4 个函数

**文件:** `mind-land-web/src/apis/diary.ts`

### 改动

在现有文件末尾新增 4 个导出函数：

```ts
import { Response } from "./interfaces/Response"
// 已有 import { request } from "@/utils/request"

export function getTrashEntriesAPI(page: number, size: number) {
  return request.get<any, Response<PaginatedEntries>>("/diary/entries", {
    params: { trash: "true", page, size },
  })
}

export function restoreEntryAPI(id: number) {
  return request.patch<any, Response<null>>(`/diary/entries/${id}/restore`)
}

export function permanentDeleteAPI(id: number) {
  return request.delete<any, Response<null>>(`/diary/entries/${id}/permanent`)
}

export function emptyTrashAPI() {
  return request.delete<any, Response<null>>("/diary/entries/trash")
}
```

### 接口签名说明

| 函数 | HTTP 方法 | 路径 | 请求体 | 响应类型 |
|------|-----------|------|--------|----------|
| `getTrashEntriesAPI(page, size)` | GET | `/diary/entries?trash=true&page=&size=` | 无 (query params) | `Response<PaginatedEntries>` |
| `restoreEntryAPI(id)` | PATCH | `/diary/entries/:id/restore` | 无 | `Response<null>` |
| `permanentDeleteAPI(id)` | DELETE | `/diary/entries/:id/permanent` | 无 | `Response<null>` |
| `emptyTrashAPI()` | DELETE | `/diary/entries/trash` | 无 | `Response<null>` |

### 注意
- `getTrashEntriesAPI` 复用了 `PaginatedEntries` 接口（已定义）。
- `restoreEntryAPI` 使用 `request.patch`（不是 `request.put`），与后端 `PATCH` 方法对应。
- URL 路径以 `/diary/entries` 开头，因为 Vite 开发模式基底路径是 `/api`，生产环境直接连 `localhost:3100`。

---

## Task 5: 前端 Redux Store — 新增 state + thunks + reducers

**文件:** `mind-land-web/src/store/modules/diaryStore.ts`

### 改动 A: DiaryState 接口新增字段

```ts
interface DiaryState {
  // ==== 现有字段 ====
  entries: DiaryEntry[]
  loading: boolean
  selectedId: number | null
  selectedEntry: DiaryEntry | null
  editMode: boolean
  page: number
  total: number
  hasMore: boolean
  // ==== 新增字段 ====
  trashMode: boolean
  trashEntries: DiaryEntry[]
  trashPage: number
  trashTotal: number
  trashHasMore: boolean
}
```

### 改动 B: initialState 新增字段

```ts
const initialState: DiaryState = {
  entries: [],
  loading: false,
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
}
```

### 改动 C: 新增 reducers（在 `reducers` 对象内）

```ts
setTrashMode(state, action: PayloadAction<boolean>) {
  state.trashMode = action.payload
  if (action.payload) {
    state.selectedId = null
    state.selectedEntry = null
    state.editMode = false
  }
},
removeTrashEntry(state, action: PayloadAction<number>) {
  state.trashEntries = state.trashEntries.filter(e => e.id !== action.payload)
  if (state.selectedId === action.payload) {
    state.selectedId = null
    state.selectedEntry = null
  }
},
clearTrash(state) {
  state.trashEntries = []
  state.trashTotal = 0
  state.trashPage = 1
  state.trashHasMore = true
  state.selectedId = null
  state.selectedEntry = null
},
```

### 改动 D: 新增 async thunks（在现有 thunks 之后）

```ts
export const fetchTrashEntries = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const res = await getTrashEntriesAPI(1, 20)
    if (res.code === 0 && res.result) {
      dispatch(setTrashEntries(res.result.entries))
      dispatch(setTrashPage(1))
      - 还需要 setTrashTotal 和 setTrashHasMore
    }
  } catch (e) { console.error("获取回收站列表失败", e) }
  finally { dispatch(setLoading(false)) }
}

export const fetchMoreTrashEntries = (): AppThunk => async (dispatch, getState) => {
  const { trashPage, trashHasMore, loading } = getState().diary
  if (!trashHasMore || loading) return
  dispatch(setLoading(true))
  try {
    const res = await getTrashEntriesAPI(trashPage + 1, 20)
    if (res.code === 0 && res.result) {
      dispatch(appendTrashEntries(res.result.entries))
      dispatch(setTrashPage(trashPage + 1))
    }
  } catch (e) { console.error("加载更多回收站条目失败", e) }
  finally { dispatch(setLoading(false)) }
}

export const restoreEntry = (id: number): AppThunk => async (dispatch) => {
  try {
    const res = await restoreEntryAPI(id)
    if (res.code === 0) {
      dispatch(removeTrashEntry(id))
      // 刷新正常列表，确保恢复后的条目出现在正常列表中
      dispatch(fetchEntries())
    }
  } catch (e) { console.error("恢复日记失败", e) }
}

export const permanentDeleteEntry = (id: number): AppThunk => async (dispatch) => {
  try {
    const res = await permanentDeleteAPI(id)
    if (res.code === 0) {
      dispatch(removeTrashEntry(id))
    }
  } catch (e) { console.error("永久删除日记失败", e) }
}

export const emptyTrash = (): AppThunk => async (dispatch) => {
  try {
    const res = await emptyTrashAPI()
    if (res.code === 0) {
      dispatch(clearTrash())
    }
  } catch (e) { console.error("清空回收站失败", e) }
}
```

### 注意：需要新增对应的辅助 reducers

由于使用了 `setTrashEntries`、`appendTrashEntries`、`setTrashPage` 等未定义的 reducer，需要在 slice 的 `reducers` 中补充：

```ts
setTrashEntries(state, action: PayloadAction<DiaryEntry[]>) {
  state.trashEntries = action.payload
},
appendTrashEntries(state, action: PayloadAction<DiaryEntry[]>) {
  state.trashEntries.push(...action.payload)
},
setTrashPage(state, action: PayloadAction<number>) {
  state.trashPage = action.payload
  state.trashHasMore = state.trashEntries.length < state.trashTotal
},
setTrashTotal(state, action: PayloadAction<number>) {
  state.trashTotal = action.payload
  state.trashHasMore = state.trashEntries.length < state.trashTotal
},
```

### 导出更新

在文件末尾的 `export const { ... }` 解构中添加所有新增的 action creators。

---

## Task 6: 前端 ContextMenu 组件 — 新建

**文件 (新建):** `mind-land-web/src/pages/Diary/ContextMenu.tsx`

### 接口签名

```tsx
interface ContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean  // true → 红色文字
}

interface ContextMenuProps {
  x: number          // 鼠标 clientX
  y: number          // 鼠标 clientY
  items: ContextMenuItem[]
  onClose: () => void
}
```

### 组件结构

```tsx
const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      className="fixed z-50 bg-surface border border-[--border] rounded-lg shadow-lg py-1 min-w-[120px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg transition-colors",
            "hover:bg-hover",
            item.danger ? "text-red-500" : "text-[--foreground]"
          )}
          onClick={() => { item.onClick(); onClose() }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
```

### 设计参考
- 完全参照 `SortMenu` 的下拉面板样式：`bg-surface border rounded-lg shadow-lg py-1`
- hover 态：`hover:bg-hover rounded-lg` — 符合项目交互惯例
- danger 红色文字使用 `text-red-500`，与 `AlertDialog` 的 `destructive` 按钮风格一致
- `mousedown` 全局监听 → 点击任意外部区域关闭菜单（比 `click` 事件更灵敏，能捕获所有鼠标按下行为）
- **超出可视区域处理**：菜单可能渲染在视口外（右键靠近底部/右侧时）。建议在 `style` 中做边界修正：
  ```tsx
  const adjustedX = Math.min(x, window.innerWidth - 160)
  const adjustedY = Math.min(y, window.innerHeight - items.length * 40)
  ```

---

## Task 7: 前端 DiaryCard — 新增 onContextMenu prop

**文件:** `mind-land-web/src/pages/Diary/DiaryCard.tsx`

### 改动

1. **Props 接口新增字段：**
   ```tsx
   interface DiaryCardProps {
     entry: any
     date: Date
     selected: boolean
     onClick: () => void
     onContextMenu?: (e: React.MouseEvent) => void  // 新增
   }
   ```

2. **最外层 div 添加 `onContextMenu` 事件：**
   ```tsx
   <div
     ref={last ? lastRef : undefined}
     className={cn(
       "flex items-center py-4 px-4 mx-4 rounded-lg cursor-pointer transition-colors",
       selected ? "bg-hover" : "hover:bg-hover"
     )}
     onClick={onClick}
     onContextMenu={onContextMenu}  // 新增
   >
   ```

### 实现细节
- `onContextMenu` 是可选 prop（`?:`），向后兼容。如果 `DiaryList` 不传，卡片行为与现在完全一致。
- 最外层 div 同时有 `onClick` 和 `onContextMenu`，两者独立触发：
  - 左键 → `onClick`（选择并编辑）
  - 右键 → `onContextMenu`（弹出菜单）+ 自动阻止浏览器默认菜单（`e.preventDefault()` 在 DiaryList 中处理）

---

## Task 8: 前端 DiaryList — 回收站模式 + 右键菜单逻辑

**文件:** `mind-land-web/src/pages/Diary/DiaryList.tsx`

这是改动最大的组件。

### 改动 A: 新增 import

```tsx
import { useState, useCallback } from "react"
import { Trash2 } from "lucide-react"              // 回收站图标
import { showConfirm } from "@/lib/confirm"
import { setTrashMode, fetchTrashEntries, fetchMoreTrashEntries,
         restoreEntry, permanentDeleteEntry, emptyTrash } from "@/store/modules/diaryStore"
import ContextMenu from "./ContextMenu"
```

### 改动 B: 新增组件内部 state

```tsx
// 右键菜单状态
const [contextMenu, setContextMenu] = useState<{
  x: number; y: number; entryId: number; entryDel: boolean
} | null>(null)
```

`entryDel` 用于判断是正常条目（显示"删除"）还是回收站条目（显示"恢复"/"彻底删除"）。

### 改动 C: 标题栏新增回收站按钮

在现有的标题栏（"日记" + ✏️ 按钮）中新增 🗑️ 按钮：

```tsx
<div className="flex items-center justify-between px-4 h-12 border-b border-[--border]">
  <span className="text-lg font-bold">日记</span>
  <div className="flex items-center gap-2">
    <button
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        trashMode ? "bg-accent/10 text-accent" : "hover:bg-hover text-[--foreground]/60"
      )}
      title={trashMode ? "返回日记" : "回收站"}
      onClick={() => {
        dispatch(setTrashMode(!trashMode))
        if (!trashMode) dispatch(fetchTrashEntries())
      }}
    >
      <Trash2 size={18} />
    </button>
    <button
      className="p-1.5 rounded-lg hover:bg-hover transition-colors text-[--foreground]/60"
      onClick={onNew}
      title="新建日记"
    >
      <SquarePen size={18} />
    </button>
  </div>
</div>
```

### 改动 D: 回收站模式下的「清空回收站」按钮

在回收站模式下，列表顶部显示一个操作栏：

```tsx
{trashMode && trashEntries.length > 0 && (
  <div className="px-4 py-2 flex justify-end">
    <button
      className="text-xs text-red-500 hover:underline"
      onClick={async () => {
        const ok = await showConfirm({
          title: "清空回收站",
          description: "确定清空回收站？所有条目将永久删除。",
          confirmText: "清空",
        })
        if (ok) dispatch(emptyTrash())
      }}
    >
      清空回收站
    </button>
  </div>
)}
```

### 改动 E: 数据源切换

列表渲染时，根据 `trashMode` 使用不同数据源：

```tsx
const sourceEntries = trashMode ? trashEntries : entries

// 使用 sourceEntries 替代原有的 entries 进行 groupByYearMonth
const groups = groupByYearMonth(sourceEntries, (e) => new Date(e.createdAt))
```

### 改动 F: 右键菜单 handler

```tsx
const handleContextMenu = useCallback((e: React.MouseEvent, entry: DiaryEntry) => {
  e.preventDefault()
  setContextMenu({
    x: e.clientX,
    y: e.clientY,
    entryId: entry.id,
    entryDel: entry.del,
  })
}, [])
```

### 改动 G: ContextMenu 渲染

在组件 return 的末尾（JSX 的最后面，浮动在列表之上）：

```tsx
{contextMenu && (
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={
      contextMenu.entryDel
        ? [
            {
              label: "恢复",
              onClick: () => dispatch(restoreEntry(contextMenu.entryId)),
            },
            {
              label: "彻底删除",
              danger: true,
              onClick: async () => {
                const ok = await showConfirm({
                  title: "永久删除",
                  description: "确定永久删除？此操作不可恢复。",
                  confirmText: "删除",
                })
                if (ok) dispatch(permanentDeleteEntry(contextMenu.entryId))
              },
            },
          ]
        : [
            {
              label: "删除",
              danger: true,
              onClick: async () => {
                const ok = await showConfirm({
                  title: "删除日记",
                  description: "确定删除这篇日记？删除后可在回收站恢复。",
                  confirmText: "删除",
                })
                if (ok) dispatch(deleteEntry(contextMenu.entryId))
              },
            },
          ]
    }
    onClose={() => setContextMenu(null)}
  />
)}
```

> 注意：正常删除的确认文案从 "删除后不可恢复" 改为 "删除后可在回收站恢复"。

### 改动 H: DiaryCard 传入 onContextMenu

```tsx
<DiaryCard
  key={item.entry.id}
  entry={item.entry}
  date={item.date}
  selected={item.entry.id === selectedId}
  onClick={() => { dispatch(setSelectedEntry(item.entry)); dispatch(setSelectedId(item.entry.id)) }}
  onContextMenu={(e) => handleContextMenu(e, item.entry)}
  last={isLast}
/>
```

### 改动 I: Infinite scroll 适配两种模式

IntersectionObserver 的回调中根据 `trashMode` 分发不同的加载更多 thunk：

```tsx
const lastRef = useCallback((node: HTMLDivElement | null) => {
  if (observerRef.current) observerRef.current.disconnect()
  if (!node) return
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (trashMode) {
        dispatch(fetchMoreTrashEntries())
      } else {
        dispatch(fetchMoreEntries())
      }
    }
  })
  observer.observe(node)
  observerRef.current = observer
}, [dispatch, loading, hasMore, trashHasMore, trashMode])
```

### 改动 J: 加载状态文案适配

```tsx
// 空状态
{sourceEntries.length === 0 && (
  <div className="text-center text-[--foreground]/40 mt-20 text-sm">
    {trashMode ? "回收站为空" : "还没有日记，点击 ✏️ 开始写第一篇吧"}
  </div>
)}
```

### 风险
- `IntersectionObserver` 的依赖项增加了 `trashHasMore` 和 `trashMode`，要确保 observer 在这些值变化时能正确重建
- 从回收站恢复条目后，`fetchEntries()` 会重新加载第 1 页，如果用户之前翻了很多页，回到第 1 页体验不佳 — 这是一个已知取舍

---

## Task 9: 前端 DiaryEditor — 回收站只读模式

**文件:** `mind-land-web/src/pages/Diary/DiaryEditor.tsx`

### 改动 A: 判断是否回收站条目

在组件顶部从 Redux 读取 `selectedEntry`，检查 `del` 字段：

```tsx
const isTrashEntry = selectedEntry?.del === true
```

### 改动 B: 隐藏编辑/阅读切换按钮

当 `isTrashEntry` 为 true 时，不显示编辑/阅读切换开关。同时强制 `editMode` 为 `false`（只读）：

```tsx
{!isTrashEntry && (
  <button onClick={handleToggleEdit}>
    {/* 现有的切换开关 */}
  </button>
)}
```

并且在 `selectedId` 变化时，如果是 trash entry，强制 `dispatch(setEditMode(false))`。

### 改动 C: 隐藏删除按钮

当 `isTrashEntry` 为 true 时，不渲染删除按钮：

```tsx
{selectedId && !isTrashEntry && (
  <button onClick={handleDelete}>
    {/* 现有的删除按钮 */}
  </button>
)}
```

### 改动 D: 内容区域只读

确保 `isTrashEntry` 时 `editor.setEditable(false)` 总是生效。现有的 `useEffect` 已经根据 `editMode` 控制可编辑性，只要确保 `editMode` 为 false 即可。

### 改动 E: Toolbar 隐藏

`Toolbar` 组件本身只在 `editMode` 为 true 时渲染（由 DiaryEditor 控制），不需要额外判断 — 因为 trash entry 时 `editMode` 必定为 false。

### 实现细节

改动集中在 DiaryEditor 的 header 区域（toggle + delete 按钮）。关键代码位置：

| 行号（大概） | 元素 | 改动 |
|---|---|---|
| 91-93 | `handleToggleEdit` | 不调用时切换已由条件渲染控制 |
| 95-104 | `handleDelete` / 删除按钮 | 用 `!isTrashEntry &&` 包裹 |
| 85-89 | `useEffect` → `setEditable` | 逻辑不变，`editMode` 已保证为 false |
| 编辑/阅读切换 | toggle 按钮 | 用 `!isTrashEntry &&` 包裹 |

---

## Task 10: 前端 Diary 主页 — 可能的微调

**文件:** `mind-land-web/src/pages/Diary/index.tsx`

### 改动（可选）

现有 `useEffect` 在 mount 时 dispatch `fetchEntries()`。当用户从回收站切回正常列表时，`setTrashMode(false)` 不会自动触发重新加载。建议在 index.tsx 中监听 `trashMode`：

```tsx
const { trashMode } = useSelector((s: RootState) => s.diary)

useEffect(() => {
  if (!trashMode) dispatch(fetchEntries())
}, [trashMode, dispatch])
```

或者直接在 `setTrashMode` reducer 中加入 `fetchEntries` 逻辑。但 reducer 是同步的，不能 dispatch thunk。最简单的方式是在 `DiaryList` 的回收站按钮点击逻辑中处理：

```tsx
onClick={() => {
  dispatch(setTrashMode(!trashMode))
  if (trashMode) {
    // 从回收站回到正常列表 → 重新加载
    dispatch(fetchEntries())
  } else {
    dispatch(fetchTrashEntries())
  }
}}
```

### 最终建议
在 DiaryList 的按钮 onClick 中管理数据加载，不需要改动 index.tsx。

---

## 交互确认汇总

| 操作 | 触发方式 | 确认方式 | 确认文案 |
|------|----------|----------|----------|
| 正常删除 | 右键菜单 | `showConfirm()` | "确定删除这篇日记？删除后可在回收站恢复。" |
| 恢复 | 右键菜单 | 无确认（直接执行） | (无) |
| 彻底删除 | 右键菜单 | `showConfirm()` | "确定永久删除？此操作不可恢复。" |
| 清空回收站 | 按钮 | `showConfirm()` | "确定清空回收站？所有条目将永久删除。" |

---

## 风险与注意事项

### 路由顺序 (Critical)
**`/entries/trash` 必须在 `entries/:id` 前注册**，否则 `trash` 字面量被 `:id` 参数匹配，导致 400 错误。Gin 的 radix tree 不支持优先级，先注册先匹配。

### 数据一致性
恢复条目后 `fetchEntries()` 重新从第 1 页加载正常列表。如果用户已翻页，会被重置到第 1 页。这是可接受的体验取舍，更精确的方案是直接插入到列表中，但涉及复杂的排序和位置计算。

### 软删除字段 `del`
`DiaryEntry.Del` 已存在，无需迁移。但注意现有 `GetEntry` 和 `UpdateEntry` 不检查 `del` 字段 — 这意味着通过 URL 直接访问软删除条目的详情是可以的。回收站的查看功能可以利用这一点（不做额外过滤，正常展示）。

### ContextMenu 边界检测
右键靠近窗口底部或右侧时，菜单可能溢出视口。建议在 ContextMenu 组件内做位置修正：`adjustedX = min(x, innerWidth - 160)`, `adjustedY = min(y, innerHeight - items.length * 40)`。

### Redux 状态膨胀
新增 6 个状态字段 + 10+ action creators。建议保持 thunk 函数的命名与已有风格一致（`fetchEntries` / `fetchTrashEntries` / `fetchMoreTrashEntries`）。

### TipTap 编辑器
回收站条目设为只读时，确保 `editor.setEditable(false)` 在所有情况下生效。特别是切换条目时，如果之前编辑器处于编辑状态，需要先设置 editable=false 再渲染。

### 无用户认证
所有接口无鉴权。任何请求可操作任何条目。这是现有架构的限制，不在本次改动范围内。

---

## 文件变更清单（汇总）

| # | 文件 | 操作 | 说明 |
|---|------|------|------|
| 1 | `mind-land-server/diary/service.go` | 改 | 新增 4 个方法 |
| 2 | `mind-land-server/diary/handler.go` | 改 | 修改 GetEntries + 新增 3 个 handler |
| 3 | `mind-land-server/main.go` | 改 | 注册 4 条路由（注意顺序） |
| 4 | `mind-land-web/src/apis/diary.ts` | 改 | 新增 4 个 API 函数 |
| 5 | `mind-land-web/src/store/modules/diaryStore.ts` | 改 | 新增 state 字段 + 5 个 thunks + 8 个 reducers |
| 6 | `mind-land-web/src/pages/Diary/ContextMenu.tsx` | **新建** | 右键菜单组件 |
| 7 | `mind-land-web/src/pages/Diary/DiaryCard.tsx` | 改 | 新增 `onContextMenu` prop |
| 8 | `mind-land-web/src/pages/Diary/DiaryList.tsx` | 改 | 回收站模式全文改 |
| 9 | `mind-land-web/src/pages/Diary/DiaryEditor.tsx` | 改 | 回收站只读 |
| 10 | `mind-land-web/src/pages/Diary/index.tsx` | 不改（或微调） | 可选 |
| 11 | `mind-land-server/diary/model.go` | 不改 | `Del` 字段已存在 |

---

## 验证清单

- [ ] `curl -X DELETE http://localhost:3100/api/diary/entries/trash` 返回 200（非 400）
- [ ] `curl -X PATCH http://localhost:3100/api/diary/entries/1/restore` 将 `del: true` 恢复为 `false`
- [ ] `curl "http://localhost:3100/api/diary/entries?trash=true"` 只返回 `del=true` 的条目
- [ ] 右键日记卡片 → 弹出上下文菜单
- [ ] 正常条目右键 → [删除] 菜单项 → 确认后条目消失
- [ ] 点击回收站按钮 → 列表切换为回收站条目
- [ ] 回收站条目右键 → [恢复] → 条目回到正常列表
- [ ] 回收站条目右键 → [彻底删除] → 确认后条目消失
- [ ] 回收站条目点击查看 → 右侧只读展示，无编辑切换和删除按钮
- [ ] 清空回收站 → 确认后所有回收站条目清空
- [ ] 右键菜单点击外部区域自动关闭
- [ ] 右键菜单靠近窗口边缘时不溢出视口
