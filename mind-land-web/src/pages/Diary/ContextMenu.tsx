import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

function clampPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
) {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Horizontal: clamp to keep menu fully within viewport
  let left = Math.min(x, viewportW - menuWidth - 8);
  left = Math.max(8, left);

  // Vertical: prefer below trigger, flip above if insufficient space
  let top: number;
  if (y + menuHeight <= viewportH - 8) {
    // Enough space below → show below
    top = y;
  } else if (y - menuHeight >= 8) {
    // Not enough below, but enough above → flip above
    top = y - menuHeight;
  } else {
    // Neither fits perfectly → clamp to bottom
    top = Math.max(8, viewportH - menuHeight - 8);
  }

  return { left, top };
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Estimate menu dimensions for positioning
  const estHeight = items.length * 42 + 8; // py-1(8) + each item ~42px
  const estWidth = 180;
  const { left, top } = clampPosition(x, y, estWidth, estHeight);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface border border-[--border] rounded-lg shadow-lg py-1 min-w-[120px]"
      style={{ left, top }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg transition-colors",
            "hover:bg-hover",
            item.danger ? "text-red-500" : "text-[--foreground]"
          )}
          onClick={() => { item.onClick(); onClose() }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return createPortal(menu, document.body);
}
