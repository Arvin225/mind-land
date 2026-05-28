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
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import Toolbar from "./Toolbar";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
}

const AUTO_SAVE_DELAY = 800; // ms debounce

export default function DiaryEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedEntry, selectedId, editMode } = useSelector(
    (s: RootState) => s.diary
  );

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");

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
      if (!selectedId) return;
      setSaveStatus("saving");
    },
  });

  // debounced auto-save
  useEffect(() => {
    if (saveStatus !== "saving" || !editor || !selectedId) return;
    const timer = setTimeout(() => {
      const html = editor.getHTML();
      dispatch(updateEntry(selectedId, html));
      setSaveStatus("saved");
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [saveStatus, editor, selectedId, dispatch]);

  // reset save status when switching entries
  useEffect(() => {
    setSaveStatus("");
  }, [selectedId]);

  useEffect(() => {
    if (editor && selectedEntry) {
      const current = editor.getHTML();
      if (current !== selectedEntry.content) {
        editor.commands.setContent(selectedEntry.content);
      }
    }
  }, [selectedId, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editMode);
    }
  }, [editMode, editor]);

  const handleToggleEdit = useCallback(() => {
    dispatch(setEditMode(!editMode));
  }, [editMode, dispatch]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    if (!confirm("确定删除这篇日记？")) return;
    dispatch(deleteEntry(selectedId));
  }, [selectedId, dispatch]);

  const [showPicker, setShowPicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);

  const baseDate = overrideDate
    ? new Date(overrideDate)
    : selectedEntry
    ? new Date(selectedEntry.createdAt)
    : new Date();

  const displayDate = baseDate.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Picker draft values
  const [draft, setDraft] = useState({
    date: "",
    hour: "",
    minute: "",
  });

  const openPicker = useCallback(() => {
    const d = baseDate;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    setDraft({
      date: `${yyyy}-${mm}-${dd}`,
      hour: hh,
      minute: mi,
    });
    setShowPicker(true);
  }, [baseDate]);

  // Calendar state
  const [viewMonth, setViewMonth] = useState(() => {
    const d = baseDate;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Reset viewMonth when picker opens
  useEffect(() => {
    if (showPicker) {
      const d = baseDate;
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [showPicker, baseDate]);

  // Calendar grid generator
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      month: "prev" | "current" | "next";
      dateStr: string;
    }> = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 11 : month - 1;
      days.push({
        day: d,
        month: "prev",
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        month: "current",
        dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Next month padding (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextYear = month === 11 ? year + 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      days.push({
        day: d,
        month: "next",
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    return days;
  }, [viewMonth]);

  const isToday = (dateStr: string) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return dateStr === today;
  };

  const closePicker = useCallback(() => {
    setShowPicker(false);
    setShowCalendar(false);
  }, []);

  const selectDate = (dateStr: string) => {
    setDraft((prev) => ({ ...prev, date: dateStr }));
    setShowCalendar(false);
  };

  const isSelected = (dateStr: string) => dateStr === draft.date;

  const applyPicker = useCallback(() => {
    const { date, hour, minute } = draft;
    if (!date) return;
    const iso = `${date}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    setOverrideDate(iso);
    setShowPicker(false);
  }, [draft]);

  const setToday = useCallback(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    setDraft({
      date: `${yyyy}-${mm}-${dd}`,
      hour: hh,
      minute: mi,
    });
  }, []);

  // Close calendar on outside click
  useEffect(() => {
    if (!showCalendar) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".calendar-popover") && !target.closest(".date-input-trigger")) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCalendar]);

  const wordCount = editor
    ? stripHtml(editor.getHTML()).length
    : selectedEntry
      ? stripHtml(selectedEntry.content).length
      : 0;

  if (!selectedEntry) {
    return (
      <div className="h-full flex items-center justify-center text-[--foreground]/20 text-sm">
        选择一篇日记
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--border] shrink-0">
        <div className="flex items-center gap-3 relative">
          <span
            className="text-xs text-[--foreground]/50 cursor-pointer hover:text-[--foreground] transition-colors select-none"
            onClick={() => {
              if (showPicker) setShowPicker(false);
              else openPicker();
            }}
          >
            ⏰ {displayDate} ▼
          </span>
          {showPicker && (
            <div
              className="date-picker-popover absolute top-7 left-0 z-50 bg-surface border border-[--border] rounded-lg shadow-lg p-3 w-[280px] flex flex-col gap-2.5"
            >
              <div>
                <label className="block text-[11px] text-[--foreground]/40 mb-1 tracking-wide">
                  日期
                </label>
                <div className="relative mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draft.date}
                      readOnly
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="date-input-trigger flex-1 text-xs bg-[--background] border border-[--border] rounded px-2 py-1 text-[--foreground] focus:outline-none cursor-pointer"
                    />
                    <button
                      onClick={setToday}
                      className="text-[11px] px-2 py-1 rounded bg-accent/5 hover:bg-accent/10 text-[--foreground]/50 hover:text-[--foreground] transition-colors"
                    >
                      今天
                    </button>
                  </div>

                  {showCalendar && (
                    <div className="calendar-popover absolute top-full left-0 z-50 mt-1 bg-surface border border-[--border] rounded-md p-2 shadow-lg w-full">
                      {/* Year / Month nav */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewMonth((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))}
                            className="p-0.5 rounded hover:bg-accent/10 text-[--foreground]/40 hover:text-[--foreground] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <span className="text-xs text-[--foreground]/70 min-w-[52px] text-center">
                            {viewMonth.getFullYear()}年
                          </span>
                          <button
                            onClick={() => setViewMonth((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))}
                            className="p-0.5 rounded hover:bg-accent/10 text-[--foreground]/40 hover:text-[--foreground] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            className="p-0.5 rounded hover:bg-accent/10 text-[--foreground]/40 hover:text-[--foreground] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <span className="text-xs text-[--foreground]/70 min-w-[40px] text-center">
                            {viewMonth.getMonth() + 1}月
                          </span>
                          <button
                            onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            className="p-0.5 rounded hover:bg-accent/10 text-[--foreground]/40 hover:text-[--foreground] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                          </button>
                        </div>
                      </div>

                      {/* Week headers */}
                      <div className="grid grid-cols-7 mb-1">
                        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                          <div key={d} className="text-[10px] text-[--foreground]/30 text-center py-0.5">
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Date grid */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map((item, idx) => {
                          const today = isToday(item.dateStr);
                          const selected = isSelected(item.dateStr);
                          const isCurrentMonth = item.month === 'current';
                          return (
                            <button
                              key={idx}
                              onClick={() => selectDate(item.dateStr)}
                              className={`
                                relative h-7 text-[11px] rounded transition-colors
                                ${selected
                                  ? 'bg-accent text-white'
                                  : today
                                    ? 'text-[--accent] font-medium'
                                    : isCurrentMonth
                                      ? 'text-[--foreground]/70 hover:bg-accent/10'
                                      : 'text-[--foreground]/20 hover:bg-accent/5'
                                }
                              `}
                            >
                              {today && !selected ? (
                                <span className="text-[10px]">今</span>
                              ) : (
                                item.day
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[--foreground]/40 mb-1 tracking-wide">
                  时间
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={draft.hour}
                    onChange={(e) => {
                      let v = parseInt(e.target.value, 10);
                      if (isNaN(v)) v = 0;
                      if (v > 23) v = 23;
                      if (v < 0) v = 0;
                      setDraft({ ...draft, hour: String(v).padStart(2, "0") });
                    }}
                    className="w-12 text-xs bg-[--background] border border-[--border] rounded px-2 py-1 text-center text-[--foreground] focus:outline-none focus:ring-1 focus:ring-[--accent]"
                  />
                  <span className="text-xs text-[--foreground]/30">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={draft.minute}
                    onChange={(e) => {
                      let v = parseInt(e.target.value, 10);
                      if (isNaN(v)) v = 0;
                      if (v > 59) v = 59;
                      if (v < 0) v = 0;
                      setDraft({ ...draft, minute: String(v).padStart(2, "0") });
                    }}
                    className="w-12 text-xs bg-[--background] border border-[--border] rounded px-2 py-1 text-center text-[--foreground] focus:outline-none focus:ring-1 focus:ring-[--accent]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                <button
                  onClick={closePicker}
                  className="text-[11px] px-3 py-1.5 rounded bg-accent/5 hover:bg-accent/15 text-[--foreground]/50 hover:text-[--foreground] transition-all duration-150 hover:scale-[1.02]"
                >
                  取消
                </button>
                <button
                  onClick={applyPicker}
                  className="text-[11px] px-3 py-1.5 rounded bg-[--accent]/10 hover:bg-[--accent] text-[--accent] hover:text-white transition-all duration-150 hover:scale-[1.02]"
                >
                  确定
                </button>
              </div>
            </div>
          )}
          <span className="text-[11px] text-[--foreground]/30">
            ● {wordCount}字
          </span>
          {saveStatus && (
            <span
              className={`text-[11px] select-none ${
                saveStatus === "saved"
                  ? "text-emerald-400/70"
                  : "text-amber-400/70 animate-pulse"
              }`}
            >
              {saveStatus === "saved" ? "已保存" : "保存中…"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEdit}
            className={`relative w-16 h-7 rounded-full transition-colors duration-200 overflow-hidden ${
              editMode
                ? "bg-accent"
                : "bg-accent/15"
            }`}
            title={editMode ? "切换到阅读模式" : "切换到编辑模式"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 z-10 ${
                editMode ? "translate-x-[34px]" : "translate-x-0"
              }`}
            />
            <span className={`absolute inset-0 flex items-center text-[11px] font-medium ${
              editMode ? "justify-start pl-2 text-white" : "justify-end pr-2 text-accent"
            }`}>
              {editMode ? "编辑" : "阅读"}
            </span>
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

      {editMode && editor && <Toolbar editor={editor} />}

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
