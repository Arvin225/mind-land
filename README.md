# mind-land

> 个人笔记 & 任务管理系统 — 卡片笔记 (SlipBox) + Todo + 日记 + 思维导图

## 项目结构

```
mind-land/
├── mind-land-web/          # React 19 前端 (Vite + Tailwind CSS 4)
│   ├── src/
│   │   ├── pages/          # 路由页面
│   │   │   ├── SlipBox/    # 卡片笔记 (TipTap 富文本编辑器)
│   │   │   ├── ToDo/       # 任务管理 (拖拽排序)
│   │   │   ├── Note/       # 纯文本笔记
│   │   │   ├── Diary/      # 日记
│   │   │   ├── MindMap/    # 思维导图
│   │   │   └── Settings/   # 设置
│   │   ├── store/          # Redux Toolkit + Zustand 状态管理
│   │   ├── components/     # 通用组件
│   │   └── apis/           # Axios API 层
│   └── index.html
├── mind-land-server/       # Go 后端 (Gin + GORM + SQLite)
│   ├── main.go             # 入口, 路由, 静态文件服务
│   ├── slipbox/            # 卡片笔记 CRUD
│   └── todo/               # 任务管理 CRUD
└── qa-screenshots/         # Playwright 验证截图
```

## 技术栈

| 层 | 技术 |
|---|---|
| **前端** | React 19, TypeScript, Vite 6, Tailwind CSS 4, Redux Toolkit, Zustand, TipTap Editor, React Router v7 |
| **后端** | Go 1.26, Gin, GORM, glebarez/sqlite (纯 Go SQLite) |
| **部署** | 单二进制 — Go 服务端内嵌前端静态文件 |

## 快速开始

### 后端

```bash
cd mind-land-server
go run main.go
# 监听 :3100
```

### 前端 (开发模式)

```bash
cd mind-land-web
npm install
npm run dev
# 开发服务 :3000，API 代理到 :3100
```

### 生产构建

```bash
cd mind-land-web && npm run build
cd ../mind-land-server && go build -o mind-land-server .
./mind-land-server
# 单进程监听 :3100，同时提供前端页面和 API
```

## API

所有 API 前缀为 `/api`：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/slip-box/cards` | 获取卡片列表 |
| POST | `/api/slip-box/cards` | 创建卡片 |
| PUT | `/api/slip-box/cards/:id` | 更新卡片 |
| DELETE | `/api/slip-box/cards` | 删除卡片 |
| GET | `/api/slip-box/tags` | 获取标签列表 |
| GET | `/api/to-do/lists` | 获取任务列表 |
| POST | `/api/to-do/items` | 创建任务项 |
| PATCH | `/api/to-do/items` | 更新任务项 |

## 协议

MIT
