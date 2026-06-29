# 双层侧边栏架构重设计

**日期：** 2026-06-26
**范围：** mind-land-web 前端布局架构
**目标：** 将单层展开式侧边栏重构为 Rail + Module Sidebar 双层架构

---

## 1. 背景与问题

### 现状

Container 组件 (`src/pages/Container/index.tsx`) 使用单层侧边栏，宽度在 72px (折叠) 和 240px (展开) 之间切换。侧边栏同时承担两个职责：

1. **模块切换导航** — 8 个模块图标 + 文字标签
2. **ToDo 模块内导航** — 展开时显示系统列表 + 自定义列表 + 新建输入框

### 问题

| 问题 | 影响 |
|------|------|
| 角色冲突 | 侧边栏既做模块切换又做 ToDo 内部导航，展开后其他模块内容空白 |
| 折叠态信息缺失 | 72px 纯图标，无 tooltip，新用户无法识别图标含义 |
| ToDo 导航不可发现 | 必须先点 ToDo 再点展开才能看到子列表，交互路径过长 |
| 视觉层级缺失 | 8 个模块平铺，无分组标题，无法区分常用和次要 |
| 模块内导航不统一 | Note/Diary 有自己的内部侧边栏，ToDo 塞在 Container 里，SlipBox 标签树在右侧，Draft 无导航 |
| Container 代码臃肿 | 373 行，混合了模块导航、ToDo 子导航、列表管理、路由逻辑 |

### 不改的

- Home / MindMap / MarkList 仍为空占位（后续单独做）
- 搜索功能保持现状（⌘K Command Palette 后续做）
- 不做 Module Sidebar 折叠/展开（本次只做固定宽度）
- 后端无改动

---

## 2. 目标架构

```
┌───────────────────────────────────────────────────────────┐
│ Rail (56px)  │  Module Sidebar  │     Content              │
│              │  (可选, 各模块自定义)│                        │
│ ✨ Home       │                  │                        │
│ ✓ 待办       │  ← 各模块自定义    │     Outlet              │
│ 📝 稿纸       │     200-280px    │                        │
│ 🔀 脑图       │                  │                        │
│ 📇 卡片笔记   │                  │                        │
│ 📖 日记       │                  │                        │
│ 📋 大纲笔记   │                  │                        │
│ ✂ 剪藏       │                  │                        │
│              │                  │                        │
│ ⚙ 设置       │                  │                        │
└───────────────────────────────────────────────────────────┘
```

### 三层结构

1. **Rail（一级导航轨）** — 56px (`w-14`)，纯图标，永远常驻
2. **Module Sidebar（二级面板）** — 各模块自定义，200-280px，按需显示
3. **Content（主内容区）** — `flex-1`，渲染 `<Outlet />`

---

## 3. 各层详细规格

### 3.1 Rail（一级导航轨）

**容器：** `Container/index.tsx` 重构

| 属性 | 规格 |
|------|------|
| 宽度 | 56px (`w-14`)，`shrink-0`，固定不变 |
| 背景 | `surface-card`（保持现有） |
| 布局 | `flex flex-col items-center` |

**内容（从上到下）：**

```
┌────┐
│ ✨ │  Logo（Sparkles 图标，20px，accent 色）
├────┤  ← 8px gap
│ 🏠 │  Home
│ ✓  │  待办
│ 📝 │  稿纸
│ 🔀 │  脑图
│ 📇 │  卡片笔记
│ 📖 │  日记
│ 📋 │  大纲笔记
│ ✂  │  剪藏
├────┤  ← flex-1 spacer
│ ⚙  │  设置（底部）
└────┘
```

**导航项属性：**

- 图标 18px，`mx-auto`
- 每项 `w-10 h-10 rounded-xl flex items-center justify-center`
- 活跃态：`text-accent` + 左侧 3px 金色竖线 (`absolute left-0 w-[3px] h-5 rounded-r bg-accent`)
- 非活跃态：`text-[--foreground]/55 hover:text-foreground hover:bg-hover`
- **Tooltip：** 每个按钮加 `title={item.label}` 属性，浏览器原生 tooltip
- 分组间距：Group 1 (Home) → Group 2 (待办/稿纸/脑图) → Group 3 (卡片笔记/日记/大纲笔记) → Group 4 (剪藏)，组间 `mt-4`

**设置按钮：** 移到 Rail 底部，`mt-auto`，触发 SettingsModal

**删除的逻辑：**
- `expanded` / `pinned` state
- 宽度切换动画 (`transition-[width] duration-[600ms]`)
- 底部展开/收起按钮 (ChevronLeft/Right)
- ToDo 子导航 (`todoExpanded`, `todoSystemLists`, `toDoLists` 渲染, 自定义列表 input)
- `addToDoListName` 函数
- `loadingToDoLists` selector
- `fetchGetToDoLists` dispatch

**保留的逻辑：**
- 路由导航 (`handleNav`)
- `activeKeyFromPath` / `topKeyFromPath`
- `contentVisible` 路由切换过渡动画
- `settingsOpen` state + SettingsModal
- `searchOpen` state + 搜索按钮（暂保留在 header）

### 3.2 Module Sidebar（二级面板）

各模块自行决定是否显示二级面板及内容：

| 模块 | 有 Sidebar? | 宽度 | 组件 | 内容 |
|------|:---:|------|------|------|
| Home | ❌ | — | — | Content 全宽 |
| ToDo | ✅ | 220px | `ToDoSidebar` (新建) | 系统列表 + 自定义列表 + 新建列表输入 |
| Draft | ✅ | 220px | `DraftSidebar` (新建) | 稿纸列表 + 新建按钮 |
| MindMap | ❌ | — | — | Content 全宽 |
| SlipBox | ✅ | 240px | `RightSider` (迁移到左侧) | 标签树 |
| Diary | ✅ | 360px | `DiaryList` (不变) | 日记列表 |
| Note | ✅ | 280px | `FolderTreePanel` (不变) | 文件夹树 |
| MarkList | ❌ | — | — | Content 全宽 |

**通用规范：**
- `shrink-0`，`border-r border-[--border]`
- `h-full flex flex-col`
- 顶部固定区域（标题/搜索/新建按钮）+ `flex-1 overflow-y-auto` 滚动区
- 滚动条隐藏 (`scrollbar-auto-hide` 或 Tailwind `scrollbar-width: none`)

### 3.3 Content（主内容区）

- `flex-1 min-w-0`
- 保留现有 Container 的 header（模块标题 + 搜索 + 新建 + 设置快捷按钮）
- 保留 `contentVisible` 过渡动画
- 无 Sidebar 的模块 → Content 占满 Rail 右侧所有空间
- 有 Sidebar 的模块 → Rail | Sidebar | Content 三栏 flex

---

## 4. 各模块改造规格

### 4.1 ToDo Module Sidebar

**新文件：** `src/pages/ToDo/ToDoSidebar.tsx`

**内容：**
```
┌──────────────────┐
│ 待办          ✚  │  ← 标题行
├──────────────────┤
│ 全部             │  ← 系统列表（全部/星标/已完成/回收站）
│ ★ 星标           │
│ ✓ 已完成         │
│ 🗑 回收站         │
├──────────────────┤  ← 分隔线
│ 我的列表         │  ← 自定义列表标题
│   日常           │  ← 各自定义列表（可点击 navigate）
│   项目A          │
│   ...           │
├──────────────────┤
│ + 新增列表…      │  ← 输入框
└──────────────────┘
```

**交互：**
- 点击列表项 → `navigate('/todo/${key}')`，不再 toggle 展开
- 选中态：`bg-accent/10 text-accent`，与 Container 原有逻辑一致
- 新增列表：Enter 提交，复用 `postToDoListAPI` + `fetchGetToDoLists`
- 系统列表图标 14px，自定义列表项无图标（或用 `List` 图标）

**数据来源：**
- `toDoLists` → 从 Redux store 获取
- `loadingToDoLists` → 从 Redux store 获取
- 列表管理逻辑从 Container 迁移

**ToDo/index.tsx 改造：**
```tsx
return (
  <div className="h-full flex">
    <ToDoSidebar />
    <div className="flex-1 flex flex-col min-w-0">
      {/* 原有的 ToDo 内容 */}
    </div>
  </div>
);
```

### 4.2 Draft 双栏改造

**新文件：** 暂不新建，改造 `DraftList.tsx` → `DraftSidebar.tsx`

**内容：**
```
┌──────────────────┐
│ 稿纸          ✚  │  ← 标题行 + 新建按钮
├──────────────────┤
│ 日常笔记   6/26  │  ← 各稿纸项（标题 + 日期）
│ 项目记录   6/25  │
│ ...             │
└──────────────────┘
```

**交互：**
- 点击稿纸项 → `navigate('/draft/${id}')`
- 选中态：`bg-accent/10 text-accent`
- 三点菜单（重命名/删除）保留
- 新建稿纸 → `createDraftAction` + navigate

**Draft/index.tsx 改造：**

从条件渲染切换为常驻双栏：
```tsx
export default function Draft() {
  const { id } = useParams();
  return (
    <div className="h-full flex">
      <DraftSidebar />
      <div className="flex-1 h-full min-w-0">
        {id ? <DraftEditor docId={Number(id)} /> : <DraftEmpty />}
      </div>
    </div>
  );
}
```

- 无选中稿纸时右侧显示空态提示
- `DraftSidebar` 始终可见，不再全屏切换

### 4.3 SlipBox 标签树迁移

**改动：** `SlipBox/index.tsx` 布局调整

从 `右标签树 | 左编辑器+卡片` → `左标签树 | 右编辑器+卡片`

```tsx
return (
  <div className="flex gap-5 h-full">
    {/* 左侧标签树 - 240px */}
    <div className="w-[240px] shrink-0 flex flex-col">
      <RightSider treeData={tagTrees} onSelect={handleTagSelected} selectedKey={selectedKey} />
    </div>
    {/* 右侧主区域 */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* PathBar + SortMenu + SearchBar */}
      {/* SlipEditor + CardList */}
    </div>
  </div>
);
```

- `RightSider` 组件内部不变，只改位置
- 去掉原来的 `pt-[56px]` 顶部对齐偏移（不再需要和右侧编辑器顶部对齐）
- 标签树面板加 `border-r border-[--border]`

### 4.4 Diary / Note（无改动）

- Diary 已有 360px 左侧 DiaryList，天然符合二级面板，不需要改动
- Note 已有 280px 左侧 FolderTreePanel，天然符合二级面板，不需要改动
- 两侧组件已在各自 `index.tsx` 内部定义布局，Container 不需要修改

### 4.5 无 Sidebar 模块（Home / MindMap / MarkList）

- 不显示 Module Sidebar
- Content 直接从 Rail 右侧开始，占满剩余空间
- 保持现有空占位内容不变

---

## 5. Container 重构规格

### 5.1 新布局骨架

```tsx
return (
  <div className="h-screen w-screen bg-[--background] flex overflow-hidden font-sans">
    {/* RAIL — 56px 一级导航 */}
    <aside className="relative z-30 flex flex-col items-center w-14 shrink-0">
      <div className="absolute inset-0 surface-card" />
      <div className="relative flex flex-col items-center h-full py-3">
        {/* Logo */}
        <div className="w-10 h-10 flex items-center justify-center mb-2 shrink-0">
          <Sparkles className="w-5 h-5 text-accent shrink-0" />
        </div>
        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center w-full">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.items.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  title={item.label}
                  className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300"
                >
                  {/* Active indicator */}
                  {/* Icon */}
                  <item.icon className="w-[18px] h-[18px]" />
                </button>
              ))}
            </div>
          ))}
        </nav>
        {/* Settings */}
        <button onClick={() => setSettingsOpen(true)} title="设置" className="w-10 h-10 ...">
          <Settings className="w-[18px] h-[18px]" />
        </button>
      </div>
    </aside>

    {/* MAIN — header + content */}
    <main className="flex-1 flex flex-col min-w-0 bg-[--background]">
      <header>...</header>
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div style={{ opacity, transform }} className="h-full">
          <Outlet />
        </div>
      </div>
    </main>

    <SettingsModal ... />
  </div>
);
```

### 5.2 删除项清单

| 删除 | 原因 |
|------|------|
| `expanded` / `pinned` state | Rail 固定 56px，不再展开 |
| `todoExpanded` state | ToDo 导航迁移到 ToDoSidebar |
| `inputValue` state | 新建列表输入迁移到 ToDoSidebar |
| `addToDoListName` 函数 | 迁移到 ToDoSidebar |
| `loadingToDoLists` selector | 迁移到 ToDoSidebar |
| `toDoLists` selector | 迁移到 ToDoSidebar |
| `fetchGetToDoLists` dispatch | 迁移到 ToDoSidebar |
| `handleTodoSubNav` 函数 | ToDoSidebar 自己 navigate |
| 宽度切换 style (`width: expanded ? 240 : 72`) | 固定 `w-14` |
| 底部展开/收起按钮 | 不再需要 |
| `ChevronLeft` / `ChevronRight` import | 不再需要 |
| 分组 label 的 `whitespace-nowrap` + opacity 动画 | Rail 纯图标，无文字 |

### 5.3 保留项清单

| 保留 | 说明 |
|------|------|
| `location` / `navigate` | 路由导航 |
| `activeKeyFromPath` / `topKeyFromPath` | 确定 active 模块 |
| `contentVisible` + useEffect | 路由切换过渡 |
| `searchOpen` + 搜索按钮 | 保留在 header |
| `settingsOpen` + SettingsModal | 移到 Rail 底部触发 |
| `moduleTitle` | 保留在 header 显示 |
| `toast` | 复用在 SettingsModal 等 |

---

## 6. 组件文件变更总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/Container/index.tsx` | 重构 | 单层 → Rail，删除 expanded/ToDo 子导航 |
| `src/pages/ToDo/ToDoSidebar.tsx` | 新建 | ToDo 模块内导航侧边栏 |
| `src/pages/ToDo/index.tsx` | 修改 | 加 `<ToDoSidebar />` 双栏布局 |
| `src/pages/Draft/DraftSidebar.tsx` | 新建 | 从 DraftList 改造为侧边栏 |
| `src/pages/Draft/DraftList.tsx` | 废弃 | 逻辑迁移到 DraftSidebar |
| `src/pages/Draft/index.tsx` | 修改 | 常驻双栏，不再条件切换 |
| `src/pages/SlipBox/index.tsx` | 修改 | RightSider 从右侧移到左侧 |

**不变的文件：**
- `src/pages/Diary/*` — 已符合架构
- `src/pages/Note/*` — 已符合架构
- `src/pages/Home/*` — 无 Sidebar
- `src/pages/MindMap/*` — 无 Sidebar
- `src/pages/MarkList/*` — 无 Sidebar
- `src/router/index.tsx` — 路由不变
- `src/store/*` — Redux store 不变
- 后端 — 不变

---

## 7. 视觉规范

### 7.1 Rail 导航项

```tsx
// 活跃态
"text-accent"

// 活跃指示线（左侧竖线）
"absolute left-0 w-[3px] h-5 rounded-r-full bg-accent"

// 非活跃态
"text-[--foreground]/55 hover:text-foreground hover:bg-hover"

// 容器
"w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 relative"
```

### 7.2 Module Sidebar 通用

```tsx
// 外层
"w-[220px] shrink-0 border-r border-[--border] h-full flex flex-col"

// 顶部标题区
"flex items-center justify-between px-4 py-3 shrink-0"

// 滚动区
"flex-1 overflow-y-auto px-2 py-1"

// 列表项（选中）
"bg-accent/10 text-accent"

// 列表项（未选中）
"text-text-secondary hover:bg-hover hover:text-text-primary hover:rounded-lg transition-colors"
```

### 7.3 tooltip

使用 HTML 原生 `title` 属性，不引入第三方 tooltip 库。浏览器会在 hover ~1s 后显示 tooltip。Rail 中每个图标按钮必须加 `title`。

---

## 8. 风险与注意事项

| 风险 | 缓解 |
|------|------|
| ToDo 导航从 Container 迁出到 ToDoSidebar 可能丢失选中态 | 选中态基于路由 path 计算，与 Container 原逻辑一致 |
| Draft 从全屏切换改为双栏可能影响编辑器布局 | DraftEditor 自身 `h-full`，双栏不影响 |
| SlipBox 标签树移位可能影响 tag tree 内部交互 | 只改外层 flex 顺序，RightSider 内部不变 |
| Container header 中的"新建"按钮逻辑依赖当前模块 | 保留现有逻辑不变，新建按钮根据 `topKey` 分发 |
| Tailwind CSS 变量在 overlay 上的已知问题 | Module Sidebar 非 overlay，`bg-surface` 安全 |