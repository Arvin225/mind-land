# Diary 模块实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 实现 mind-land 日记模块，替换占位页，三栏布局（模块菜单 + 日记列表 + 固定编辑区），支持 TipTap 富文本编辑、年月中文分组、读写切换。

**Architecture:** 后端遵循 model/service/handler 模式新增 `diary` 包；前端新增 Diary 页面组件、Redux store、API 层，复用 TipTap 编辑器与现有图片上传。

**Tech Stack:** Go 1.26 + Gin + GORM/SQLite; React 19 + TypeScript + Vite + Tailwind CSS 4 + Redux Toolkit + TipTap

---

## 阶段一：后端

### Task 1: 创建 DiaryEntry 数据模型

**Objective:** 定义日记条目的 GORM 模型

**Files:**
- Create: `mind-land-server/diary/model.go`

**Step 1: 写入模型文件**

```go
package diary

import "time"

type DiaryEntry struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Del       bool      `json:"del" gorm:"default:false"`
}
```

**Step 2: 验证编译**

```bash
cd /root/mind-land/mind-land-server && go build -o /dev/null ./diary/
```

---

### Task 2: 创建 DiaryService

**Objective:** 实现日记 CRUD + 分页查询

**Files:**
- Create: `mind-land-server/diary/service.go`

**Step 1: 写入 service**

```go
package diary

import (
	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

type PaginatedResult struct {
	Entries []DiaryEntry `json:"entries"`
	Total   int64        `json:"total"`
	Page    int          `json:"page"`
	Size    int          `json:"size"`
}

const DefaultPageSize = 20

func (s *Service) GetEntries(page, size int) (*PaginatedResult, error) {
	if page < 1 {
		page = 1
	}
	if size <= 0 {
		size = DefaultPageSize
	}

	var total int64
	if err := s.db.Model(&DiaryEntry{}).Where("del = ?", false).Count(&total).Error; err != nil {
		return nil, err
	}

	var entries []DiaryEntry
	offset := (page - 1) * size
	if err := s.db.Where("del = ?", false).
		Order("created_at DESC").
		Offset(offset).
		Limit(size).
		Find(&entries).Error; err != nil {
		return nil, err
	}

	return &PaginatedResult{
		Entries: entries,
		Total:   total,
		Page:    page,
		Size:    size,
	}, nil
}

func (s *Service) GetEntry(id uint) (*DiaryEntry, error) {
	var entry DiaryEntry
	if err := s.db.First(&entry, id).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) CreateEntry(content string) (*DiaryEntry, error) {
	entry := DiaryEntry{Content: content}
	if err := s.db.Create(&entry).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) UpdateEntry(id uint, content string) (*DiaryEntry, error) {
	var entry DiaryEntry
	if err := s.db.First(&entry, id).Error; err != nil {
		return nil, err
	}
	entry.Content = content
	if err := s.db.Save(&entry).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) DeleteEntry(id uint) error {
	return s.db.Model(&DiaryEntry{}).Where("id = ?", id).Update("del", true).Error
}
```

**Step 2: 验证编译**

```bash
cd /root/mind-land/mind-land-server && go build -o /dev/null ./diary/
```

---

### Task 3: 创建 DiaryHandler

**Objective:** 注册 Gin 路由处理函数

**Files:**
- Create: `mind-land-server/diary/handler.go`

**Step 1: 写入 handler**

```go
package diary

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"mind-land-server/common"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetEntries(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	result, err := h.svc.GetEntries(page, size)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "获取日记列表失败")
		return
	}
	common.Success(c, result)
}

func (h *Handler) GetEntry(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}

	entry, err := h.svc.GetEntry(uint(id))
	if err != nil {
		common.Error(c, http.StatusNotFound, "日记不存在")
		return
	}
	common.Success(c, entry)
}

type createEntryReq struct {
	Content string `json:"content" binding:"required"`
}

func (h *Handler) CreateEntry(c *gin.Context) {
	var req createEntryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "内容不能为空")
		return
	}

	entry, err := h.svc.CreateEntry(req.Content)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "创建日记失败")
		return
	}
	common.Success(c, entry)
}

type updateEntryReq struct {
	Content string `json:"content" binding:"required"`
}

func (h *Handler) UpdateEntry(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}

	var req updateEntryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "内容不能为空")
		return
	}

	entry, err := h.svc.UpdateEntry(uint(id), req.Content)
	if err != nil {
		common.Error(c, http.StatusNotFound, "日记不存在")
		return
	}
	common.Success(c, entry)
}

func (h *Handler) DeleteEntry(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}

	if err := h.svc.DeleteEntry(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, "删除日记失败")
		return
	}
	common.Success(c, nil)
}
```

**Step 2: 验证编译**

```bash
cd /root/mind-land/mind-land-server && go build -o /dev/null ./diary/
```

---

### Task 4: 注册 diary 路由到 main.go

**Objective:** 在 main.go 中添加 AutoMigrate 和路由组

**Files:**
- Modify: `mind-land-server/main.go`

**Step 1: 修改 main.go**

在 import 块中添加：
```go
"mind-land-server/diary"
```

在 `db.AutoMigrate(...)` 行末尾追加 `&diary.DiaryEntry{}`。

在路由注册区域（`api := r.Group("/api")` 块内，upload 路由之后）添加：

```go
// Diary
diarySvc := diary.NewService(db)
diaryH := diary.NewHandler(diarySvc)

dr := api.Group("/diary")
{
	dr.GET("/entries", diaryH.GetEntries)
	dr.GET("/entries/:id", diaryH.GetEntry)
	dr.POST("/entries", diaryH.CreateEntry)
	dr.PUT("/entries/:id", diaryH.UpdateEntry)
	dr.DELETE("/entries/:id", diaryH.DeleteEntry)
}
```

**Step 2: 验证编译**

```bash
cd /root/mind-land/mind-land-server && go build -o server . && echo "BUILD OK"
```

**Step 3: 重启后端并测试 API**

```bash
# 停止旧进程
pkill -f "mind-land-server/server" 2>/dev/null; sleep 1
# 启动新进程
export PATH=$PATH:/usr/local/go/bin
cd /root/mind-land/mind-land-server && ./server &
sleep 2

# 测试创建
curl -s -X POST http://localhost:3100/api/diary/entries \
  -H "Content-Type: application/json" \
  -d '{"content":"<p>测试日记</p>"}' | python3 -m json.tool

# 测试列表
curl -s http://localhost:3100/api/diary/entries | python3 -m json.tool
```

**Expected:**
- POST 返回 `{"code":0, "result": {"id":1, "content":"<p>测试日记</p>", ...}}`
- GET 返回含 entries 数组的分页结果

---

## 阶段二：前端基础设施

### Task 5: 创建日记 API 客户端

**Objective:** 封装日记相关的 HTTP 请求

**Files:**
- Create: `mind-land-web/src/apis/diary.ts`

**Step 1: 写入文件**

```typescript
import request from "@/utils/request";
import { Response } from "./interfaces/Response";

export interface DiaryEntry {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEntries {
  entries: DiaryEntry[];
  total: number;
  page: number;
  size: number;
}

export function getEntriesAPI(page = 1, size = 20) {
  return request.get<any, Response<PaginatedEntries>>("diary/entries", {
    params: { page, size },
  });
}

export function getEntryAPI(id: number) {
  return request.get<any, Response<DiaryEntry>>(`diary/entries/${id}`);
}

export function createEntryAPI(content: string) {
  return request.post<any, Response<DiaryEntry>>("diary/entries", { content });
}

export function updateEntryAPI(id: number, content: string) {
  return request.put<any, Response<DiaryEntry>>(`diary/entries/${id}`, {
    content,
  });
}

export function deleteEntryAPI(id: number) {
  return request.delete<any, Response<null>>(`diary/entries/${id}`);
}
```

**Step 2: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit src/apis/diary.ts 2>&1 | head -20
```

---

### Task 6: 创建日记 Redux Store

**Objective:** 管理日记列表状态：entries、loading、selectedId、editMode、分页

**Files:**
- Create: `mind-land-web/src/store/modules/diaryStore.ts`

**Step 1: 写入 store**

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "..";
import {
  DiaryEntry,
  getEntriesAPI,
  getEntryAPI,
  createEntryAPI,
  updateEntryAPI,
  deleteEntryAPI,
} from "@/apis/diary";

export interface DiaryState {
  entries: DiaryEntry[];
  loading: boolean;
  selectedId: number | null;
  selectedEntry: DiaryEntry | null;
  editMode: boolean;
  page: number;
  total: number;
  hasMore: boolean;
}

const initialState: DiaryState = {
  entries: [],
  loading: true,
  selectedId: null,
  selectedEntry: null,
  editMode: false,
  page: 1,
  total: 0,
  hasMore: true,
};

const diaryStore = createSlice({
  name: "diary",
  initialState,
  reducers: {
    setEntries(state, action: PayloadAction<DiaryEntry[]>) {
      state.entries = action.payload;
    },
    appendEntries(state, action: PayloadAction<DiaryEntry[]>) {
      state.entries = [...state.entries, ...action.payload];
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSelectedId(state, action: PayloadAction<number | null>) {
      state.selectedId = action.payload;
      state.editMode = false; // 选中新条目默认只读
    },
    setSelectedEntry(state, action: PayloadAction<DiaryEntry | null>) {
      state.selectedEntry = action.payload;
    },
    setEditMode(state, action: PayloadAction<boolean>) {
      state.editMode = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setTotal(state, action: PayloadAction<number>) {
      state.total = action.payload;
      state.hasMore = state.entries.length < action.payload;
    },
    removeEntry(state, action: PayloadAction<number>) {
      state.entries = state.entries.filter((e) => e.id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = null;
        state.selectedEntry = null;
        state.editMode = false;
      }
    },
    prependEntry(state, action: PayloadAction<DiaryEntry>) {
      state.entries = [action.payload, ...state.entries];
    },
    updateEntryInList(state, action: PayloadAction<DiaryEntry>) {
      const idx = state.entries.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) {
        state.entries[idx] = action.payload;
      }
      if (state.selectedId === action.payload.id) {
        state.selectedEntry = action.payload;
      }
    },
  },
});

export const {
  setEntries,
  appendEntries,
  setLoading,
  setSelectedId,
  setSelectedEntry,
  setEditMode,
  setPage,
  setTotal,
  removeEntry,
  prependEntry,
  updateEntryInList,
} = diaryStore.actions;

// Thunk: 初始加载
export function fetchEntries() {
  return async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    try {
      const res = await getEntriesAPI(1, 20);
      if (res.code === 0 && res.result) {
        dispatch(setEntries(res.result.entries));
        dispatch(setTotal(res.result.total));
        dispatch(setPage(1));
      }
    } catch (e) {
      console.error("获取日记列表失败", e);
    } finally {
      dispatch(setLoading(false));
    }
  };
}

// Thunk: 加载更多
export function fetchMoreEntries() {
  return async (dispatch: AppDispatch, getState: () => any) => {
    const { page, entries } = getState().diary;
    const nextPage = page + 1;
    try {
      const res = await getEntriesAPI(nextPage, 20);
      if (res.code === 0 && res.result) {
        dispatch(appendEntries(res.result.entries));
        dispatch(setTotal(res.result.total));
        dispatch(setPage(nextPage));
      }
    } catch (e) {
      console.error("加载更多日记失败", e);
    }
  };
}

// Thunk: 选中日记
export function selectEntry(id: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await getEntryAPI(id);
      if (res.code === 0 && res.result) {
        dispatch(setSelectedId(id));
        dispatch(setSelectedEntry(res.result));
      }
    } catch (e) {
      console.error("获取日记详情失败", e);
    }
  };
}

// Thunk: 新建日记
export function createEntry(content: string) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await createEntryAPI(content);
      if (res.code === 0 && res.result) {
        dispatch(prependEntry(res.result));
        dispatch(setSelectedId(res.result.id));
        dispatch(setSelectedEntry(res.result));
        dispatch(setEditMode(true));
      }
    } catch (e) {
      console.error("创建日记失败", e);
    }
  };
}

// Thunk: 更新日记
export function updateEntry(id: number, content: string) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await updateEntryAPI(id, content);
      if (res.code === 0 && res.result) {
        dispatch(updateEntryInList(res.result));
      }
    } catch (e) {
      console.error("更新日记失败", e);
    }
  };
}

// Thunk: 删除日记
export function deleteEntry(id: number) {
  return async (dispatch: AppDispatch) => {
    try {
      const res = await deleteEntryAPI(id);
      if (res.code === 0) {
        dispatch(removeEntry(id));
      }
    } catch (e) {
      console.error("删除日记失败", e);
    }
  };
}

export default diaryStore.reducer;
```

**Step 2: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit 2>&1 | grep -i diary | head -10
```

---

### Task 7: 注册 diary reducer 到 store/index.ts

**Objective:** 将 diaryStore 加入 Redux configureStore

**Files:**
- Modify: `mind-land-web/src/store/index.ts`

**Step 1: 读取当前文件**

先读 `/root/mind-land/mind-land-web/src/store/index.ts` 确认实际内容。

**Step 2: 添加 reducer**

在 import 块追加：
```typescript
import diaryReducer from "./modules/diaryStore";
```

在 `configureStore({ reducer: { ... } })` 中添加：
```typescript
diary: diaryReducer,
```

**Step 3: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit 2>&1 | grep -E "error|diary" | head -10
```

---

## 阶段三：前端组件

### Task 8: 创建中文日期格式化工具

**Objective:** 年月转中文数字（如 二零二六年五月），日期保留阿拉伯数字

**Files:**
- Create: `mind-land-web/src/pages/Diary/dateFormat.ts`

**Step 1: 写入工具函数**

```typescript
const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 数字年份 → 中文年份，如 2026 → 二零二六 */
function yearToChinese(year: number): string {
  return String(year)
    .split("")
    .map((d) => CN_DIGITS[+d])
    .join("");
}

/** Date → 分组 key: "二零二六年五月" */
export function toYearMonthKey(d: Date): string {
  return `${yearToChinese(d.getFullYear())}年${d.getMonth() + 1}月`;
}

/** 星期几 */
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export function toWeekday(d: Date): [string, string] {
  const w = WEEKDAYS[d.getDay()];
  return [w[0], w[1]]; // ["周","一"]
}

/** Date → "27日" */
export function toDay(d: Date): string {
  return `${d.getDate()}日`;
}

/** Date → "09:30" */
export function toTime(d: Date): string {
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 分组结构 */
export interface DiaryGroup {
  yearMonth: string; // 二零二六年五月
  entries: { entry: any; date: Date }[];
}

/** 将 entries 按年月分组，组内按时间倒序 */
export function groupByYearMonth(
  entries: any[],
  getDate: (e: any) => Date
): DiaryGroup[] {
  const map = new Map<string, any[]>();
  for (const e of entries) {
    const d = getDate(e);
    const key = toYearMonthKey(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ entry: e, date: d });
  }
  // 组间按 key 降序（不能用字符串排序，用实际日期）
  const groups: DiaryGroup[] = [];
  for (const [key, items] of map) {
    // key 已经是 "二零二六年五月" 格式，取第一个条目的日期来排序
    groups.push({ yearMonth: key, entries: items });
  }
  // 按组内最新日期降序
  groups.sort((a, b) => {
    const da = a.entries[0].date.getTime();
    const db = b.entries[0].date.getTime();
    return db - da;
  });
  return groups;
}
```

**Step 2: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit src/pages/Diary/dateFormat.ts 2>&1 | head -10
```

---

### Task 9: 创建 DiaryCard 条目组件

**Objective:** 左侧日期时间 + 竖排星期 + 右侧摘要的卡片

**Files:**
- Create: `mind-land-web/src/pages/Diary/DiaryCard.tsx`

**Step 1: 写入组件**

```tsx
import { toDay, toTime, toWeekday } from "./dateFormat";

interface DiaryCardProps {
  entry: any;
  date: Date;
  selected: boolean;
  onClick: () => void;
}

/** HTML 转纯文本 */
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export default function DiaryCard({ entry, date, selected, onClick }: DiaryCardProps) {
  const summary = stripHtml(entry.content).slice(0, 100);
  const day = toDay(date);
  const time = toTime(date);
  const [zhou, yi] = toWeekday(date);

  return (
    <div
      onClick={onClick}
      className={`
        flex items-stretch gap-0 py-3 px-4 cursor-pointer select-none
        transition-colors duration-150
        ${selected ? "bg-[--hover]" : "hover:bg-[--hover]"}
      `}
    >
      {/* 列1：日期/时间 */}
      <div className="flex flex-col items-end justify-center shrink-0 w-[50px] pr-1">
        <span className="text-lg font-bold text-[--foreground] leading-tight">
          {day}
        </span>
        <span className="text-[11px] text-[--foreground]/50 leading-tight mt-0.5">
          {time}
        </span>
      </div>

      {/* 列2：竖排星期几 */}
      <div className="flex flex-col justify-center items-center shrink-0 w-[16px] text-[11px] text-[--foreground]/40 leading-tight">
        <span>{zhou}</span>
        <span>{yi}</span>
      </div>

      {/* 列3：内容摘要 */}
      <div className="flex-1 min-w-0 flex items-center pl-2">
        <p className="text-sm text-[--foreground]/70 leading-relaxed line-clamp-2">
          {summary || "(空内容)"}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit 2>&1 | grep -i diary | head -10
```

---

### Task 10: 创建 DiaryList 分组列表组件

**Objective:** 按年月分组渲染 DiaryCard，支持滚动加载更多

**Files:**
- Create: `mind-land-web/src/pages/Diary/DiaryList.tsx`

**Step 1: 写入组件**

```tsx
import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  selectEntry,
  fetchMoreEntries,
} from "@/store/modules/diaryStore";
import { groupByYearMonth } from "./dateFormat";
import DiaryCard from "./DiaryCard";
import { SquarePen } from "lucide-react";

export default function DiaryList({ onNew }: { onNew: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const { entries, loading, selectedId, hasMore, page } = useSelector(
    (s: RootState) => s.diary
  );

  const groups = groupByYearMonth(entries, (e) => new Date(e.createdAt));

  // 无限滚动
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          dispatch(fetchMoreEntries());
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, dispatch]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶栏：新建按钮 */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-xs text-[--foreground]/30 tracking-wide">
          日记
        </span>
        <button
          onClick={onNew}
          className="p-1.5 rounded-md hover:bg-[--hover] text-[--foreground]/50 hover:text-[--foreground] transition-colors"
          title="新建日记"
        >
          <SquarePen size={16} />
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading && entries.length === 0 ? (
          <p className="text-center text-[--foreground]/30 text-sm py-10">
            加载中...
          </p>
        ) : entries.length === 0 ? (
          <p className="text-center text-[--foreground]/30 text-sm py-10">
            还没有日记，点击 ✏️ 开始写第一篇吧
          </p>
        ) : (
          groups.map((group, gi) => (
            <div key={group.yearMonth}>
              {/* 年月头：中文居中 */}
              <div className="text-center text-xs text-[--foreground]/40 py-2 font-medium tracking-wider">
                {group.yearMonth}
              </div>
              {group.entries.map((item, ei) => {
                const isLast =
                  gi === groups.length - 1 && ei === group.entries.length - 1;
                return (
                  <div key={item.entry.id} ref={isLast ? lastRef : null}>
                    <DiaryCard
                      entry={item.entry}
                      date={item.date}
                      selected={selectedId === item.entry.id}
                      onClick={() => dispatch(selectEntry(item.entry.id))}
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* 加载更多提示 */}
      {loading && entries.length > 0 && (
        <div className="text-center text-xs text-[--foreground]/30 py-2 shrink-0">
          加载中...
        </div>
      )}
      {!hasMore && entries.length > 0 && (
        <div className="text-center text-xs text-[--foreground]/20 py-2 shrink-0">
          已加载全部
        </div>
      )}
    </div>
  );
}
```

**Step 2: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit 2>&1 | grep -i diary | head -15
```

---

### Task 11: 创建 DiaryEditor 编辑区组件

**Objective:** 三栏结构：信息栏（时间+字数+阅读/编辑开关+删除）→ 工具栏 → TipTap 编辑器

**Files:**
- Create: `mind-land-web/src/pages/Diary/DiaryEditor.tsx`

**Step 1: 写入组件**

```tsx
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  setEditMode,
  updateEntry,
  deleteEntry,
  selectEntry,
} from "@/store/modules/diaryStore";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import Toolbar from "./Toolbar";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

export default function DiaryEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedEntry, selectedId, editMode } = useSelector(
    (s: RootState) => s.diary
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ImageExt.configure({
        allowBase64: false,
        HTMLAttributes: { class: "max-w-full rounded" },
      }),
    ],
    content: selectedEntry?.content || "",
    editable: editMode,
    onUpdate: ({ editor: ed }) => {
      // 自动保存？可以先不做，等用户手动切换只读模式时保存
    },
  });

  // 选中条目变化时更新编辑器内容
  useEffect(() => {
    if (editor && selectedEntry) {
      const current = editor.getHTML();
      if (current !== selectedEntry.content) {
        editor.commands.setContent(selectedEntry.content);
      }
    }
  }, [selectedId, editor]);

  // 编辑模式变化时切换 editable
  useEffect(() => {
    if (editor) {
      editor.setEditable(editMode);
    }
  }, [editMode, editor]);

  // 退出编辑时自动保存
  const handleToggleEdit = useCallback(() => {
    if (editMode && editor && selectedId) {
      const html = editor.getHTML();
      dispatch(updateEntry(selectedId, html));
    }
    dispatch(setEditMode(!editMode));
  }, [editMode, editor, selectedId, dispatch]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    if (!confirm("确定删除这篇日记？")) return;
    dispatch(deleteEntry(selectedId));
  }, [selectedId, dispatch]);

  // 当前字数
  const wordCount = editor
    ? stripHtml(editor.getHTML()).length
    : selectedEntry
      ? stripHtml(selectedEntry.content).length
      : 0;

  // 格式化创建时间
  const createdAt = selectedEntry
    ? new Date(selectedEntry.createdAt).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  if (!selectedEntry) {
    return (
      <div className="h-full flex items-center justify-center text-[--foreground]/20 text-sm">
        选择一篇日记
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 第一栏：顶部信息栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--border] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[--foreground]/50 cursor-pointer hover:text-[--foreground] transition-colors">
            ⏰ {createdAt} ▼
          </span>
          <span className="text-[11px] text-[--foreground]/30">
            ● {wordCount}字
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEdit}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              editMode
                ? "bg-[--foreground]/10 text-[--foreground]"
                : "text-[--foreground]/50 hover:text-[--foreground]"
            }`}
          >
            {editMode ? "编辑" : "阅读"}
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-[--hover] text-[--foreground]/30 hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 第二栏：工具栏（仅编辑模式显示） */}
      {editMode && editor && <Toolbar editor={editor} />}

      {/* 第三栏：内容区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {editMode ? (
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none h-full focus:outline-none
              [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none
              text-[--foreground]"
          />
        ) : (
          <div
            className="prose prose-sm max-w-none text-[--foreground]"
            dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 2: 创建 Toolbar 组件**

**Files:**
- Create: `mind-land-web/src/pages/Diary/Toolbar.tsx`

```tsx
import { type Editor } from "@tiptap/react";
import {
  Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent,
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Image as ImageIcon,
} from "lucide-react";
import { useCallback } from "react";

export default function Toolbar({ editor }: { editor: Editor }) {
  const addImage = useCallback(() => {
    const url = prompt("输入图片链接（或使用上传功能）");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const btnClass = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${
      active
        ? "bg-[--foreground]/10 text-[--foreground]"
        : "text-[--foreground]/50 hover:text-[--foreground] hover:bg-[--hover]"
    }`;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[--border] shrink-0 flex-wrap">
      {/* 第一组：撤销/重做 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().undo().run()} className={btnClass(false)} title="撤销"><Undo2 size={14} /></button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btnClass(false)} title="重做"><Redo2 size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      {/* 第二组：对齐/缩进 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnClass(editor.isActive({ textAlign: "left" }))} title="左对齐"><AlignLeft size={14} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnClass(editor.isActive({ textAlign: "center" }))} title="居中"><AlignCenter size={14} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnClass(editor.isActive({ textAlign: "right" }))} title="右对齐"><AlignRight size={14} /></button>
        <button onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btnClass(editor.isActive({ textAlign: "justify" }))} title="两端对齐"><AlignJustify size={14} /></button>
        <button onClick={() => editor.chain().focus().sinkListItem("listItem").run()} className={btnClass(false)} title="增加缩进"><Indent size={14} /></button>
        <button onClick={() => editor.chain().focus().liftListItem("listItem").run()} className={btnClass(false)} title="减少缩进"><Outdent size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      {/* 第三组：字体样式 */}
      <div className="flex items-center gap-0.5">
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
          title="字体颜色"
        />
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: level as any }).run();
          }}
          className="text-xs bg-transparent border border-[--border] rounded px-1 py-0.5 text-[--foreground]/70"
          title="字号"
        >
          <option value={0}>正文</option>
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))} title="加粗"><Bold size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))} title="斜体"><Italic size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))} title="下划线"><Underline size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))} title="删除线"><Strikethrough size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      {/* 第四组：列表 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))} title="无序列表"><List size={14} /></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))} title="有序列表"><ListOrdered size={14} /></button>
      </div>
      <span className="w-px h-4 bg-[--border] mx-1" />

      {/* 第五组：图片 */}
      <div className="flex items-center gap-0.5">
        <button onClick={addImage} className={btnClass(false)} title="插入图片"><ImageIcon size={14} /></button>
      </div>
    </div>
  );
}
```

**Step 3: TypeScript 检查**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit 2>&1 | grep -E "diary|toolbar" | head -15
```

---

### Task 12: 替换 Diary 页面入口

**Objective:** 将占位页替换为双栏布局（DiaryList + DiaryEditor）

**Files:**
- Overwrite: `mind-land-web/src/pages/Diary/index.tsx`

**Step 1: 写入页面**

```tsx
import { useEffect, useCallback } from "react";
import DiaryList from "./DiaryList";
import DiaryEditor from "./DiaryEditor";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchEntries, setEditMode } from "@/store/modules/diaryStore";

export default function Diary() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedId } = useSelector((s: RootState) => s.diary);

  useEffect(() => {
    dispatch(fetchEntries());
  }, [dispatch]);

  const handleNew = useCallback(() => {
    // 新建：清空选中，进入编辑模式，显示空白编辑器
    dispatch({ type: "diary/setSelectedId", payload: null });
    dispatch({ type: "diary/setEditMode", payload: true });
    // 实际的 create 在编辑器第一次保存时触发
  }, [dispatch]);

  return (
    <div className="h-full flex">
      {/* 中栏：日记列表 */}
      <div className="w-[360px] shrink-0 border-r border-[--border] h-full">
        <DiaryList onNew={handleNew} />
      </div>

      {/* 右栏：编辑/预览区 */}
      <div className="flex-1 h-full min-w-0">
        <DiaryEditor />
      </div>
    </div>
  );
}
```

**Step 2: 验证前端编译**

```bash
cd /root/mind-land/mind-land-web && npx tsc --noEmit 2>&1 | head -20
# Expected: no errors (or only pre-existing non-diary errors)
```

---

### Task 13: 端到端验证

**Objective:** 启动服务，在浏览器中验证完整流程

**Step 1: 确认服务运行**

```bash
ss -tlnp | grep -E "3000|3100"
# Expected: server on :3100, vite on :3000
```

如果未运行：
```bash
# 后端
export PATH=$PATH:/usr/local/go/bin
cd /root/mind-land/mind-land-server && go build -o server . && ./server &

# 前端
cd /root/mind-land/mind-land-web && npm run dev &
```

**Step 2: Playwright 验证**

```bash
# 用 Playwright 打开 http://localhost:3000/diary 验证：
# 1. 页面加载，显示空列表 + "选择一篇日记" 提示
# 2. 点击新建按钮，右侧编辑器激活
# 3. 输入内容，切换阅读模式，确认内容渲染
# 4. 刷新页面，确认日记列表显示新建条目
```

---

## 任务顺序

| 序号 | 任务 | 阶段 |
|------|------|------|
| 1 | DiaryEntry 模型 | 后端 |
| 2 | DiaryService | 后端 |
| 3 | DiaryHandler | 后端 |
| 4 | 注册路由 | 后端 |
| 5 | diary API 客户端 | 前端 |
| 6 | diaryStore | 前端 |
| 7 | 注册 reducer | 前端 |
| 8 | 日期格式化工具 | 前端 |
| 9 | DiaryCard 组件 | 前端 |
| 10 | DiaryList 组件 | 前端 |
| 11 | DiaryEditor + Toolbar | 前端 |
| 12 | 替换 Diary 页面 | 前端 |
| 13 | 端到端验证 | 验证 |

---

## 注意事项

1. **不自动 commit / push** — 所有代码完成后等用户确认
2. Tailwind v4 中 `hover:bg-[--hover]` 可能失效（已知 bug），改用 `hover:bg-hover` 类（需确保 `--color-hover` 已在 theme 中注册）
3. 图片上传功能后续集成现有 `/api/upload` 接口，当前先用 URL 方式插入
4. 日记编辑器的 extensions 需检查 `package.json` 确保 `@tiptap/extension-color`、`@tiptap/extension-text-style`、`@tiptap/extension-text-align`、`@tiptap/extension-underline`、`@tiptap/extension-highlight` 已安装，否则 `npm install` 补充
