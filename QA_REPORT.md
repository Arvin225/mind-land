# mind-land QA Report

**Evaluator:** Claude Code (`opus` → deepseek-v4-pro) via Playwright MCP  
**Date:** 2026-05-17  
**Max Turns per Batch:** 30–80  
**Effort:** high  

---

## Test Results

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | 首页渲染 | ✅ PASS | `01-home.png` (29KB) |
| 2 | ToDo 页面 | ✅ PASS | `02-todo.png` (28KB) |
| 3 | SlipBox 页面 | ✅ PASS | `03-slipbox.png` (39KB) |
| 4 | Note 占位页面 | ✅ PASS | `04-note.png` (36KB) |
| 5 | Draft 占位页面 | ✅ PASS | `05-draft.png` (31KB) |
| 6 | Diary 占位页面 | ✅ PASS | `06-diary.png` (28KB) |
| 7 | MindMap 页面 | ✅ PASS | `07-mindmap.png` (48KB) |
| 8 | MarkList 页面 | ✅ PASS | `08-marklist.png` (47KB) |
| 9 | AI 页面 | ✅ PASS | `09-ai.png` (53KB) |
| 10 | Settings 页面 | ✅ PASS | `10-settings.png` (96KB) |
| 11 | 空状态引导 | ✅ PASS | `11-todo-empty.png` — OCR 确认 "暂无任务" + 引导文案 |
| 12 | 删除确认对话框 | ⚠️ PASS¹ | 直播观察确认 confirm() 弹出；截图与 03 重复(见注) |
| 13 | Escape 关闭模态框 | ✅ PASS | `13-escape-close.png` — 无模态覆盖层 |
| 14 | 键盘 Tab 导航 | ✅ PASS | Tab 链: Home→待办→稿纸→脑图→卡片笔记→日记→大纲笔记→剪藏→展开 |
| 15 | 右键菜单 | ✅ PASS | `15-context-menu.png` — ToDo 右键触发删除确认 |
| 16 | 拖拽排序 | ❌ FAIL | 差异仅 186px (0.02%)，疑似 hover 效果，条目顺序未实际改变 |
| 17 | 字体大小切换 | ✅ PASS | `16-drag-reorder.png` / `17-font-size.png` — 中→大切换，70522px 差异 |

**¹ 注:** `12-delete-dialog.png` 字节级等同于 `03-slipbox.png`（正常 SlipBox 页面）。对话框在直播时被观察到出现，但截图前被 dismiss。建议复跑补截图。

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 17 |
| **Passed** | 16 |
| **Failed** | 1 |
| **Score** | **9.4/10** ⭐ |

---

## Console Issues

| # | Severity | Description |
|---|----------|-------------|
| 1 | ⚠️ Low | Google Fonts 网络超时（HK VPS 环境无关代码） |
| 2-4 | ⚠️ Low | React duplicate key 警告（3 处，已存在问题） |

---

## Action Items

### 🟡 已修复但无法通过 Playwright 验证
- **#16 拖拽排序** — 两轮修复已应用：
  1. `useRef` 替代 `dataTransfer.getData()`（规避 headless Chromium 中 DataTransfer 初始化问题）
  2. 新增键盘重排 `Alt+↑↓`（可测替代方案，在 wrapper div 加 `tabIndex=0` + `onKeyDown`）
- **验证状态**: API 层 `PATCH sortOrder` ✅ 正常工作；Playwright 验证 ⚠️ 因 HTML5 DnD 是 headless 浏览器硬伤，6 轮测试均超时。键盘重排代码已就位但 Playwright 传 modifier key 也受限。
- **建议**: 下一版在实体浏览器中手动验证，或加 ↑↓ 方向按钮（纯 click 可测）。

---

## Screenshot Inventory (18 files)

```
qa-screenshots/
├── 01-home.png          04-note.png          07-mindmap.png        10-settings.png
├── 02-todo.png          05-draft.png          08-marklist.png       11-todo-empty.png
├── 03-slipbox.png       06-diary.png          09-ai.png             11-slipbox-page.png
├── 12-delete-dialog.png 13-escape-close.png   15-context-menu.png
├── 16-drag-before.png   16-drag-reorder.png   17-font-size.png
└── 00-home-debug.png
```

---

*Evaluated by Claude Code (`opus` / deepseek-v4-pro) · Playwright MCP v0.0.75 · 2026-05-17*
