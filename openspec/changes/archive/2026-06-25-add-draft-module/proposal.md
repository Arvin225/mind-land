## Why

mind-land 目前有 Note（结构化大纲）、SlipBox（原子卡片），但缺一个**长篇连续写作**的容器。`Draft` 页面现只是 "Coming soon" 占位符（`mind-land-web/src/pages/Draft/index.tsx`）。长篇写作需要的是"无限长卷 + 专注沉浸 + 即写即渲染"的体验，跟 Note 的树状结构和 SlipBox 的碎片卡片本质不同 —— 需要一个独立模块来承载散文、小说、讲稿、博客等连续正文。

## What Changes

- 新增稿纸模块：一文档一稿纸，列表态/编辑态路由分离（`/draft` 列表 → `/draft/:id` 全屏编辑）
- 新增 CodeMirror 6 + markdown-it 实现的 Typora 风格编辑器：块级即写即渲染、光标所在块拆源码、视口内 widget decoration
- 新增必备 Markdown 输入辅助：`## `/`**`/`- `/`> ` 自动闭合 + Enter/Backspace 列表退出
- 新增 L1 编辑点记忆：localStorage 按 docId 分 key 记光标/滚动/选区/折叠/激活标题，删稿纸时同步清理
- 新增后端 `draft` 包（flat 结构，对齐 slipbox/todo/outline）：CRUD + 整篇替换 + version 乐观锁 + 软删除回收站 + 服务端 goldmark 派生 title/preview
- 新增自动保存：debounce 800ms 整篇提交，409 冲突时提示用户选择（reload / 覆盖）
- 新增字数统计（顶栏显示）、`.md` 导出下载
- 路由 `/draft` 与 `/draft/:id` 注册到 `router/index.tsx`

## Capabilities

### New Capabilities
- `draft-storage`: 稿纸后端持久化 —— GORM 模型、CRUD API、version 乐观锁、软删除回收站、服务端从 content_md 派生 title 与列表 preview
- `draft-editor`: CodeMirror 6 Typora 风格编辑器 —— 块级渲染、光标拆源码、视口内 widget、必备输入辅助、debounce 自动保存 + 冲突提示、字数统计、.md 导出
- `draft-cursor-memory`: L1 编辑点记忆 —— localStorage 按 docId 分 key、debounce 500ms 写入 + 卸载/失焦兜底、CM6 ready 后恢复、删稿纸时同步清理
- `draft-list`: 稿纸列表入口 —— 列表态/编辑态路由分离、简单列表 + 预览首行、新建按钮 + 空态大按钮、标题来自正文 H1

### Modified Capabilities
<!-- 无现有 spec 需修改 —— openspec/specs/ 当前为空 -->

## Impact

- **前端 `mind-land-web/`**:
  - 新增 `src/pages/Draft/` 目录（替换占位 `index.tsx`，扩展为 index/DraftList/DraftEditor + components/cm/hooks）
  - 新增 `src/store/modules/draftStore.ts`（Redux thunks）
  - 新增 `src/apis/draft.ts`
  - 修改 `src/router/index.tsx`：`/draft` 路由更新为支持 `/draft` 与 `/draft/:id` 两条
  - 新增依赖：`codemirror`、`@codemirror/markdown`、`@codemirror/language`、`@codemirror/view`、`@codemirror/state`、`markdown-it`、`@types/markdown-it`
- **后端 `mind-land-server/`**:
  - 新增 `draft/` 包（model.go / service.go / handler.go，flat 结构对齐现有模块）
  - 修改 `main.go`：`AutoMigrate` 加 `&draft.Draft{}`，注册 `/api/drafts` 路由组
  - 新增依赖：`github.com/yuin/goldmark`（Go Markdown parser，用于 title/preview 派生）
- **数据库**: 新增 `drafts` 表（id / title / content_md / version / created_at / updated_at / deleted_at）+ 两个部分索引
- **localStorage**: 新增 `draft:cursor:<docId>` key 族（不落库，删稿纸时同步删）
- **无破坏性变更**：纯新增模块，不动现有 SlipBox/Note/ToDo
