# 双层侧边栏 — 任务拆分

**日期：** 2026-06-26
**关联设计：** [双层侧边栏架构重设计](./dual-sidebar-redesign.md)

---

## 任务总览

```
T01 Container Rail 重构               ──┐
T02 ToDoSidebar 新建 + 迁移             ├── Phase 1: Container + ToDo
T03 ToDo/index.tsx 双栏适配             │
T04 Draft Sidebar 改造                  ──┐
T05 Draft/index.tsx 常驻双栏             ├── Phase 2: Draft
T06 SlipBox 标签树迁移到左侧             ├── Phase 3: SlipBox
T07 Home/MindMap 全宽验证               │
T08 npx tsc 编译检查                    ──┐
T09 服务启动 + 路由冒烟测试              ├── Phase 4: 验证
T10 Playwright 逐模块截图对比           │
T11 回归测试（导航 + 选中态 + 布局）     ──┘
```

**依赖关系：**
- T01 → T02 → T03（顺序执行，Phase 1）
- T04 → T05（顺序执行，Phase 2）
- T06 独立
- T07 独立（验证无 Sidebar 模块不被 Rail 影响宽度）
- T01-T07 → T08 → T09 → T10 → T11（所有改造完成后统一验证）

---

## Phase 1 — Container Rail + ToDo 迁移

### T01 — Container Rail 重构

**阶段：** 1 | **依赖：** 无 | **预估：** 中

#### 输入

- 现有 Container: `src/pages/Container/index.tsx`（373 行）
- 设计文档: `docs/dual-sidebar-redesign.md` 第 3.1 节 + 第 5 节

#### 任务

1. 删除 `expanded` / `pinned` state 及相关逻辑
2. `<aside>` 宽度固定 `w-14` (56px)，删除 `style={{ width, minWidth }}` 和 `transition-[width]` 动画
3. `<aside>` 改为 `flex flex-col items-center`
4. Logo 区：只保留 `Sparkles` 图标 (20px)，删除 "Mind Land" 文字和 opacity 动画
5. 导航项：删除 `span` 文字标签及其 opacity/translate 动画，只保留图标
6. 每个导航按钮加 `title={item.label}` 属性
7. 活跃态：`text-accent` + `relative` 容器，加左侧 3px 金色竖线 `<div className="absolute left-0 w-[3px] h-5 rounded-r-full bg-accent" />`
8. 非活跃态：`text-[--foreground]/55 hover:text-foreground hover:bg-hover`
9. 删除 ToDo 子导航的全部渲染逻辑（`todoExpanded`、`todoSystemLists`、`toDoLists` map、`inputValue` 输入框）
10. 删除 `handleTodoSubNav` 函数
11. 删除底部展开/收起按钮 (`ChevronLeft`/`ChevronRight`) 及其 `pinned` toggle 逻辑
12. 设置按钮从 header 迁移到 Rail 底部 (`mt-auto`)，保留 `onClick={() => setSettingsOpen(true)}`
13. 删除不再需要的 import: `ChevronLeft`, `ChevronRight`, `ChevronDown`, `List`, `Star`, `CheckSquare`, `Trash2`, `Plus` (如果 header 不用)
14. 保留: `location`, `navigate`, `activeKeyFromPath`, `topKeyFromPath`, `contentVisible`, `searchOpen`, `settingsOpen`, `moduleTitle`, `SettingsModal`

#### 删除的 state / 逻辑

- `expanded`, `pinned`
- `todoExpanded`, `inputValue`
- `loadingToDoLists` selector
- `toDoLists` selector
- `fetchGetToDoLists` dispatch + useEffect
- `addToDoListName` 函数
- `handleTodoSubNav` 函数
- `postToDoListAPI` import
- `ListItem` import + 渲染

#### 保留的 header

header 中的搜索按钮和新建按钮保持不变。header 的 `moduleTitle` 保持不变。

设置按钮从 header 移除（迁移到 Rail 底部），但保留 `settingsOpen` state + `SettingsModal` 渲染。

#### 新 Container 结构骨架

```tsx
<div className="h-screen w-screen bg-[--background] flex overflow-hidden font-sans">
  {/* RAIL 56px */}
  <aside className="relative z-30 flex flex-col items-center w-14 shrink-0">
    <div className="absolute inset-0 surface-card" />
    <div className="relative flex flex-col items-center h-full py-3 w-full">
      {/* Logo */}
      <Sparkles className="w-5 h-5 text-accent mb-2 shrink-0" />
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center w-full">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.items.map(item => (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                title={item.label}
                className={[
                  'relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300',
                  isTopActive ? 'text-accent' : 'text-[--foreground]/55 hover:text-foreground hover:bg-hover',
                ].join(' ')}
              >
                {isTopActive && <div className="absolute left-0 w-[3px] h-5 rounded-r-full bg-accent" />}
                <item.icon className="w-[18px] h-[18px]" strokeWidth={isTopActive ? 2.2 : 1.8} />
              </button>
            ))}
          </div>
        ))}
      </nav>
      {/* Settings */}
      <button
        onClick={() => setSettingsOpen(true)}
        title="设置"
        className="w-10 h-10 flex items-center justify-center rounded-xl text-[--foreground]/55 hover:text-foreground hover:bg-hover transition-all duration-300 mt-auto"
      >
        <Settings className="w-[18px] h-[18px]" />
      </button>
    </div>
  </aside>

  {/* MAIN */}
  <main className="flex-1 flex flex-col min-w-0 bg-[--background]">
    <header className="flex items-center justify-between px-6 h-14 shrink-0">
      <h1 className="font-serif-display text-[--foreground] text-xl tracking-wide">{moduleTitle}</h1>
      <div className="flex items-center gap-2">
        {/* 搜索按钮 — 保留 */}
        {/* 新建按钮 — 保留 */}
      </div>
    </header>
    <div className="flex-1 overflow-hidden px-6 pb-6">
      <div style={{ opacity: contentVisible ? 1 : 0, transform: contentVisible ? 'translateY(0)' : 'translateY(8px)' }} className="h-full transition-all duration-250 ease-out">
        <Outlet />
      </div>
    </div>
  </main>

  <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
</div>
```

#### 验收标准

- [ ] Container 编译通过 (`npx tsc -p tsconfig.app.json --noEmit`)
- [ ] Rail 宽度 56px，纯图标，无误
- [ ] 所有导航图标有 `title` tooltip
- [ ] 活跃模块图标为 accent 色 + 左侧金色竖线
- [ ] SettingsModal 正常从 Rail 底部按钮打开
- [ ] header 搜索按钮和新建按钮正常
- [ ] 无未使用的 import

---

### T02 — ToDoSidebar 新建

**阶段：** 1 | **依赖：** T01 | **预估：** 中

#### 输入

- 迁移来源: Container 中的 ToDo 子导航逻辑 (lines 64-69, 91-136, 228-286)
- API: `postToDoListAPI` from `@/apis/layout`
- Store: `fetchGetToDoLists` from `@/store/modules/toDoStore`, `toDoLists` + `loadingToDoLists` from Redux
- 设计文档: `docs/dual-sidebar-redesign.md` 第 4.1 节

#### 任务

1. 新建 `src/pages/ToDo/ToDoSidebar.tsx`
2. 导入: `useAppDispatch`, `useAppSelector`, `useState`, `useEffect`, `useNavigate`, `useLocation`, lucide 图标 (`List`, `Star`, `CheckSquare`, `Trash2`, `Plus`)
3. 从 Redux 获取 `toDoLists` + `loadingToDoLists`
4. `useEffect` 调用 `dispatch(fetchGetToDoLists())`
5. 系统列表定义：
   ```ts
   const systemLists = [
     { key: 'todo/all', label: '全部', icon: List },
     { key: 'todo/star', label: '星标', icon: Star },
     { key: 'todo/done', label: '已完成', icon: CheckSquare },
     { key: 'todo/bin', label: '回收站', icon: Trash2 },
   ];
   ```
6. 通过 `useLocation` 获取当前路径计算 `activeKey`（复用 Container 的 `activeKeyFromPath` 逻辑）
7. 新增列表输入框: `inputValue` state + `addToDoListName` 函数（迁移自 Container）
8. 布局：
   ```tsx
   <div className="w-[220px] shrink-0 border-r border-[--border] h-full flex flex-col">
     {/* 标题 */}
     <div className="flex items-center justify-between px-4 py-3 shrink-0">
       <span className="text-sm font-medium text-text-secondary">待办</span>
     </div>
     {/* 系统列表 */}
     <nav className="px-3 py-1 space-y-0.5">
       {systemLists.map(...)}
     </nav>
     {/* 分隔线 */}
     <div className="border-t border-[--border] mx-3 my-2" />
     {/* 自定义列表标题 */}
     <div className="px-4 py-1 shrink-0">
       <span className="text-xs text-[--foreground]/40">我的列表</span>
     </div>
     {/* 自定义列表 */}
     <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
       {toDoLists.map(...)}
     </div>
     {/* 新增列表输入 */}
     <div className="px-3 py-2 shrink-0 border-t border-[--border]">
       <input placeholder="新增列表…" ... />
     </div>
   </div>
   ```
9. 系统列表项点击 → `navigate('/${item.key}')`（与 Container 原逻辑一致）
10. 自定义列表项点击 → `navigate('/todo/${item.id}')`
11. 选中态样式：`bg-accent/10 text-accent`（系统列表和自定义列表统一）
12. 非选中态：`text-[--foreground]/50 hover:text-foreground/80 hover:bg-hover rounded-lg`
13. `useToast` 复用（新建列表成功/失败 toast）

#### newListSelected 逻辑

从 Container 迁移 `addToDoListName`:
```tsx
const addToDoListName = async (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter') return;
  e.stopPropagation();
  if (!inputValue.trim()) return;
  const { code, message } = await postToDoListAPI(inputValue);
  if (code === -1) { toast.error(message); return; }
  dispatch(fetchGetToDoLists());
  setInputValue('');
  toast.success('列表已创建');
};
```

#### 验收标准

- [ ] `ToDoSidebar` 编译通过
- [ ] 系统列表 4 项渲染正确，图标+文字
- [ ] 自定义列表从 Redux 获取并渲染
- [ ] 新增列表输入 → Enter → API 调用 → 列表刷新 → toast
- [ ] 选中态基于路由 path 正确高亮
- [ ] 无未使用的 import

---

### T03 — ToDo/index.tsx 双栏适配

**阶段：** 1 | **依赖：** T02 | **预估：** 小

#### 输入

- 现有 ToDo: `src/pages/ToDo/index.tsx`（216 行）
- 新组件: `ToDoSidebar`

#### 任务

1. import `ToDoSidebar`
2. 在 return 外层包裹双栏布局：
   ```tsx
   return (
     <div className="h-full flex">
       <ToDoSidebar />
       <div className="flex-1 flex flex-col min-w-0">
         {/* 原有全部内容 */}
       </div>
     </div>
   );
   ```
3. 原有的 `<div className="flex flex-col h-full max-w-3xl mx-auto">` 保持不变，作为右侧 content
4. 不改动任何 ToDoItem、拖拽、排序逻辑

#### 验收标准

- [ ] ToDo 页面显示左侧 ToDoSidebar + 右侧任务列表
- [ ] 切换列表（全部/星标/自定义）路由正常
- [ ] 新增/完成任务功能不受影响
- [ ] 拖拽排序正常

---

## Phase 2 — Draft 双栏改造

### T04 — Draft Sidebar 改造

**阶段：** 2 | **依赖：** T01（Container 不再全宽展开） | **预估：** 中

#### 输入

- 现有 DraftList: `src/pages/Draft/DraftList.tsx`（197 行）
- 设计文档: `docs/dual-sidebar-redesign.md` 第 4.2 节

#### 任务

1. 将 `DraftList.tsx` 重命名/改造为 `DraftSidebar.tsx`（新文件，原文件后续删除）
2. 新建 `src/pages/Draft/DraftSidebar.tsx`，从 `DraftList.tsx` 迁移全部逻辑
3. 布局改为侧边栏样式：
   ```tsx
   <div className="w-[220px] shrink-0 border-r border-[--border] h-full flex flex-col">
     {/* 标题行 */}
     <div className="flex items-center justify-between px-4 py-3 shrink-0">
       <span className="text-sm font-medium text-text-secondary">稿纸</span>
       <button onClick={handleCreate} className="p-1 rounded-lg hover:bg-hover ...">
         <Plus className="w-4 h-4" />
       </button>
     </div>
     {/* 列表滚动区 */}
     <div className="flex-1 overflow-y-auto py-1">
       {list.length === 0 ? (
         /* 空态简化版（不显示 Coming soon，只显示空列表） */
       ) : (
         <ul className="px-2 space-y-0.5">
           {list.map(d => (
             <li key={d.id} className="relative rounded-lg hover:bg-hover transition-colors group">
               <button onClick={() => navigate(`/draft/${d.id}`)} className="w-full text-left px-3 py-2 rounded-lg">
                 <div className="text-sm font-medium text-text-primary truncate">{d.title || "无标题"}</div>
                 <div className="text-xs text-text-muted truncate">{formatDate(d.updatedAt)}</div>
               </button>
               {/* 三点菜单保留 */}
             </li>
           ))}
         </ul>
       )}
     </div>
   </div>
   ```
4. 保留: `createDraftAction`、`removeDraftAction`、`fetchDraftListAction`、三点菜单（重命名/删除）、删除确认对话框
5. 选中态：当前 `useParams().id` === `d.id` → `bg-accent/10 text-accent`
6. 日期格式简化：每行显示标题（1 行 truncate）+ 日期（1 行），不显示 preview
7. 空态列表不显示"开始第一篇"按钮（按钮在标题行的 + 已有），只居中显示"还没有稿纸"

#### 验收标准

- [ ] `DraftSidebar` 编译通过
- [ ] 稿纸列表正常渲染
- [ ] 新建稿纸 → navigate 到 `/draft/${id}`
- [ ] 重命名/删除三点菜单正常
- [ ] 删除确认对话框正常
- [ ] 选中态基于路由 `id` 高亮

---

### T05 — Draft/index.tsx 常驻双栏

**阶段：** 2 | **依赖：** T04 | **预估：** 小

#### 输入

- 现有 Draft: `src/pages/Draft/index.tsx`（10 行）
- 新组件: `DraftSidebar`

#### 任务

1. import `DraftSidebar` 和 `DraftEditor`
2. 改为常驻双栏：
   ```tsx
   export default function Draft() {
     const { id } = useParams();
     return (
       <div className="h-full flex">
         <DraftSidebar />
         <div className="flex-1 h-full min-w-0">
           {id ? <DraftEditor docId={Number(id)} /> : <div className="h-full flex items-center justify-center text-text-muted">选择或新建一篇稿纸</div>}
         </div>
       </div>
     );
   }
   ```
3. 无选中稿纸时右侧显示空态提示
4. 删除原 `DraftList` import（已改为 `DraftSidebar`）

#### 验收标准

- [ ] Draft 页面始终显示左侧列表 + 右侧编辑器/空态
- [ ] 切换稿纸路由正常
- [ ] 新建稿纸右侧切换到编辑器
- [ ] 编辑器布局不受影响

---

## Phase 3 — SlipBox 标签树迁移

### T06 — SlipBox 标签树从右侧移到左侧

**阶段：** 3 | **依赖：** T01 | **预估：** 小

#### 输入

- 现有 SlipBox: `src/pages/SlipBox/index.tsx`（264 行）
- RightSider 组件: `src/pages/SlipBox/components/RightSider.tsx`
- 设计文档: `docs/dual-sidebar-redesign.md` 第 4.3 节

#### 任务

1. 调整 `SlipBox/index.tsx` 的 return 布局

从：
```tsx
<div className="flex gap-5 h-full">
  <div className="flex-1 flex flex-col min-w-0">  {/* 主区域 */}
  ...
  </div>
  <div className="w-[260px] flex flex-col pt-[56px]">  {/* 右标签树 */}
    <RightSider ... />
  </div>
</div>
```

改为：
```tsx
<div className="flex h-full">
  {/* 左侧标签树 240px */}
  <div className="w-[240px] shrink-0 flex flex-col border-r border-[--border]">
    <RightSider treeData={tagTrees} onSelect={handleTagSelected} selectedKey={selectedKey} />
  </div>
  {/* 右侧主区域 */}
  <div className="flex-1 flex flex-col min-w-0 px-6 pb-6">
    {/* PathBar + SortMenu + SearchBar */}
    {/* SlipEditor + CardList */}
  </div>
</div>
```

2. 去掉 `pt-[56px]`（不再需要和右侧编辑器顶部对齐）
3. 去掉 `gap-5`（改为 border-r 分隔）
4. 右侧主区域加 `px-6` 替代原来的 gap 间距
5. `RightSider` 组件内部不改
6. 标签树选中/点击逻辑不变

#### 验收标准

- [ ] 标签树在左侧 240px 显示
- [ ] 点击标签 → 卡片列表过滤正常
- [ ] PathBar + SortMenu + SearchBar 在右侧正确显示
- [ ] SlipEditor + CardList 在右侧正确显示
- [ ] 标签树竖向滚动正常

---

## Phase 3.5 — 无 Sidebar 模块验证

### T07 — Home / MindMap / MarkList 全宽验证

**阶段：** 3.5 | **依赖：** T01 | **预估：** 小（验证为主，可能无需改动）

#### 输入

- Home: `src/pages/Home/index.tsx`（17 行空占位）
- MindMap: `src/pages/MindMap/index.tsx`（67 行）
- MarkList: `src/pages/MarkList/index.tsx`（17 行空占位）

#### 任务

1. 访问 `/` — 验证 Home 占满 Rail 右侧全部空间
2. 访问 `/mindmap` — 验证 MindMap 全宽显示
3. 访问 `/marklist` — 验证 MarkList 全宽显示
4. 如果任一页面有固定宽度约束导致 layout 问题，调整 `w-full` / `h-full`
5. 不改组件内容，只看布局

#### 验收标准

- [ ] Home 全宽居中显示空占位
- [ ] MindMap 全宽显示脑图或空态
- [ ] MarkList 全宽显示空占位
- [ ] 无多余空白或横向滚动条

---

## Phase 4 — 验证

### T08 — TypeScript 编译检查

**阶段：** 4 | **依赖：** T01-T07 全部完成 | **预估：** 小

#### 任务

```bash
cd /root/mind-land/mind-land-web
npx tsc -p tsconfig.app.json --noEmit
```

#### 验收标准

- [ ] 零 TypeScript 错误
- [ ] 无未使用 import 警告（如果有则清理）

---

### T09 — 服务启动 + 路由冒烟测试

**阶段：** 4 | **依赖：** T08 | **预估：** 小

#### 前提

- 前端 :3000 和后端 :3100 在运行
- 如果未运行：先 build Go 后端 → start server → start vite dev

#### 任务

1. `curl -s http://localhost:3100/api/diary/entries | head -50` — 后端正常
2. `curl -s http://localhost:3000/ | head -20` — 前端正常
3. 逐路由访问（通过浏览器或 curl）:
   - `/` Home
   - `/todo/all` ToDo
   - `/draft` Draft
   - `/mindmap` MindMap
   - `/slipbox` SlipBox
   - `/diary` Diary
   - `/note` Note
   - `/marklist` MarkList

#### 验收标准

- [ ] 所有路由返回 200（无白屏、无 JS 报错）
- [ ] 浏览器 console 无报错

---

### T10 — Playwright 逐模块截图对比

**阶段：** 4 | **依赖：** T09 | **预估：** 中

#### 任务

通过 Playwright 逐模块导航 + 截图，验证布局：

1. 导航到 `/` → 截图 → 验证 Rail 56px + Home 全宽
2. 导航到 `/todo/all` → 截图 → 验证 Rail + ToDoSidebar 220px + 任务列表
3. 导航到 `/draft` → 截图 → 验证 Rail + DraftSidebar 220px + 空态
4. 创建稿纸 → 截图 → 验证编辑器显示
5. 导航到 `/slipbox` → 截图 → 验证 标签树在左侧 240px
6. 导航到 `/diary` → 截图 → 验证 DiaryList 360px 左侧
7. 导航到 `/note` → 截图 → 验证 FolderTreePanel 280px 左侧
8. 导航到 `/mindmap` → 截图 → 验证全宽
9. 导航到 `/marklist` → 截图 → 验证全宽
10. hover Rail 各图标 → 验证 tooltip 出现

#### 测量点

每个截图后用 `getBoundingClientRect` 确认:
- Rail: width === 56
- ToDoSidebar: width === 220
- DraftSidebar: width === 220
- SlipBox 标签树: width === 240
- DiaryList: width === 360
- FolderTreePanel: width === 280

#### 验收标准

- [ ] 10 个截图全部捕获
- [ ] Rail 宽度 56px
- [ ] 各模块 Sidebar 宽度正确
- [ ] tooltip 在 hover 后出现
- [ ] 无 console 报错

---

### T11 — 回归测试（导航 + 选中态 + 布局）

**阶段：** 4 | **依赖：** T10 | **预估：** 中

#### 任务

1. **模块切换导航**
   - 点击 Rail 8 个图标 → 验证每个导航到正确路由
   - 验证活跃图标高亮（accent 色 + 左侧竖线）

2. **ToDo 导航回归**
   - 点击「全部」「星标」「已完成」「回收站」→ 验证路由切换 + 选中态
   - 新增自定义列表 → 验证列表创建 + navigate
   - 切换自定义列表 → 验证任务列表更新

3. **Draft 导航回归**
   - 新建稿纸 → 验证列表新增 + 编辑器打开
   - 在列表切换稿纸 → 验证编辑器内容切换
   - 重命名 → 验证列表更新
   - 删除 → 验证确认对话框 + 列表更新

4. **SlipBox 标签树回归**
   - 点击标签 → 验证卡片列表过滤
   - 嵌套标签展开/折叠
   - 排序菜单
   - 搜索

5. **Diary / Note 回归**
   - 日记列表 → 编辑器切换
   - 大纲文件夹树 → 文档 → 编辑器
   - 确认这两个模块未受 Container 改造影响

6. **Container header**
   - 搜索按钮点击 → searchOpen toggle
   - 新建按钮 → 根据模块执行对应操作
   - SettingsModal 从 Rail 底部打开

#### 验收标准

- [ ] 所有导航路径正确
- [ ] 选中态在路由切换后正确更新
- [ ] ToDo 新增/切换列表正常
- [ ] Draft 新增/切换/重命名/删除正常
- [ ] SlipBox 标签过滤正常
- [ ] Diary / Note 不受影响
- [ ] SettingsModal 正常打开
- [ ] 无回归问题

---

## 执行策略

### 3-Agent 循环

遵循 mind-land skill 的标准工作流：

```
Generator (opencode run -m opencode-go/deepseek-v4-flash --thinking)
  → 执行任务
Evaluator (opencode run -m opencode-go/deepseek-v4-pro --thinking)
  → 运行 tsc + Playwright 截图验证
  → FAIL → 反馈 Generator → 再跑
  → PASS → 下一个任务
```

### 任务合并建议

- T04 + T05 可以合并为一个 Generator 调用（Draft Sidebar + index 改造同一文件层）
- T08 + T09 可以合并为一次验证
- T10 + T11 可以合并为一次 Evaluator 调用

### 指定任务 prompt 模板

每个任务 prompt 应包含：
```
你正在执行任务 TXX：[任务名称]
## 先读设计文档
- docs/dual-sidebar-redesign.md（第 X 节）
## 先读源文件
- [文件路径]
## 任务
[设计文档对应章节]
## 验收标准
[任务文档对应章节]
## 执行命令
npx tsc -p tsconfig.app.json --noEmit  # 编译检查
```