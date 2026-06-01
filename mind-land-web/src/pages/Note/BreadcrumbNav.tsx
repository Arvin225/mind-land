import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { OutlineNode } from "@/apis/outline";

interface BreadcrumbNavProps {
  nodes: OutlineNode[];
  focusModeNodeId: number;
  onNavigate: (nodeId: number | null) => void;
}

export default function BreadcrumbNav({ nodes, focusModeNodeId, onNavigate }: BreadcrumbNavProps) {
  const path = useMemo(() => {
    const result: Array<{ id: number | null; label: string }> = [];
    let current = nodes.find((n) => n.id === focusModeNodeId);
    while (current) {
      result.unshift({ id: current.id, label: current.content || "(空)" });
      current = nodes.find((n) => n.id === current!.parentId);
    }
    result.unshift({ id: null, label: "文档根" });
    return result;
  }, [nodes, focusModeNodeId]);

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-surface text-xs text-text-muted shrink-0">
      {path.map((item, i) => (
        <span key={item.id ?? "root"} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-text-muted/40" />}
          <button
            onClick={() => onNavigate(item.id)}
            className="hover:text-text-primary hover:bg-hover rounded-lg px-1.5 py-0.5 transition-colors max-w-[160px] truncate"
            title={item.label}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  );
}
