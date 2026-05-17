# mind-land

## Project Overview

Monorepo with two independent subprojects:

| Subproject | Path | Type | Port |
|---|---|---|---|
| mind-land-web | `mind-land-web/` | React 19 SPA | 3000 (dev) |
| mind-land-server | `mind-land-sever/` | Spring Boot 3.4 REST API | 8080 |

## mind-land-web — Frontend

**Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, Redux Toolkit, Zustand, React Router v7, TipTap editor

### Build & Run

```bash
cd mind-land-web
npm install          # install dependencies
npm run dev          # Vite dev server on :3000
npm run build        # typecheck + production build
npm run preview      # preview production build
```

### Architecture

```
src/
├── main.tsx / App.tsx          # Entry point, Redux Provider + RouterProvider
├── router/index.tsx            # createBrowserRouter — all routes lazy-loaded
├── store/                      # Redux Toolkit
│   ├── index.ts                # configureStore (toDo, slipBox reducers)
│   └── modules/
│       ├── slipBoxStore.ts     # SlipBox async thunks + reducers
│       ├── toDoStore.ts        # ToDo async thunks + reducers
│       └── themeStore.ts       # Zustand + persist (dark/light/system)
├── pages/                      # Route-level page components
│   ├── Container/              # Layout shell with sidebar
│   ├── SlipBox/                # Card-based note system (TipTap editor)
│   ├── ToDo/                   # Task management
│   ├── Note/                   # Rich text notes
│   ├── Draft/                  # Draft management
│   ├── Diary/                  # Diary entries
│   ├── MindMap/                # Mind maps
│   ├── AI/                     # AI features
│   ├── MarkList/               # Bookmark list
│   ├── Home/                   # Landing page
│   └── Settings/               # App preferences
├── components/
│   ├── ui/                     # shadcn-style primitives (button, card, input)
│   ├── RightBar/               # Right sidebar
│   └── ToastProvider.tsx       # Toast notification context
├── apis/                       # API layer (axios)
│   ├── slipBox.ts              # SlipBox endpoints
│   ├── toDo.ts                 # ToDo endpoints
│   ├── layout.ts               # Layout endpoints
│   └── interfaces/Response.ts  # Response<T> type wrapper
├── utils/request.ts            # Axios instance, interceptors, /api → :3100 proxy
└── lib/utils.ts                # cn() utility (clsx + tailwind-merge)
```

### Key Patterns

- **State:** Redux Toolkit for SlipBox + ToDo; Zustand (persisted) for theme
- **Routing:** React Router v7 createBrowserRouter, all pages lazy-loaded via `React.lazy`
- **API:** Axios instance with `/api` base path, dev proxy rewrites to `localhost:3100`
- **Styling:** Tailwind CSS 4 with `@tailwindcss/vite` plugin, `@/` path alias
- **Editor:** TipTap (ProseMirror) with extensions: highlight, placeholder, task-list, underline

### Vite Proxy

Dev server proxies `/api/*` → `http://localhost:3100/*` (strips `/api` prefix). Production expects backend on `:3100`.

## mind-land-server — Backend

**Stack:** Go 1.26, Gin web framework, GORM (SQLite), glebarez/sqlite (pure-Go, no CGO)

### Build & Run

```bash
cd mind-land-server
go run main.go              # runs on :3100
go build -o server .        # compile binary
```

### Architecture

```
mind-land-server/
├── main.go                 # Entry point: Gin router, CORS, SQLite init, port :3100
├── go.mod / go.sum         # Dependencies (gin, gorm, glebarez/sqlite)
├── slipbox/
│   ├── model.go            # Card, Tag structs (GORM models)
│   ├── service.go          # CRUD logic with GORM
│   └── handler.go          # Gin HTTP handlers for /slip-box/*
├── todo/
│   ├── model.go            # List, Item structs (GORM models)
│   ├── service.go          # CRUD logic with GORM
│   └── handler.go          # Gin HTTP handlers for /to-do/*
└── common/
    └── response.go         # Unified JSON response helpers
```

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/slip-box/cards` | List all cards |
| GET | `/slip-box/cards/:id` | Get card by ID |
| POST | `/slip-box/cards` | Create card |
| PUT | `/slip-box/cards/:id` | Update card |
| DELETE | `/slip-box/cards` | Delete card (body: {id}) |
| GET | `/slip-box/tags` | List all tags |
| GET | `/slip-box/tags/:id` | Get tag by ID |
| DELETE | `/slip-box/tags` | Delete tag (body: {id}) |
| GET | `/to-do/lists` | List lists |
| POST | `/to-do/lists` | Create list |
| PATCH | `/to-do/lists` | Update list |
| DELETE | `/to-do/lists/:id` | Delete list |
| GET | `/to-do/items` | List items (query: list_id) |
| POST | `/to-do/items` | Create item |
| PATCH | `/to-do/items` | Update item |
| DELETE | `/to-do/items` | Delete item (body: {id}) |

### Key Patterns

- **ORM:** GORM with glebarez/sqlite (pure Go SQLite, zero dependencies)
- **Database:** File-based SQLite (`mind-land.db`), auto-migrated on startup — no MySQL needed
- **CORS:** gin-contrib/cors, allows `http://localhost:3000` (Vite dev server)
- **Code style:** Flat package structure — handler + service + model per module
- **Error handling:** Unified JSON response via `common.Response`

## Communication

- Dev: Frontend Vite `:3000` → proxy `/api` → backend `:3100` via vite.config.ts
- Vite proxy strips `/api` prefix → backend receives paths like `/slip-box/cards`
- Production: Frontend `request.ts` baseURL = `http://localhost:3100`

## Testing

- Frontend: No tests currently
- Backend: No tests currently
- Code size: ~3K lines TS/TSX (frontend) + ~1.3K lines Go (backend)
