import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  fetchMoreEntries,
  setSelectedEntry,
  setSelectedId,
} from "@/store/modules/diaryStore";
import { groupByYearMonth } from "./dateFormat";
import DiaryCard from "./DiaryCard";
import { SquarePen } from "lucide-react";

export default function DiaryList({ onNew }: { onNew: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const { entries, loading, selectedId, hasMore } = useSelector(
    (s: RootState) => s.diary
  );

  const groups = groupByYearMonth(entries, (e) => new Date(e.createdAt));

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
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-xs text-[--foreground]/30 tracking-wide">
          日记
        </span>
        <button
          onClick={onNew}
          className="p-1.5 rounded-md hover:bg-hover text-[--foreground]/50 hover:text-[--foreground] transition-colors"
          title="新建日记"
        >
          <SquarePen size={16} />
        </button>
      </div>

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
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

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
