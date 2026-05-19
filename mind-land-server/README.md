# mind-land-server

> mind-land 后端服务 — Go + Gin + GORM + SQLite

## 技术栈

- **Go** 1.26
- **Gin** — HTTP 路由框架
- **GORM** — ORM (SQLite)
- **glebarez/sqlite** — 纯 Go SQLite 驱动 (无需 CGO)

## 快速开始

```bash
go run main.go
# 监听 :3100
```

生成构建：

```bash
go build -o mind-land-server .
./mind-land-server
```

## 项目结构

```
mind-land-server/
├── main.go           # 入口: Gin 路由, CORS, SQLite 初始化, 静态文件服务
├── go.mod / go.sum
├── slipbox/
│   ├── model.go      # Card, Tag GORM 模型
│   ├── service.go    # 业务逻辑
│   └── handler.go    # HTTP 处理器
└── todo/
    ├── model.go      # List, Item GORM 模型
    ├── service.go    # 业务逻辑
    └── handler.go    # HTTP 处理器
```

## API

所有 API 前缀为 `/api`，JSON 响应格式统一为 `{ code: 0, data: ..., message: "ok" }`。

### SlipBox (卡片笔记)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/slip-box/cards` | 获取所有卡片 |
| GET | `/api/slip-box/cards/:id` | 获取单张卡片 |
| POST | `/api/slip-box/cards` | 创建卡片 |
| PUT | `/api/slip-box/cards/:id` | 更新卡片 |
| DELETE | `/api/slip-box/cards` | 删除卡片 |
| GET | `/api/slip-box/tags` | 获取所有标签 |
| GET | `/api/slip-box/tags/:id` | 获取单个标签 |
| DELETE | `/api/slip-box/tags` | 删除标签 |

### ToDo (任务管理)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/to-do/lists` | 获取任务列表 |
| POST | `/api/to-do/lists` | 创建列表 |
| PATCH | `/api/to-do/lists` | 更新列表 |
| DELETE | `/api/to-do/lists/:id` | 删除列表 |
| GET | `/api/to-do/items` | 获取任务项 (query: list_id) |
| POST | `/api/to-do/items` | 创建任务项 |
| PATCH | `/api/to-do/items` | 更新任务项 |
| DELETE | `/api/to-do/items` | 删除任务项 |

## 部署

生产环境下编译为单一二进制，同时提供 API 和前端静态文件：

```bash
cd ../mind-land-web && npm run build
cd ../mind-land-server && go build -o server .
./server  # 监听 :3100
```

## 协议

MIT
