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
import { useCallback, useEffect, useState, useRef } from "react";
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

  const closePicker = useCallback(() => setShowPicker(false), []);

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

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".date-picker-popover")) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

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
              className="date-picker-popover absolute top-7 left-0 z-50 bg-[--background]/100 border border-[--border] rounded-lg shadow-lg p-3 w-[260px] flex flex-col gap-2.5"
            >
              <div>
                <label className="block text-[11px] text-[--foreground]/40 mb-1 tracking-wide">
                  日期
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="flex-1 text-xs bg-[--background] border border-[--border] rounded px-2 py-1 text-[--foreground] focus:outline-none focus:ring-1 focus:ring-[--accent]"
                  />
                  <button
                    onClick={setToday}
                    className="text-[11px] px-2 py-1 rounded bg-[--foreground]/5 hover:bg-[--foreground]/10 text-[--foreground]/50 hover:text-[--foreground] transition-colors"
                  >
                    今天
                  </button>
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
                  className="text-[11px] px-3 py-1.5 rounded bg-[--foreground]/5 hover:bg-[--foreground]/20 text-[--foreground]/50 hover:text-[--foreground] transition-all duration-150 hover:scale-[1.02]"
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
            className={`relative w-16 h-7 rounded-full transition-colors duration-200 ${
              editMode
                ? "bg-accent"
                : "bg-[--foreground]/10"
            }`}
            title={editMode ? "切换到阅读模式" : "切换到编辑模式"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                editMode ? "translate-x-[34px]" : "translate-x-0"
              }`}
            />
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
