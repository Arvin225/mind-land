import { useEffect, useRef } from "react";
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

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 40);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface border border-[--border] rounded-lg shadow-lg py-1 min-w-[120px]"
      style={{ left: adjustedX, top: adjustedY }}
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
}
