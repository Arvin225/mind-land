## Context

mind-land 已有三个内容模块：Note（结构化大纲，TipTap + ProseMirror）、SlipBox（原子卡片，TipTap）、ToDo（任务）。`Draft` 路由目前只是 `pages/Draft/index.tsx` 的 17 行占位符。后端按模块扁平包结构组织（`slipbox/`、`todo/`、`outline/`、`diary/`），GORM + glebarez/sqlite，main.go 集中注册路由 + AutoMigrate。前端用 Redux Toolkit + Zustand，路由 React Router v7 懒加载。

稿纸定位为**长篇连续写作**容器，与 Note 的树状结构、SlipBox 的碎片卡片本质不同。骨架决策已在 explore 阶段逐条敲定（见 proposal.md 的 Capabilities 与 specs/）。本文档记录这些决策的"为什么"和实现路径。

## Goals / Non-Goals

**Goals:**
- 无限纵向稿纸：连续长卷、无分页、专注沉浸
- Typora 风格：块级即写即渲染，光标所在块拆源码
- L1 编辑点记忆：localStorage 按 docId 分 key，单设备单会话
- 整篇替换 + version 乐观锁自动保存，debounce 800ms
- 后端 flat 包结构对齐现有模块，软删除回收站对齐 Note
- title / preview 服务端从 content_md 派生（单一来源）

**Non-Goals:**
- 多人协作 / OT / CRDT（v1 单用户单设备）
- 真 diff patch 协议（P-1 整篇替换已足够，留 P-3 扩展位）
- 版本历史（OutlineDocumentVersion 那种）
- 全文搜索（v1 用浏览器 Cmd+F）
- 文件夹 / 标签 / 分类（v1 平铺）
- 图片上传（v1.1，复用 /api/upload）
- PDF 导出（只做 .md 下载）
- 跨设备 cursor 同步（L1 仅本地）
- 空文档占位文案（明确不做）

## Decisions

### Decision 1: CodeMirror 6 + markdown-it，不复用 TipTap

**选择**：CM6 + markdown-it + 自写 ViewPlugin。

**为什么不用 TipTap**：现仓库 SlipBox 用 TipTap，复用栈的诱惑很大。但 Typora 的"光标所在块拆源码、其他块渲染 widget"是块级 decoration 切换，TipTap/ProseMirror 的 Decoration 机制不原生支持这种"块级 source/render 互斥"，要 hack 且效果不稳定。TipTap 的强项是 WYSIWYG 富文本，不是 MD 源码/渲染切换。

**为什么 CM6**：CM6 的 `Decoration.widget` + `ViewPlugin` + `view.visibleRanges` 就是为这种场景设计的。Obsidian、Typora 类编辑器都基于 CM6。性能上 CM6 的 immutable decoration set + range tree diff 保证只更新变化区域。

**为什么 markdown-it 而非 Lezer markdown**：CM6 自带 Lezer markdown parser，但它输出的是 Lezer tree，块边界语义和"渲染用的 HTML"不完全一致，容易渲染说 line 1-3 是段落、块表说 line 1-2 是段落。用 markdown-it 同源解析 token + line mapping，块边界判定和 widget 渲染保证一致。markdown-it 成熟稳定，~50KB。

**代价**：引一个新前端依赖（CM6 ~150KB + markdown-it ~50KB），与 SlipBox 的 TipTap 路子分叉。但 SlipBox 是富文本卡、稿纸是 MD 写作，本就该用不同工具，强行复用 TipTap 反而别扭。

### Decision 2: 存储 Markdown 字符串，不存 ProseMirror JSON

**选择**：`drafts.content_md TEXT`，存 Markdown 源字符串。

**为什么**：与 Typora 风格一致 —— 编辑器内部状态就是 MD 源（光标所在块）+ 渲染缓存（其他块），保存时直接序列化 MD 字符串即可，无需 JSON↔MD 双向转换。diff/patch 友好（虽然 v1 是整篇替换）。Go 后端处理字符串比处理 PM JSON 简单。

**对比 C-1 JSON**：PM JSON 渲染零成本但 diff 是树 diff，Go 后端不友好；且 Typora 体验下 JSON 不是自然表示。

### Decision 3: 整篇替换 + version 乐观锁（P-1），不做真 diff patch

**选择**：`PUT /api/drafts/:id { content_md, base_version }`，服务端比对 version，匹配则替换 + version+1，不匹配返回 409 + 服务端当前内容。

**为什么不做 P-2 真 diff**：v1 单用户单设备，debounce 800ms 一次保存，整篇 100KB 也就 100KB，3 秒一次 33KB/s，网络压力可控。Go 后端实现 OT/patch 应用 + 冲突合并复杂度是 P-1 的 5~10 倍，收益极低。

**留 P-3 扩展位**：未来若需省流量，前端可算 diff 压 payload，后端仍整篇存（伪 diff）。若需协作再升级 P-2。P-1 的 API 形态兼容这个演进路径。

### Decision 4: 服务端用 goldmark 派生 title 和 preview

**选择**：服务端在 POST/PUT 时用 goldmark 解析 content_md，提取第一个 H1 的文本作 title（fallback 首行纯文本，再 fallback 空串）；GET /drafts 列表时用 goldmark 解析取首段纯文本截 120 字作 preview。

**为什么服务端而不是客户端**：title 是"内容派生不变式"，由内容持有方（服务端）执行最自然，客户端 bug 不会导致 title 漂移。客户端只管写正文，title 字段对它只读。goldmark 是 Go 生态最成熟的 CommonMark parser，几百 KB 文档解析几 ms，debounce 800ms 保存频率下完全可承受。

**为什么列表 preview 现查现算而不是存列**：稿纸是个人应用，量级几百篇，每次列表查询 parse 一遍几 ms × 几百 = 几十 ms，可忽略。存 preview 列是过早优化，且要处理"保存时同步更新 preview"的额外逻辑。

### Decision 5: 软删除 + 完整回收站，对齐 Note 模块

**选择**：`deleted_at DATETIME` 字段，`DELETE` 软删，`PATCH /:id/restore` 恢复，`DELETE /:id/permanent` 彻底删，`DELETE /trash` 清空回收站。对齐 `outline/` 的回收站模式。

**为什么不做硬删**：长篇稿纸动辄几千字，误删不可恢复是灾难。回收站成本极低（一个字段 + 几条路由），用户体验与 Note 一致。

### Decision 6: 块表用 markdown-it token + 行号映射（M-3），视口内全建、外懒建（B-4）

**选择**：ViewPlugin.update 时只对 `view.visibleRanges` 调 markdown-it parse（带 line mapping），建 `[lineStart, lineEnd, blockType]` 块查找表。光标 pos → 行号 → 二分查找所在块。光标跳到视口外时同步补建那块。

**为什么 M-3 而非 M-2 Lezer tree**：渲染和块边界判定同源，绝不会错位。Lezer tree 的块语义和 markdown-it 不完全一致（软折行、列表嵌套边界），调试成本高。

**为什么 B-4 而非 B-1 全表重建**：10 万行文档每次按键 O(n) 重建会卡。视口内全建、外懒建是 CM6 设计哲学，O(visible) 恒定开销。光标跳视口外时一次同步补建几 ms 可接受。

### Decision 7: ViewPlugin 单源驱动块表 + widget

**选择**：一个 ViewPlugin 同时维护块表和 decorationSet。update 流程：doc/selection/scroll 变化 → 视口内 markdown-it parse → 块表 → 算当前块（光标所在）→ 遍历视口块，当前块不加 widget（保持源码），其他块加 widget decoration → CM6 diff decorationSet 只更新变化 DOM。

**为什么单源**：块表和 widget 必须同源（Decision 6 已述），单 ViewPlugin 保证一次 update 内两者基于同一份 parse 结果，无竞态。

### Decision 8: 光标行永远源码 + 跨块选区全拆

**选择**：两条叠加规则：(a) 光标所在行永远源码，哪怕它属于"块间空行"；(b) 选区跨多块时所有被覆盖块全拆源码。

**为什么**：覆盖 E2（光标在块边界空行）、E3（跨块选区）等边角。光标行永远源码保证用户永远能立刻打字；跨块选区全拆保证跨块复制不丢内容（widget 不可选）。

### Decision 9: L1 编辑点记忆用 localStorage 按 docId 分 key

**选择**：key `draft:cursor:<docId>`，val `{ cursorPos, scrollTop, selection, foldedRanges, activeHeadingId, updatedAt }`。debounce 500ms 写 + beforeunload/卸载兜底。删稿纸时同步删 key。

**为什么 K-2 而非 K-1/K-3**：K-1（单 key 存最近一篇）切文档就丢前一篇位置，体验差。K-3（单 key 存 map）每次读写整个 map，写入稍重。K-2 读写独立、清理方便，单用户稿纸几百篇 key 完全可控。

**为什么不落库**：L1 是单设备单会话便利，跨设备同步是 L3 的范畴（v1 不做）。落库要加 `draft_cursor` 表 + 用户体系，过度工程。

### Decision 10: 列表态/编辑态路由分离（E-2），平铺无文件夹（F-1）

**选择**：`/draft` 全屏列表（L-1 简单列表 + 预览首行 + N-3 顶部按钮 + 空态大按钮），`/draft/:id` 全屏编辑无左栏。无文件夹树、无标签。

**为什么 E-2 而非 E-1**：长篇写作时常驻左栏是负担，全屏沉浸更适合。Notion/Bear/iA Writer 都这套。切列表多一步退路由可接受。

**为什么 F-1**：长篇稿纸是"少而重"内容，数量不会爆炸（不像卡），平铺按 updated_at 倒序足够。后期数量上来再加文件夹/标签。

### Decision 11: 标题 = 正文 H1，fallback 首行/无标题（S-1）

**选择**：title 完全由 content_md 派生（Decision 4），无独立 title 输入框。"重命名" = 进编辑器聚焦 H1/首行。

**为什么 S-1 而非 S-3 独立字段**：稿纸是"长卷正文本身"，标题是正文的一部分，独立字段会破坏这种纯粹性。S-1 下列表预览和正文 H1 永远一致。

## Risks / Trade-offs

- **[Risk] CM6 widget 在软折行下坐标换算复杂** → 用 CM6 `posAtCoords` + widget 内坐标换算；鼠标点击 widget 落位在 spec 已覆盖场景，实现时需测试长行软折行的点击精度。
- **[Risk] 块表视口外懒建在快速跳转（cursor memory 恢复）时延迟** → 跳转时同步补建目标视口块表再 resolve 活动块，spec 已要求"synchronously rebuild"。
- **[Risk] markdown-it parse 在每次 update 都跑，长文档视口大时可能掉帧** → 视口可见行数有限（通常 < 200 行），parse 几 ms；用 doc version 缓存 parse 结果避免重复；若仍卡可加 debounce 50ms。
- **[Risk] 409 冲突在单用户场景几乎不发生但实现不能省** → 多 tab 同一篇稿纸会撞；F-2 提示用户选择是必须实现的，不能因为"低频"省略。
- **[Risk] goldmark 解析在保存路径增加几 ms 延迟** → debounce 800ms 保存本就不要求实时，几 ms 完全可接受。
- **[Risk] CM6 新依赖与 SlipBox TipTap 栈分叉，团队认知成本** → 两个模块场景本就不同，分叉比强行复用更健康；CM6 文档完善。
- **[Trade-off] 整篇替换 100KB × 800ms 在弱网下流量偏大** → 单用户场景可接受；留 P-3 伪 diff 扩展位未来压缩。
- **[Trade-off] L1 cursor memory 不跨设备** → 明确 v1 不做 L3，用户切设备要重新定位；写入 non-goals。

## Migration Plan

1. **后端先行**：新增 `mind-land-server/draft/` 包 + main.go 注册 + AutoMigrate。`go run main.go` 启动后 `drafts` 表自动建。可独立用 curl 验证 6 个 API。
2. **前端列表先行**：实现 `pages/Draft/index.tsx` 路由分发 + `DraftList.tsx`。`/draft` 能列出、新建、删除（软删）。此时编辑态可暂用一个极简 textarea 占位，跑通列表→新建→跳转→编辑→保存全链路。
3. **CM6 Typora 编辑器**：替换 textarea 占位为 CM6 + typoraPlugin。先做块表 + widget 渲染（不带输入辅助），再做输入辅助，再做光标拆 widget 交互。
4. **L1 cursor memory**：在编辑器跑通后加 `useCursorMemory` hook。
5. **自动保存 + 乐观锁 + 冲突提示**：在编辑器内容变更后接 `useAutoSave`。
6. **字数统计 + .md 导出**：顶栏收尾。
7. **回收站 UI**（可选 v1.1）：列表态加"回收站"视图，调 restore/permanent/trash 路由。

**Rollback**：纯新增模块，删 `draft/` 包 + 路由 + 前端 `Draft/` 目录 + `drop table drafts` 即可完全回滚，不影响 SlipBox/Note/ToDo。

## Open Questions

- 回收站的 UI 入口放哪？v1 spec 只覆盖 API，列表态的"回收站"视图是 v1 还是 v1.1？（倾向 v1.1，v1 删除即从列表消失即可）
- 字数统计是"content_md 字符数"还是"渲染后纯文本字符数"？spec 已放权给实现，实现时建议用 markdown-it 渲染后纯文本字符数（更贴近用户感知的"字数"）。
