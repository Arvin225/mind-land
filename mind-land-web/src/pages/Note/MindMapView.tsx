import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { OutlineNode } from "@/apis/outline";
import { computeLayout } from "./mindmap-layout";
import { renderMindMap, findNodeAt } from "./mindmap-renderer";

interface MindMapViewProps {
  nodes: OutlineNode[];
  collapsedNodes: Set<number>;
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
  onDoubleClickNode: (id: number) => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.0;

export default function MindMapView({
  nodes,
  collapsedNodes,
  selectedNodeId,
  onSelectNode,
  onDoubleClickNode,
}: MindMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(0.8);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
  });

  const rafRef = useRef(0);
  const hasAutoFitted = useRef(false);

  const layout = useMemo(() => computeLayout(nodes, collapsedNodes), [nodes, collapsedNodes]);

  useEffect(() => {
    if (layout.length === 0 || hasAutoFitted.current) return;
    hasAutoFitted.current = true;

    const container = containerRef.current;
    if (!container) return;

    const { width: cw, height: ch } = container.getBoundingClientRect();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const stack = [...layout];
    while (stack.length > 0) {
      const n = stack.pop()!;
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
      for (const c of n.children) stack.push(c);
    }

    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 80;

    const fitScale = Math.min((cw - padding) / contentW, (ch - padding) / contentH, 1.5);

    setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale)));
    setOffsetX((cw - contentW * fitScale) / 2 - minX * fitScale);
    setOffsetY((ch - contentH * fitScale) / 2 - minY * fitScale);
  }, [layout]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    renderMindMap(ctx, layout, selectedNodeId, offsetX, offsetY, scale);

    rafRef.current = requestAnimationFrame(render);
  }, [offsetX, offsetY, scale, selectedNodeId, layout]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  useEffect(() => {
    const onResize = () => render();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.offsetX = offsetX;
    dragRef.current.offsetY = offsetY;
    dragRef.current.dragging = false;
  }, [offsetX, offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    if (!dragRef.current.dragging) {
      const dx = Math.abs(e.clientX - dragRef.current.startX);
      const dy = Math.abs(e.clientY - dragRef.current.startY);
      if (dx < 3 && dy < 3) return;
      dragRef.current.dragging = true;
    }
    setOffsetX(dragRef.current.offsetX + e.clientX - dragRef.current.startX);
    setOffsetY(dragRef.current.offsetY + e.clientY - dragRef.current.startY);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const hit = findNodeAt(layout, e.clientX - rect.left, e.clientY - rect.top, offsetX, offsetY, scale);
      if (hit) onSelectNode(hit.id);
    }
    dragRef.current.dragging = false;
  }, [offsetX, offsetY, scale, onSelectNode, layout]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hit = findNodeAt(layout, e.clientX - rect.left, e.clientY - rect.top, offsetX, offsetY, scale);
    if (hit) onDoubleClickNode(hit.id);
  }, [offsetX, offsetY, scale, onDoubleClickNode, layout]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const factor = Math.max(0.5, Math.min(2, 1 + delta));
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setOffsetX(mouseX - ((mouseX - offsetX) / scale) * newScale);
    setOffsetY(mouseY - ((mouseY - offsetY) / scale) * newScale);
    setScale(newScale);
  }, [scale, offsetX, offsetY]);

  const zoomAtCenter = useCallback((factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    setOffsetX(cx - ((cx - offsetX) / scale) * newScale);
    setOffsetY(cy - ((cy - offsetY) / scale) * newScale);
    setScale(newScale);
  }, [scale, offsetX, offsetY]);

  const handleFit = useCallback(() => {
    if (layout.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    const { width: cw, height: ch } = container.getBoundingClientRect();

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const stack = [...layout];
    while (stack.length > 0) {
      const n = stack.pop()!;
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
      for (const c of n.children) stack.push(c);
    }

    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 80;

    const fitScale = Math.min((cw - padding) / contentW, (ch - padding) / contentH, 1.5);
    setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale)));
    setOffsetX((cw - contentW * fitScale) / 2 - minX * fitScale);
    setOffsetY((ch - contentH * fitScale) / 2 - minY * fitScale);
  }, [layout]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 surface-card rounded-lg p-1 shadow-lg">
        <button
          onClick={() => zoomAtCenter(1.2)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors text-text-secondary hover:text-text-primary text-sm font-medium cursor-pointer"
          title="放大"
        >
          +
        </button>
        <button
          onClick={() => zoomAtCenter(1 / 1.2)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors text-text-secondary hover:text-text-primary text-sm font-medium cursor-pointer"
          title="缩小"
        >
          −
        </button>
        <div className="w-full h-px bg-border my-0.5" />
        <button
          onClick={handleFit}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors text-text-secondary hover:text-text-primary text-xs cursor-pointer"
          title="适应屏幕"
        >
          ⊞
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-xs text-text-muted bg-surface/80 px-2 py-1 rounded-lg">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
