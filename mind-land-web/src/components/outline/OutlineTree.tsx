import { useMemo, useState, useCallback, useRef } from "react";
import { OutlineNode as OutlineNodeType } from "@/apis/outline";
import OutlineNodeComponent from "./OutlineNode";
import { cn } from "@/lib/utils";

interface VisibleNode {
  node: OutlineNodeType;
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
}

interface OutlineTreeProps {
  nodes: OutlineNodeType[];
  selectedNodeId: number | null;
  collapsedNodes: Set<number>;
  focusModeNodeId: number | null;
  onSelectNode: (id: number) => void;
  onToggleCollapse: (id: number) => void;
  onDoubleClickDot: (id: number) => void;
  onUpdateContent: (id: number, content: string) => void;
  onContextMenu: (e: React.MouseEvent, id: number) => void;
  onInsertAbove: (id: number) => void;
  onInsertBelow: (id: number) => void;
  onCreateChild: (id: number) => void;
  onIndent: (id: number) => void;
  onOutdent: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onDelete: (id: number) => void;
  onFocus: (id: number) => void;
  onMoveNode: (nodeId: number, targetNodeId: number, position: "above" | "below" | "child") => void;
  searchMatchIds?: number[];
}

function collectDescendantIds(nodes: OutlineNodeType[], parentId: number): number[] {
  const ids: number[] = [];
  for (const n of nodes) {
    if (n.parentId === parentId) {
      ids.push(n.id, ...collectDescendantIds(nodes, n.id));
    }
  }
  return ids;
}

function buildVisibleNodes(
  nodes: OutlineNodeType[],
  focusModeNodeId: number | null,
  collapsedNodes: Set<number>,
): VisibleNode[] {
  if (nodes.length === 0) return [];

  let workingNodes = nodes;
  if (focusModeNodeId !== null) {
    const descendantIds = collectDescendantIds(nodes, focusModeNodeId);
    const focusSet = new Set([focusModeNodeId, ...descendantIds]);
    workingNodes = nodes.filter((n) => focusSet.has(n.id));
  }

  const childrenMap = new Map<number, OutlineNodeType[]>();
  for (const node of workingNodes) {
    if (!childrenMap.has(node.parentId)) {
      childrenMap.set(node.parentId, []);
    }
    childrenMap.get(node.parentId)!.push(node);
  }

  for (const [, children] of childrenMap) {
    children.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const result: VisibleNode[] = [];

  function dfs(parentId: number, depth: number) {
    const children = childrenMap.get(parentId);
    if (!children) return;

    for (const child of children) {
      const isCollapsed = collapsedNodes.has(child.id) || child.isCollapsed;
      const hasChildren = childrenMap.has(child.id) && childrenMap.get(child.id)!.length > 0;

      result.push({ node: child, depth, hasChildren, isCollapsed });

      if (!isCollapsed) {
        dfs(child.id, depth + 1);
      }
    }
  }

  dfs(0, 0);

  return result;
}

export default function OutlineTree({
  nodes,
  selectedNodeId,
  collapsedNodes,
  focusModeNodeId,
  onSelectNode,
  onToggleCollapse,
  onDoubleClickDot,
  onUpdateContent,
  onContextMenu,
  onInsertAbove,
  onInsertBelow,
  onCreateChild,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
  onDelete,
  onFocus,
  onMoveNode,
  searchMatchIds,
}: OutlineTreeProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"above" | "below" | "child" | null>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const onMoveNodeRef = useRef(onMoveNode);
  onMoveNodeRef.current = onMoveNode;

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: number) => {
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", String(nodeId));
    e.dataTransfer.effectAllowed = "move";
    setDraggedNodeId(nodeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: number, depth: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (nodeId === draggedNodeId) {
      setDragOverNodeId(null);
      setDragOverPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const x = e.clientX - rect.left;

    let position: "above" | "below" | "child";

    const childThreshold = 80 + depth * 24;
    if (x > childThreshold && y > height * 0.2 && y < height * 0.8) {
      position = "child";
    } else if (y < height * 0.4) {
      position = "above";
    } else {
      position = "below";
    }

    setDragOverNodeId(nodeId);
    setDragOverPosition(position);
  }, [draggedNodeId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    if (draggedNodeId === null || dragOverNodeId === null || dragOverPosition === null) {
      setDraggedNodeId(null);
      setDragOverNodeId(null);
      setDragOverPosition(null);
      return;
    }

    const descendantIds = collectDescendantIds(nodesRef.current, draggedNodeId);
    if (descendantIds.includes(dragOverNodeId)) {
      setDraggedNodeId(null);
      setDragOverNodeId(null);
      setDragOverPosition(null);
      return;
    }

    onMoveNodeRef.current(draggedNodeId, dragOverNodeId, dragOverPosition);

    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDragOverPosition(null);
  }, [draggedNodeId, dragOverNodeId, dragOverPosition]);

  const handleDragEnd = useCallback(() => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDragOverPosition(null);
  }, []);

  const visibleNodes = useMemo(
    () => buildVisibleNodes(nodes, focusModeNodeId, collapsedNodes),
    [nodes, focusModeNodeId, collapsedNodes],
  );

  return (
    <div onContextMenu={(e) => onContextMenu(e, -1)}>
      {visibleNodes.map(({ node, depth, hasChildren, isCollapsed }) => (
        <div
          key={node.id}
          draggable
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id, depth)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) {
              setDragOverNodeId(null);
              setDragOverPosition(null);
            }
          }}
          style={{ marginLeft: depth * 24 }}
          className={cn(
            "relative",
            draggedNodeId === node.id && "opacity-50",
            dragOverNodeId === node.id && dragOverPosition === "above" && "border-t-2 border-accent",
            dragOverNodeId === node.id && dragOverPosition === "below" && "border-b-2 border-accent",
            dragOverNodeId === node.id && dragOverPosition === "child" && "border-l-2 border-accent",
          )}
        >
          <OutlineNodeComponent
            node={node}
            depth={depth}
            hasChildren={hasChildren}
            isSelected={selectedNodeId === node.id}
            isSearchMatch={searchMatchIds?.includes(node.id) ?? false}
            isCollapsed={isCollapsed}
            onSelect={onSelectNode}
            onToggleCollapse={onToggleCollapse}
            onDoubleClickDot={onDoubleClickDot}
            onUpdateContent={onUpdateContent}
            onInsertAbove={onInsertAbove}
            onInsertBelow={onInsertBelow}
            onCreateChild={onCreateChild}
            onIndent={onIndent}
            onOutdent={onOutdent}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
            onFocus={onFocus}
          />
        </div>
      ))}
    </div>
  );
}
