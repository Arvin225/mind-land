import { useEffect, useCallback } from "react";
import DiaryList from "./DiaryList";
import DiaryEditor from "./DiaryEditor";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchEntries, createEntry } from "@/store/modules/diaryStore";

export default function Diary() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedId } = useSelector((s: RootState) => s.diary);

  useEffect(() => {
    dispatch(fetchEntries());
  }, [dispatch]);

  const handleNew = useCallback(() => {
    dispatch(createEntry("<p></p>"));
  }, [dispatch]);

  return (
    <div className="h-full flex">
      <div className="w-[360px] shrink-0 border-r border-[--border] h-full">
        <DiaryList onNew={handleNew} />
      </div>

      <div className="flex-1 h-full min-w-0">
        <DiaryEditor />
      </div>
    </div>
  );
}
