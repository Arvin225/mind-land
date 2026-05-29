# Diary 模块 Round 3 修复计划

## 问题分析

### 1. 新建日记流程
**根因：** `handleNew` 只清空 selectedId + setEditMode(true)，不调 createEntry。右侧条件渲染 `if (!selectedEntry)` 显示"选择一篇日记"，新建后无条目选中所以永远不显示编辑器。
**修复：** `handleNew` 中直接 dispatch `createEntry("<p></p>")`，这会自动设置 selectedEntry 和 editMode。

### 2. Hover/选中无反馈
**根因：** Tailwind v4 中 `hover:bg-[--hover]` 不生效（已知 bug），需用注册的 theme class。
**修复：** 
- DiaryCard: `hover:bg-[--hover]` → `hover:bg-hover`，`bg-[--hover]` → `bg-hover`
- Toolbar 新建按钮: `hover:bg-[--hover]` → `hover:bg-hover`
- 确认 `--color-hover` 已在 Tailwind theme 中注册

### 3. 日期时间选择器
**根因：** 只渲染了 `<span>`，无 onClick 处理、无 datetime picker 组件。
**修复：** 
- 点击日期触发 `<input type="datetime-local">` 或 popover
- 选择后调 updateEntry 修改 createdAt
- 后端需要支持修改 createdAt？还是仅前端显示调整？方案：前端用 state 覆盖显示，保存时用当前时间

### 4. 滑动开关
**根因：** 当前是普通 `<button>` 切换"阅读"/"编辑"文案。
**修复：** 替换为 CSS toggle switch 组件，类似 iOS 开关，左"阅读"右"编辑"。

### 5. 切换条目响应慢
**根因：** `selectEntry` 是异步 thunk，调 `getEntryAPI(id)` 走网络请求。但其实 entries 列表中已有完整数据。
**修复：** DiaryList 点击时直接 `dispatch(setSelectedEntry(entry))` + `dispatch(setSelectedId(entry.id))`，不调异步 selectEntry。selectEntry thunk 保留给需要刷新场景用。

### 6. 保存策略
**当前：** 手动按钮 + 切换模式自动保存（已有）。
**建议：** 保持当前双保险策略。自动保存是主要方式（切换模式触发），手动按钮作为兜底。不做改动。

## 涉及文件

| 文件 | 修改 |
|---|---|
| `Diary/index.tsx` | handleNew 调 createEntry |
| `DiaryCard.tsx` | hover:bg-hover |
| `DiaryList.tsx` | hover:bg-hover；点击直接 setSelectedEntry |
| `DiaryEditor.tsx` | 日期选择器 + Toggle Switch |
| `Toolbar.tsx` | 新建按钮 hover:bg-hover |

## 优先级

| 序 | 问题 | 影响 |
|---|---|---|
| P0 | #1 新建日记 | 功能不可用 |
| P0 | #5 切换慢 | 体验差 |
| P1 | #2 hover/选中 | 视觉反馈缺失 |
| P1 | #3 日期选择器 | 功能缺失 |
| P2 | #4 滑动开关 | 视觉优化 |
| - | #6 保存策略 | 无需改动 |
