import { useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  fetchEntries,
  fetchMoreEntries,
  fetchTrashEntries,
  fetchMoreTrashEntries,
  setSelectedEntry,
  setSelectedId,
  setTrashMode,
  restoreEntry,
  permanentDeleteEntry,
  emptyTrash,
  deleteEntry,
} from "@/store/modules/diaryStore";
import { groupByYearMonth } from "./dateFormat";
import DiaryCard from "./DiaryCard";
import ContextMenu from "./ContextMenu";
import { SquarePen, Trash2, ArrowLeft, Eraser } from "lucide-react";
import { showConfirm } from "@/lib/confirm";

export default function DiaryList({ onNew }: { onNew: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    entries,
    trashEntries,
    loading,
    selectedId,
    hasMore,
    trashHasMore,
    trashMode,
  } = useSelector((s: RootState) => s.diary);

  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    entryId: number;
  } | null>(null);

  const displayEntries = trashMode ? trashEntries : entries;
  const displayHasMore = trashMode ? trashHasMore : hasMore;
  const dataSource = trashMode ? trashEntries : entries;

  const groups = groupByYearMonth(displayEntries || dataSource, (e) => new Date(e.createdAt));

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || !displayHasMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          if (trashMode) {
            dispatch(fetchMoreTrashEntries());
          } else {
            dispatch(fetchMoreEntries());
          }
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, displayHasMore, dispatch, trashMode]
  );

  const handleContextMenu = (e: React.MouseEvent, entryId: number) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, entryId });
  };

  const handleEmptyTrash = async () => {
    const ok = await showConfirm({
      title: "清空回收站",
      description: "确定清空回收站？所有条目将永久删除。",
      confirmText: "清空",
    });
    if (!ok) return;
    dispatch(emptyTrash());
  };

  const handleToggleTrash = () => {
    const newMode = !trashMode;
    dispatch(setTrashMode(newMode));
    if (newMode) {
      dispatch(fetchTrashEntries());
    } else {
      dispatch(fetchEntries());
    }
  };

  const ctxMenuItems =
    ctxMenu && trashMode
      ? [
          {
            label: "恢复",
            onClick: () => dispatch(restoreEntry(ctxMenu.entryId)),
          },
          {
            label: "彻底删除",
            danger: true as const,
            onClick: async () => {
              const ok = await showConfirm({
                title: "永久删除",
                description: "确定永久删除？此操作不可恢复。",
                confirmText: "删除",
              });
              if (!ok) return;
              dispatch(permanentDeleteEntry(ctxMenu.entryId));
            },
          },
        ]
      : ctxMenu
        ? [
            {
              label: "删除",
              danger: true as const,
              onClick: async () => {
                const ok = await showConfirm({
                  title: "删除日记",
                  description: "确定删除这篇日记？删除后可在回收站恢复。",
                  confirmText: "删除",
                });
                if (!ok) return;
                dispatch(deleteEntry(ctxMenu.entryId));
              },
            },
          ]
        : [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-xs text-[--foreground]/30 tracking-wide">
          {trashMode ? "回收站" : "日记"}
        </span>
        <div className="flex items-center gap-1">
          {trashMode && (
            <button
              onClick={handleEmptyTrash}
              className="p-1.5 rounded-md hover:bg-hover text-[--foreground]/50 hover:text-red-500 transition-colors"
              title="清空回收站"
            >
              <Eraser size={16} />
            </button>
          )}
          {!trashMode && (
            <button
              onClick={onNew}
              className="p-1.5 rounded-md hover:bg-hover text-[--foreground]/50 hover:text-[--foreground] transition-colors"
              title="新建日记"
            >
              <SquarePen size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 列表区域 + 右下角垃圾桶按钮 */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-y-auto">
          {loading && dataSource.length === 0 ? (
            <p className="text-center text-[--foreground]/30 text-sm py-10">
              加载中...
            </p>
          ) : dataSource.length === 0 ? (
            <p className="text-center text-[--foreground]/30 text-sm py-10">
              {trashMode ? "回收站为空" : "还没有日记，点击 ✏️ 开始写第一篇吧"}
            </p>
          ) : (
            groups.map((group, gi) => (
              <div key={group.yearMonth}>
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
                        onClick={() => {
                          dispatch(setSelectedEntry(item.entry));
                          dispatch(setSelectedId(item.entry.id));
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item.entry.id)}
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {loading && dataSource.length > 0 && (
            <div className="text-center text-xs text-[--foreground]/30 py-2">
              加载中...
            </div>
          )}
          {!displayHasMore && dataSource.length > 0 && (
            <div className="text-center text-xs text-[--foreground]/20 py-2">
              已加载全部
            </div>
          )}
        </div>

        {/* 右下角垃圾桶切换按钮 */}
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={handleToggleTrash}
            className={`p-2.5 rounded-full shadow-lg transition-colors ${
              trashMode
                ? "bg-hover text-[--foreground]"
                : "bg-surface border border-[--border] text-[--foreground]/50 hover:text-[--foreground] hover:bg-hover"
            }`}
            title={trashMode ? "返回日记" : "回收站"}
          >
            {trashMode ? <ArrowLeft size={18} /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenuItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
