# Batch B: 删除确认框 + 图片上传修复计划

## 问题3：删除确认框（浏览器原生 confirm → 项目风格 AlertDialog）

### 根因
- 项目使用了浏览器原生 `window.confirm()`，风格与项目 UI 不统一
- 项目仅 3 个 shadcn/ui 组件（Button、Card、Input），无 AlertDialog/Dialog 组件

### 涉及文件
| 文件 | 位置 | 说明 |
|------|------|------|
| `mind-land-web/src/pages/ToDo/ToDoItem/index.tsx:93` | 右键菜单删除任务 | `window.confirm()` |
| `mind-land-web/src/pages/SlipBox/functions/showDeleteConfirm.tsx:3` | 卡片删除工具函数 | `window.confirm()`，注释标注"临时方案" |

### 修改方案
1. 安装依赖：`npm install @radix-ui/react-alert-dialog`
2. 新建 `mind-land-web/src/components/ui/AlertDialog.tsx` — shadcn/ui 风格的 AlertDialog 组件
3. 新建 `mind-land-web/src/components/ConfirmDialog.tsx` — 封装 AlertDialog 为易用的 Promise-based API（`confirm({ title, description })`）
4. 替换两处 `window.confirm()` 为新的 ConfirmDialog

---

## 问题4：图片上传改为本地选择

### 根因
- TipTap 编辑器图片功能使用 `window.prompt()` 输入 URL，不支持本地文件选择
- 后端无文件上传接口，无 `uploads/` 目录，无静态文件服务

### 涉及文件
| 文件 | 说明 |
|------|------|
| `mind-land-web/src/pages/SlipBox/` | TipTap 编辑器配置中的 image 扩展 |
| `mind-land-server/main.go` | 后端主入口，需添加路由 |

### 修改方案

#### 后端
1. 新建 `POST /api/upload` 端点（Gin multipart form）
2. 创建 `mind-land-server/uploads/` 目录
3. 添加静态文件服务：`r.Static("/uploads", "./uploads")`
4. 文件命名：UUID + 原始扩展名，限制 10MB，仅允许图片格式

#### 前端
1. 新建图片上传弹窗组件（本地文件选择 + URL 输入双模式）
2. 创建上传 API 函数（`apis/upload.ts`）
3. 修改 TipTap Image 扩展：点击图片按钮 → 弹出上传弹窗 → 选择文件 → 上传 → 获取 URL → 插入编辑器
