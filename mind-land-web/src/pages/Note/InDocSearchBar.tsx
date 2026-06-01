import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { setSelectedNode, expandNode } from "@/store/modules/outlineStore";
import { OutlineNode } from "@/apis/outline";
import { X, ChevronUp, ChevronDown } from "lucide-react";

interface InDocSearchBarProps {
  onClose: () => void;
  onSearchStateChange: (query: string, matchIds: number[]) => void;
}

export default function InDocSearchBar({ onClose, onSearchStateChange }: InDocSearchBarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const nodes = useSelector((s: RootState) => s.outline.nodes);

  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchIds = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return nodes
      .filter((n) => n.content.toLowerCase().includes(q))
      .map((n) => n.id);
  }, [nodes, query]);

  const total = matchIds.length;
  const currentMatchId = total > 0 ? matchIds[currentIndex] : null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    onSearchStateChange(query, matchIds);
  }, [query, matchIds, onSearchStateChange]);

  useEffect(() => {
    if (currentMatchId !== null) {
      dispatch(setSelectedNode(currentMatchId));
      expandParents(nodes, currentMatchId, dispatch);
    }
  }, [currentMatchId, nodes, dispatch]);

  const handlePrev = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    },
    [onClose, handleNext, handlePrev],
  );

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface shrink-0">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="在文档中搜索..."
        className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 transition-colors min-w-0"
      />
      {query.length >= 2 && (
        <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
          {total > 0 ? `${currentIndex + 1}/${total}` : "0/0"}
        </span>
      )}
      <button
        onClick={handlePrev}
        disabled={total === 0}
        className="p-1 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="上一个 (Shift+Enter)"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleNext}
        disabled={total === 0}
        className="p-1 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="下一个 (Enter)"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-colors"
        title="关闭 (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function expandParents(nodes: OutlineNode[], childId: number, dispatch: AppDispatch) {
  let currentId = childId;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const maxIter = nodes.length;
  let iter = 0;
  while (iter < maxIter) {
    iter++;
    const node = nodeMap.get(currentId);
    if (!node || node.parentId === 0) break;
    const parent = nodeMap.get(node.parentId);
    if (parent && parent.isCollapsed) {
      dispatch(expandNode(parent.id));
    }
    currentId = node.parentId;
  }
}
