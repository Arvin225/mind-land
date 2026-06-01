import ContextMenu from "@/pages/Diary/ContextMenu";

interface NodeContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onCreateChild: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopy: () => void;
  onPaste: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFocus: () => void;
  onDelete: () => void;
}

export default function NodeContextMenu({
  x, y, onClose,
  onInsertAbove, onInsertBelow, onCreateChild,
  onIndent, onOutdent,
  onMoveUp, onMoveDown,
  onCopy, onPaste,
  isCollapsed, onToggleCollapse,
  onFocus,
  onDelete,
}: NodeContextMenuProps) {
  return (
    <ContextMenu
      x={x}
      y={y}
      onClose={onClose}
      items={[
        { label: "插入上方", onClick: onInsertAbove },
        { label: "插入下方", onClick: onInsertBelow },
        { label: "创建子节点", onClick: onCreateChild },
        { label: "缩进", onClick: onIndent },
        { label: "提升", onClick: onOutdent },
        { label: "上移", onClick: onMoveUp },
        { label: "下移", onClick: onMoveDown },
        { label: "复制", onClick: onCopy },
        { label: "粘贴", onClick: onPaste },
        { label: "添加备注", onClick: () => {} },
        { label: isCollapsed ? "展开" : "折叠", onClick: onToggleCollapse },
        { label: "聚焦", onClick: onFocus },
        { label: "删除", onClick: onDelete, danger: true },
      ]}
    />
  );
}
