# Diary 页面测试报告 (Round 3) — 自动保存验证

测试时间: 2026-05-27 14:40
测试页面: http://localhost:3000/diary
浏览器: Chromium (Playwright), 1440x900

## 测试结果

| # | 测试项 | 优先级 | 结果 | 备注 |
|---|--------|--------|------|------|
| 1 | 新建日记直接进编辑器 | P0 | ✅ PASS | 点击新建 → 右侧出现 EditorContent/ProseMirror + 工具栏, toggle 处于编辑模式 |
| 2 | Hover 效果 | P1 | ✅ PASS | DiaryCard 有 hover:bg-hover; 选中条目有高亮背景 rgba(0,0,0,0.16); 按钮有 hover 样式 |
| 3 | 日期时间选择器 | P1 | ⚠️ PARTIAL | 点击日期弹出 spinbuttons + 日历组件 ✅; 点击日历日期触发了页面导航 (事件穿透/冒泡) ⚠️ |
| 4 | 阅读/编辑滑动开关 | P2 | ✅ PASS | 编辑↔阅读正常切换, ProseMirror 编辑/不可编辑正确, 内容保持 |
| 5 | 切换条目加速 | P0 | ✅ PASS | 不同条目点击后 <300ms 切换, 无加载延迟 (用 setSelectedEntry 直接设 store 避免网络请求) |
| 6 | 自动保存 + 持久化 | P0 | ✅ PASS | 输入后显示绿色 "已保存" (text-emerald-400/70); 刷新后内容持久化 |
| 7 | 切换模式不保存 | P2 | ✅ PASS | 快速切换后阅读和编辑模式均保持新内容 |

## 汇总

- **PASS**: 6
- **PARTIAL**: 1
- **FAIL**: 0
- **通过率**: 85.7% (6/7)

## 已知问题

1. **日历点击事件穿透**: 点击日历 date grid 触发了页面导航（疑似原生 datetime-local popup 与侧边栏导航按钮 z-index 重叠）。Console 中有 React duplicate key '0' 的 error 和 TipTap underline 重复注册的 warning。

## 截图

- `qa-reports/round3/00-initial.png` — 初始页面
- `qa-reports/round3/01-new-editor.png` — 新建后编辑器出现
- `qa-reports/round3/02-before-refresh.png` — 保存前内容
- `qa-reports/round3/02-after-refresh.png` — 刷新后内容持久化
- `qa-reports/round3/02-verify-text.png` — 验证文字存在
- `qa-reports/round3/test1-new-entry-editor.png` — 新建进编辑器
- `qa-reports/round3/test3-datetime-picker.png` — 日期选择器
- `qa-reports/round3/test7-reading-mode-after-switch.png` — 切换模式
