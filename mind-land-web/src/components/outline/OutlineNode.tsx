import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { OutlineNode as OutlineNodeType } from "@/apis/outline";
import NodeContent from "./NodeContent";
import NodeContextMenu from "./NodeContextMenu";

interface OutlineNodeProps {
  node: OutlineNodeType;
  depth: number;
  hasChildren: boolean;
  isSelected: boolean;
  isSearchMatch: boolean;
  isCollapsed: boolean;
  onSelect: (id: number) => void;
  onToggleCollapse: (id: number) => void;
  onUpdateContent: (id: number, content: string) => void;
  onDoubleClickDot: (id: number) => void;
  onInsertAbove: (id: number) => void;
  onInsertBelow: (id: number) => void;
  onCreateChild: (id: number) => void;
  onIndent: (id: number) => void;
  onOutdent: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onDelete: (id: number) => void;
  onFocus: (id: number) => void;
  isDragging?: boolean;
}

export default function OutlineNode({
  node,
  depth,
  hasChildren,
  isSelected,
  isSearchMatch,
  isCollapsed,
  onSelect,
  onToggleCollapse,
  onUpdateContent,
  onDoubleClickDot,
  onInsertAbove,
  onInsertBelow,
  onCreateChild,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
  onDelete,
  onFocus,
  isDragging,
}: OutlineNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleClick = useCallback(() => {
    onSelect(node.id);
  }, [onSelect, node.id]);

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse(node.id);
  }, [onToggleCollapse, node.id]);

  const handleDotDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClickDot(node.id);
  }, [onDoubleClickDot, node.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(node.id);
    setContextMenu({ x: e.clientX + 2, y: e.clientY + 2 });
  }, [onSelect, node.id]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(node.content.replace(/<[^>]*>/g, ""));
    } catch { /* ignore */ }
  }, [node.content]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onUpdateContent(node.id, text);
    } catch { /* ignore */ }
  }, [onUpdateContent, node.id]);

  return (
    <>
      <div
        data-node-id={node.id}
        className={cn(
          "group flex items-center px-2 py-1 rounded-lg transition-colors cursor-text",
          isSearchMatch && !isSelected && "bg-yellow-100 dark:bg-yellow-900/20",
          isDragging && "opacity-50"
        )}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* LEFT: toggle + menu — hover to reveal */}
        <button
          className={cn(
            "shrink-0 w-5 h-5 flex items-center justify-center rounded-lg transition-all",
            "hover:bg-hover",
            hasChildren
              ? "opacity-0 group-hover:opacity-100"
              : "invisible"
          )}
          onClick={handleToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          )}
        </button>

        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-hover"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
            const rect = e.currentTarget.getBoundingClientRect();
            setContextMenu({ x: Math.min(rect.right, window.innerWidth - 160), y: rect.bottom + 4 });
          }}
        >
          <MoreHorizontal className="w-4 h-4 text-text-muted" />
        </button>

        {/* Dot — always visible, used for drag */}
        <div
          data-drag-handle
          className="shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center w-5 h-5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
        </div>

        {/* Content */}
        <NodeContent
          content={node.content}
          onUpdate={(content) => onUpdateContent(node.id, content)}
        />
      </div>

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onInsertAbove={() => onInsertAbove(node.id)}
          onInsertBelow={() => onInsertBelow(node.id)}
          onCreateChild={() => onCreateChild(node.id)}
          onIndent={() => onIndent(node.id)}
          onOutdent={() => onOutdent(node.id)}
          onMoveUp={() => onMoveUp(node.id)}
          onMoveDown={() => onMoveDown(node.id)}
          onCopy={handleCopy}
          onPaste={handlePaste}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => onToggleCollapse(node.id)}
          onFocus={() => onFocus(node.id)}
          onDelete={() => onDelete(node.id)}
        />
      )}
    </>
  );
}
