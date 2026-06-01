import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "@/store";
import { searchNodesAction } from "@/store/modules/outlineStore";
import { X, Search, FileText, Folder, ListTree } from "lucide-react";
import { OutlineNode } from "@/apis/outline";

interface GroupedResult {
  label: string;
  icon: typeof FileText;
  items: OutlineNode[];
}

function groupResults(results: OutlineNode[]): GroupedResult[] {
  const groups: GroupedResult[] = [];

  const documents = results.filter((r) => r.parentId === -1);
  if (documents.length > 0) {
    groups.push({ label: "文档", icon: FileText, items: documents });
  }

  const folders = results.filter((r) => r.content.startsWith("📁") || r.parentId === -2);
  if (folders.length > 0) {
    groups.push({ label: "文件夹", icon: Folder, items: folders });
  }

  const nodes = results.filter((r) => r.parentId !== -1 && r.parentId !== -2);
  if (nodes.length > 0) {
    groups.push({ label: "节点", icon: ListTree, items: nodes });
  }

  return groups;
}

interface GlobalSearchPanelProps {
  onClose: () => void;
}

export default function GlobalSearchPanel({ onClose }: GlobalSearchPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { searchResults } = useSelector((s: RootState) => s.outline);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const grouped = groupResults(searchResults);
  const flatItems = grouped.flatMap((g) => g.items);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setActiveIndex(-1);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.length < 2) return;
      debounceRef.current = setTimeout(() => {
        dispatch(searchNodesAction(value));
      }, 300);
    },
    [dispatch],
  );

  const handleSelect = useCallback(
    (item: OutlineNode) => {
      navigate(`/note/${item.documentId}`);
      onClose();
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < flatItems.length) {
        e.preventDefault();
        handleSelect(flatItems[activeIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [flatItems, activeIndex, handleSelect, onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl w-[520px] max-h-[65vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文档、文件夹、节点..."
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted"
          />
          {query && (
            <button
              onClick={() => handleQueryChange("")}
              className="p-0.5 rounded hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {query.length < 2 ? (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              输入至少 2 个字符开始搜索
            </div>
          ) : flatItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              未找到匹配结果
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-text-muted">
                  <group.icon className="w-3 h-3" />
                  <span>{group.label}</span>
                </div>
                {group.items.map((item) => {
                  const idx = flatItems.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                        idx === activeIndex ? "bg-hover" : "hover:bg-hover"
                      }`}
                    >
                      <ListTree className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm text-text-primary truncate block"
                          dangerouslySetInnerHTML={{ __html: highlightMatch(item.content, query) }}
                        />
                        <span className="text-xs text-text-muted">
                          文档 #{item.documentId}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border text-xs text-text-muted flex items-center gap-4">
          <span>↑↓ 导航</span>
          <span>Enter 选择</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<mark class='bg-yellow-200 dark:bg-yellow-700 rounded px-0.5'>$1</mark>");
}
