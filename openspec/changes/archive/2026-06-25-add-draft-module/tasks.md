## 1. 后端 draft 包基础

- [x] 1.1 在 `mind-land-server/` 添加 goldmark 依赖（`go get github.com/yuin/goldmark`）
- [x] 1.2 创建 `mind-land-server/draft/model.go`：定义 `Draft` GORM struct（ID, Title, ContentMD, Version, CreatedAt, UpdatedAt, DeletedAt）+ `deleted_at` 软删除字段
- [x] 1.3 创建 `mind-land-server/draft/service.go`：实现 `NewService(db *gorm.DB) *Service`，包含 List / Get / Create / Update / SoftDelete / Restore / PermanentDelete / EmptyTrash 方法
- [x] 1.4 在 service.go 实现 `deriveTitle(contentMd string) string`：goldmark 解析取第一个 H1 文本，无 H1 取首行非空纯文本，再 fallback 空串；剥离内联 MD 语法
- [x] 1.5 在 service.go 实现 `derivePreview(contentMd string) string`：goldmark 解析跳过 H1，取首段纯文本，截 120 字 + 省略号
- [x] 1.6 Update 方法实现乐观锁：`base_version != 当前 version` 返回 `ErrVersionConflict`（含 current_version + server_content_md）
- [x] 1.7 创建 `mind-land-server/draft/handler.go`：8 个 Gin handler，统一用 `common.Response` 包装；409 冲突返回 `{error, current_version, server_content_md}`
- [x] 1.8 修改 `mind-land-server/main.go`：AutoMigrate 加 `&draft.Draft{}`；新建 draft service+handler；注册 `/api/drafts` 路由组（POST/GET/GET:id/PUT:id/DELETE:id + PATCH:id/restore + DELETE:id/permanent + DELETE/trash）
- [x] 1.9 启动服务，用 curl 跑通 8 个 API：新建→列表→获取→更新（version+1）→冲突 409→软删→恢复→彻底删→清空回收站

## 2. 前端依赖与脚手架

- [x] 2.1 在 `mind-land-web/` 安装依赖：`codemirror`、`@codemirror/markdown`、`@codemirror/language`、`@codemirror/view`、`@codemirror/state`、`@codemirror/commands`、`markdown-it`、`@types/markdown-it`
- [x] 2.2 创建 `mind-land-web/src/apis/draft.ts`：类型 `Draft`、`DraftListItem`、`DraftConflict`；函数 `createDraft`、`listDrafts`、`getDraft`、`updateDraft`、`deleteDraft`、`restoreDraft`、`permanentDeleteDraft`、`emptyTrash`，对齐 `apis/outline.ts` 风格
- [x] 2.3 创建 `mind-land-web/src/store/modules/draftStore.ts`：Redux slice + thunks（fetchList / fetchOne / create / update / remove / restore / permanentDelete），对齐 `outlineStore.ts` 风格；在 `store/index.ts` 注册
- [x] 2.4 重写 `mind-land-web/src/pages/Draft/index.tsx`：根据 `useParams` 分发到 `DraftList`（无 id）或 `DraftEditor`（有 id）
- [x] 2.5 修改 `mind-land-web/src/router/index.tsx`：把现有 `/draft` 占位路由替换为两条：`/draft`（列表）与 `/draft/:id`（编辑器），均 lazy load `@/pages/Draft`

## 3. 列表态 DraftList

- [x] 3.1 创建 `mind-land-web/src/pages/Draft/DraftList.tsx`：fetchList 后渲染行（title + preview + updated_at），按服务端顺序展示
- [x] 3.2 实现"无标题" fallback：title 空时显示 `无标题`
- [x] 3.3 实现顶部"新建稿纸"按钮 → dispatch create thunk → 跳 `/draft/:newId`
- [x] 3.4 实现空态大按钮：列表空时居中显示"开始第一篇稿纸"，点击同样触发 create
- [x] 3.5 实现行点击 → `navigate('/draft/:id')`
- [x] 3.6 实现行三点菜单 / 右键菜单：包含"重命名"与"删除"两项
- [x] 3.7 "重命名"：navigate `/draft/:id`，并通过 state 或 query 传 `focusTitle=1`，编辑器据此聚焦首行
- [x] 3.8 "删除"：确认对话框 → dispatch remove thunk → 行从列表消失；删除成功后调 `localStorage.removeItem('draft:cursor:' + id)`
- [x] 3.9 创建/删除后列表自动刷新或基于响应更新可见行，无需手动刷新

## 4. CM6 编辑器骨架

- [x] 4.1 创建 `mind-land-web/src/pages/Draft/DraftEditor.tsx`：fetchOne 加载 draft，挂载 CM6 EditorState + EditorView
- [x] 4.2 配置基础 extensions：`markdown()`（@codemirror/markdown）+ `defaultHighlightStyle` + `history()` + `lineNumbers(false)` + 编辑器主题样式
- [x] 4.3 实现 `EditorToolbar.tsx`（顶栏）：返回按钮、只读标题显示、字数、三点菜单（重命名/删除/下载 .md）、保存状态点
- [x] 4.4 实现 `SaveStatusDot.tsx`：四态（saved/saving/unsaved/error）颜色 + 脉冲动画
- [x] 4.5 编辑器占满 content area，无左栏（路由级全屏）

## 5. CM6 Typora 块级渲染插件

- [x] 5.1 创建 `mind-land-web/src/pages/Draft/cm/blockTable.ts`：用 markdown-it（启用 line mapping）parse 视口文本，构建 `[lineStart, lineEnd, blockType]` 块查找表；按 doc version 缓存 parse 结果
- [x] 5.2 实现 `lookupBlock(table, line)`：二分查找光标行所在块
- [x] 5.3 创建 `mind-land-web/src/pages/Draft/cm/typoraPlugin.ts`：ViewPlugin，update 时取 `view.visibleRanges`，调 blockTable 构建块表，算当前块（光标所在块 + 光标所在行永远源码），为非当前块构建 `Decoration.widget`
- [x] 5.4 实现 widget 渲染：用 markdown-it 把块文本 render 成 HTML string → `Decoration.widget` 替换该 line range；widget DOM 上加 `contenteditable=false`
- [x] 5.5 实现 decorationSet 增量：基于 `DecorationSet` immutable 更新，只 diff 变化区域
- [x] 5.6 实现选区跨块全拆：update 时若 `view.state.selection` 跨多块，所有被覆盖块都不加 widget（保持源码）

## 6. 光标与 widget 交互

- [x] 6.1 实现 ArrowDown/ArrowUp 进入相邻 widget 时拆该块源码：监听 selection 变化，重算活动块，重 build decorationSet
- [x] 6.2 光标从上方进入 widget 落源码行首；从下方进入落源码行尾
- [x] 6.3 实现鼠标点击 widget：监听 widget DOM 的 mousedown，用 `view.posAtCoords` 把 clientX/Y 映射到源码 pos，拆该块，光标落点击位置
- [x] 6.4 处理长行软折行下的点击坐标换算：用 widget 内相对坐标 + 行高计算
- [x] 6.5 实现光标跳到视口外（cursor memory 恢复）时同步补建目标视口块表后再 resolve 活动块

## 7. 必备 Markdown 输入辅助

- [x] 7.1 创建 `mind-land-web/src/pages/Draft/cm/inputRules.ts`：CM6 `inputHandler` 实现 `## `/`# `~`###### ` 自动转 heading
- [x] 7.2 实现 `**` 自动闭合 + 光标落中间
- [x] 7.3 实现 `- `/`* ` 行首转列表项
- [x] 7.4 实现 `> ` 行首转 blockquote
- [x] 7.5 实现 Enter 在空列表项行退出列表（清 marker 而非新建项）
- [x] 7.6 实现 Backspace 在空列表项行首退出列表
- [x] 7.7 在 typoraPlugin 或独立 extension 把 inputRules 接入 EditorView

## 8. 自动保存与冲突

- [x] 8.1 创建 `mind-land-web/src/pages/Draft/hooks/useAutoSave.ts`：监听 content_md 变化，debounce 800ms 调 `updateDraft({content_md, base_version})`，维护保存状态 saved/saving/unsaved/error
- [x] 8.2 实现保存 in-flight 时新的变更排队，in-flight 完成后若有变更再触发一次
- [x] 8.3 实现成功响应：更新 base_version = 返回 version，状态 → saved
- [x] 8.4 实现网络/5xx 错误：状态 → error，保留本地内容，不重试（等下次变更）
- [x] 8.5 创建 `ConflictToast.tsx`：409 时弹出，含"Reload from server"与"Overwrite server"两个按钮
- [x] 8.6 "Reload from server"：用响应里的 server_content_md 替换本地内容，base_version = current_version，状态 → saved
- [x] 8.7 "Overwrite server"：用本地 content_md + base_version = current_version 重新 PUT；成功 → saved
- [x] 8.8 在 DraftEditor 接入 useAutoSave + ConflictToast，把保存状态传给 SaveStatusDot

## 9. L1 编辑点记忆

- [x] 9.1 创建 `mind-land-web/src/pages/Draft/hooks/useCursorMemory.ts`：参数 docId，提供 `save(memory)` 与 `load(): memory | null`
- [x] 9.2 实现 debounce 500ms 写入 localStorage：key `draft:cursor:<docId>`，val `{cursorPos, scrollTop, selection:{anchor,head}, foldedRanges, activeHeadingId, updatedAt}`
- [x] 9.3 实现 beforeunload + React useEffect cleanup 兜底写入（取消 pending debounce 立即写一次）
- [x] 9.4 实现恢复顺序：CM6 实例创建 + 文档内容 set 后，先 set selection/cursor，再 set scrollTop
- [x] 9.5 实现无 memory 时默认 cursor 在 0、scrollTop 在 0
- [x] 9.6 在删除成功回调里 `localStorage.removeItem('draft:cursor:' + id)`（DraftList 行删除 + DraftEditor 顶栏删除两条路径都要调）
- [x] 9.7 验证 restore 不复活 cursor memory（删后清空，restore 不写回，要等用户打开后新活动）

## 10. 字数统计与导出

- [x] 10.1 创建 `useWordCount.ts`：debounce 200ms 算 content_md 渲染后纯文本字符数（markdown-it 渲染 → 提取 textContent → length）
- [x] 10.2 在 EditorToolbar 显示字数
- [x] 10.3 实现顶栏菜单"下载 .md"：用 Blob + URL.createObjectURL 触发下载，文件名 `<title>.md`，title 空时 `draft-<id>.md`
- [x] 10.4 实现顶栏菜单"删除"（与列表删除走同一 thunk + 清 cursor memory + 跳回列表）

## 11. 路由、收尾与验证

- [x] 11.1 验证 `/draft` 与 `/draft/:id` 两条路由都正常工作，从 Home/Container 侧栏点"稿纸"进 `/draft`
- [x] 11.2 `npm run build` 通过 typecheck
- [x] 11.3 `go build ./...` 后端编译通过
- [x] 11.4 手动 e2e：新建 → 编辑（打 ## ** - > 验证输入辅助）→ 滚动 → 切别的稿纸 → 切回验证 cursor memory 恢复 → 等 800ms 验证自动保存 → 在另一 tab 改同篇验证 409 冲突 toast
- [x] 11.5 验证大文档（粘贴几万字）滚动流畅，视口 widget 渲染不卡
- [x] 11.6 验证软删除：删除后列表消失；后端 `drafts` 表 `deleted_at` 已设；清空回收站后行物理删除
- [x] 11.7 验证 cursor memory 在删除稿纸后 localStorage 对应 key 已清
