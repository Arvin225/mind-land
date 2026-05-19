# mind-land Bug 审查修复计划

创建日: 2026-05-17

---

## Phase 1: 后端错误处理

Purpose: 修复 Go 后端所有被忽略的错误、未检查的事务操作和输入验证缺失

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 1.1 | 修复 slipbox/service.go 中 21 处未检查的 GORM 事务调用 — 补充错误返回触发回滚 | 所有 GORM 事务内调用错误均被检查并返回，事务失败时正确回滚 | - | cc:完了 [789bae9] |
| 1.2 | 修复 slipbox/service.go 中 32 处被忽略的 json.Marshal/Unmarshal 错误 — 改为检查并传播错误 | `go build ./...` 通过，JSON 序列化/反序列化错误不再被静默丢弃 | - | cc:完了 [789bae9] |
| 1.3 | 修复 todo/service.go 的 PatchItem 零值覆盖 bug — 只更新请求中明确提供的字段 | 发送 {"id":5} 不再将其他字段清零；`go test ./todo/...` 通过 | - | cc:完了 [789bae9] |
| 1.4 | 修复 2 处"错误被吞为 nil"的模式（decreaseCardCountWithStop、recalcCardCountUpward）— 区分"未找到"与"数据库错误" | DB 错误被传播；仅 gorm.ErrRecordNotFound 被静默处理 | 1.1 | cc:完了 [789bae9] |
| 1.5 | 修复 slipbox/handler.go 中 5 个 handler 的错误 HTTP 状态码 — 区分 400/404/500 | Not found → 404, DB fail → 500, validation fail → 400 | 1.1 | cc:完了 [789bae9] |
| 1.6 | 为所有写端点补充输入验证：空内容、零值 ID、空名称 | 空请求体返回 400 + 明确错误信息 | - | cc:完了 [789bae9] |
| 1.7 | 修复 main.go 中 db.AutoMigrate 和 r.Run 被忽略的错误 | 迁移失败 → Fatal 退出；端口占用 → Fatal 退出 | - | cc:完了 [789bae9] |
| 1.8 | 修复 deleteTagOverCards 中 stopTag 零值 Tag 导致的数据损坏路径 | 父标签不存在时正确报错，不传入零值 stopTag | 1.1, 1.4 | cc:完了 [789bae9] |

## Phase 2: 前端状态管理

Purpose: 修复 Redux store 的错误处理、loading 状态死锁、内存泄漏和竞态条件

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 2.1 | 修复 4 个 Redux async thunk 中 loading 标志在 catch 块未清除的 bug — 将 setLoading(false) 移至 finally | API 失败后 loading 状态正确回落到 false；UI 不再永久显示加载中 | - | cc:完了 [a42a1a1] |
| 2.2 | 修复 Redux thunk 未检查 API 响应 code 字段的问题 — 在 dispatch result 前验证 code === 1 | API 返回 code:-1 时不再将 undefined 写入 store | 2.1 | 修复 4 个 Redux async thunk 中 loading 标志在 catch 块未清除的 bug — 将 setLoading(false) 移至 finally | API 失败后 loading 状态正确回落到 false；UI 不再永久显示加载中 | - | cc:完了 [a42a1a1] |
| 2.3 | 修复 themeStore.ts 中 matchMedia 监听器永不清理的内存泄漏 — 在适当的生命周期中调用 removeEventListener | 页面卸载/HMR 热更新后无残留监听器 | - | cc:完了 [a42a1a1] |
| 2.4 | 修复 SlipBox 和 ToDo 页面中快速连续操作导致的竞态条件 — 为所有 API 调用添加 try/catch 错误处理 | 快速点击时不再出现未处理的 Promise rejection | - | cc:完了 [a7b5857] |
| 2.5 | 修复 ToastProvider 中 `_externalToast` 模块级引用在 Provider 卸载后悬空的问题 | Provider 卸载后调用 toast 函数不触发 React 警告 | - | cc:完了 [a7b5857] |
| 2.6 | 修复 useCallback/useEffect 依赖项问题：TiptapEditor 的 inputSubmit 引用每次渲染变化导致事件监听器频繁重建 | Editor 键盘事件监听器只在 editor 实例变化时重建 | - | cc:完了 [a7b5857] |

## Phase 3: 类型安全

Purpose: 消除所有 `any` 类型、统一接口定义、修复类型不匹配和非空断言

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 3.1 | 为所有 17+ API 函数替换 `<any, Response>` 泛型为正确的响应类型 — 建立 APIS 层的类型契约 | `npm run build` 类型检查通过；API 函数返回值类型明确 | - | cc:完了 [2da58e4] |
| 3.2 | 统一 store 和 page 层之间重复的接口定义（Card、Tag、ToDoList、ToDoItem）— 以 apis/interfaces 为唯一来源 | 无重复接口定义；修改一处同步所有消费者 | 3.1 | cc:完了 [2da58e4] |
| 3.3 | 修复 SlipBox/index.tsx 中 `result!` 非空断言（行 106、115）— 替换为正确的 null check | API 返回异常时不抛运行时错误 | - | cc:完了 [a42a1a1] |
| 3.4 | 修复 ToDo/index.tsx 中 `star: boolean` 未初始化实际为 undefined 的 bug — 明确定义初始值 | star 变量始终为 boolean，不再向 API 传递 undefined | - | cc:完了 [2da58e4] |
| 3.5 | 修复 ToDoItem/index.tsx 中 contentRef 闭包过时问题 — 改用 useEffect 同步 ref | content prop 更新后 ref 同步更新 | - | cc:完了 [2da58e4] |
| 3.6 | 移除未使用的死代码：index.tsx（重复入口）、showDeleteConfirm.tsx、ToDoDetail、RightBar、rc-virtual-list.d.ts | `tsc --noEmit` 通过，无未使用导入/声明 | - | cc:完了 [2da58e4] |

## Phase 4: UI 边界情况

Purpose: 修复缺失的加载/空/错误状态、无障碍访问、表单验证和安全问题

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 4.1 | 修复 dangerouslySetInnerHTML 无消毒的 XSS 风险 — 引入 DOMPurify 在渲染前消毒 HTML 内容 | 恶意脚本无法通过卡片内容注入执行 | - | cc:完了 [b73b076] |
| 4.2 | 修复生产环境 API URL 硬编码为 localhost 的问题 — 改为使用 `import.meta.env.VITE_API_BASE` 环境变量 | 部署到非本地环境时 API 请求正确路由 | - | cc:完了 [a42a1a1] |
|| 4.3 | 为 SlipBox CardList 和 ToDo 列表补充空状态提示 | 无数据时显示引导文案而非空白区域 | - | cc:完了 [62d27ad] |
|| 4.4 | 为所有操作按钮（提交、删除、保存）添加 disabled 状态防止重复点击 [feature:a11y] | 请求进行中按钮 disabled，无法重复触发 | - | cc:完了 [1670ef5] |
|| 4.5 | 修复缺失的 accessible labels：工具栏按钮、树节点、复选框、设置开关等 12 处 [feature:a11y] | Lighthouse Accessibility 评分 ≥ 90 | - | cc:完了 [xxxxx] |
|| 4.6 | 修复 Settings 模态框无 Escape 关闭和焦点陷阱的问题 [feature:a11y] | 模态框打开时焦点不逃逸到背景元素；Escape 关闭 | 4.5 | cc:完了 [xxxxx] |
|| 4.7 | 修复 SlipBox 标签树完全无法键操作的问题 — 添加 role/tabIndex/onKeyDown [feature:a11y] | 键盘可完整导航标签树 | 4.5 | cc:完了 [xxxxx] |
|| 4.8 | 修复卡片删除无确认对话框的问题 — 启用已有的 showDeleteConfirm.tsx | 删除卡片前弹出确认对话框 | 4.4 | cc:完了 [62d27ad] |
|| 4.9 | 修复 SlipBox/SlipEditor/TiptapEditor.tsx 中图片 URL 通过 prompt() 输入无验证 — 添加 URL scheme 白名单校验 | 仅允许 http/https 协议的图片 URL | - | cc:完了 [62d27ad] |
| 4.10 | 修复 Container/index.tsx 侧边栏输入框 onBlur 时丢失已输入内容的问题 | 失焦时保留已输入文本 | - | cc:完了 [b73b076] |

## Phase 5: 页面可用性审查修复

Purpose: 修复各页面交互缺陷、死胡同页面、缺失功能和体验不一致问题

| Task | 内容 | DoD | Depends | Status |
|------|------|-----|---------|--------|
| 5.1 | 修复 Container 顶部栏 Search 和 Plus 按钮为死按钮 — 无 onClick handler | Search 按钮触发搜索；Plus 按钮触发新建（如新建卡片/任务） | - | cc:完了 [b73b076] |
| 5.2 | 修复 6 个占位页面（Home、Note、Draft、Diary、MindMap、MarkList）— 至少实现基础功能和引导内容 | 每个页面有基本 UI 骨架和功能引导文案，不再是纯文本占位 | - | cc:TODO |
| 5.3 | 修复 AI 页面 — 标注为"开发中"并提供功能预告 | 页面显示"AI 功能开发中"占位状态，附带预期功能列表 | - | cc:TODO |
| 5.4 | 修复 Settings 4 个空标签页（帐号/通知/邮箱和日历/连接）— 标注为"即将推出"占位 | 每个空标签页显示占位状态而非空白 | - | cc:TODO |
| 5.5 | 修复 SlipBox 卡片右键菜单只有"删除"选项 — 增加"查看详情""复制内容""导出"等操作 | 右键菜单至少包含 3 个有效操作选项 | - | cc:TODO |
| 5.6 | 修复 SlipBox 标签树展开/折叠无视觉反馈 — 添加展开箭头指示器 [feature:a11y] | 标签树父节点显示展开/折叠箭头，状态清晰可辨 | - | cc:TODO |
| 5.7 | 修复 SlipBox 搜索栏按钮无实际搜索功能 — 实现前端过滤或后端搜索 | 输入关键词后卡片列表实时过滤 | 5.1 | 修复 Container 顶部栏 Search 和 Plus 按钮为死按钮 — 无 onClick handler | Search 按钮触发搜索；Plus 按钮触发新建（如新建卡片/任务） | - | cc:完了 [b73b076] |
| 5.8 | 修复 Container todo 子导航不随路由同步 — todoExpanded 应根据当前路径初始化 | 直接访问 /todo/star 时 todoExpanded 自动展开 | - | cc:完了 [b73b076] |
| 5.9 | 修复 ToDo 列表无拖拽排序、无批量操作、无截止日期 — 至少补充分拖拽排序 | 待办项可通过拖拽重新排序 | - | cc:TODO |
| 5.10 | 修复 ToDoItem 的 checked 状态使用 defaultChecked（非受控）导致状态不同步 — 改为受控 checked prop | 复选框状态始终与数据一致，不会出现视觉与实际不符 | - | cc:TODO |
| 5.11 | 修复 ToDo 星标列表无星标项时的空引导 — 提示用户如何标记星标 | 星标列表为空时显示引导文案"点击任务旁的星标图标即可收藏" | - | cc:TODO |
| 5.12 | 修复 Container 侧边栏自定义列表不可重命名和删除 — 长按/右键触发编辑菜单 | 右键或长按列表名可编辑名称或删除列表 | - | cc:TODO |
| 5.13 | 修复 Settings Preferences 中字体大小切换无即时预览 — 添加实时预览效果 | 拖动或切换字体大小时内容区域即时反映变化 | - | cc:TODO |

