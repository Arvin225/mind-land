import { LayoutNode } from "./mindmap-layout";

const FONT_SIZE = 13;
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif";
const BORDER_RADIUS = 8;

const DEPTH_COLORS = ["#D4A574", "#A8C8D8", "#E8B4B9"];

function getThemeColors(): { text: string; surface: string; border: string } {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue("--text-primary").trim() || "#1A1A1A",
    surface: style.getPropertyValue("--surface").trim() || "#FFFFFF",
    border: style.getPropertyValue("--border").trim() || "rgba(0,0,0,0.1)",
  };
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return "(empty)";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "...").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function renderConnection(ctx: CanvasRenderingContext2D, parent: LayoutNode, child: LayoutNode, lineColor: string) {
  const sx = parent.x + parent.width;
  const sy = parent.y + parent.height / 2;
  const ex = child.x;
  const ey = child.y + child.height / 2;
  const mx = (sx + ex) / 2;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx, sy, mx, (sy + ey) / 2);
  ctx.quadraticCurveTo(mx, ey, ex, ey);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderNode(
  ctx: CanvasRenderingContext2D,
  node: LayoutNode,
  selectedId: number | null,
  colors: { text: string; surface: string; border: string },
) {
  const { x, y, width, height, depth, content, isCollapsed, totalChildCount } = node;
  const isSelected = selectedId === node.id;
  const themeColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  ctx.beginPath();
  ctx.roundRect(x, y, width, height, BORDER_RADIUS);
  ctx.fillStyle = hexToRgba(themeColor, 0.1);
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = "#D4A574";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(212,165,116,0.5)";
    ctx.shadowBlur = 12;
  } else {
    ctx.strokeStyle = hexToRgba(themeColor, 0.4);
    ctx.lineWidth = 1;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = colors.text;
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const displayText = truncateText(ctx, content, width - 20);
  ctx.fillText(displayText, x + 10, y + height / 2);

  if (isCollapsed && totalChildCount > 0) {
    ctx.fillStyle = colors.text;
    ctx.font = `bold ${FONT_SIZE - 2}px ${FONT_FAMILY}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`+${totalChildCount}`, x + width - 6, y + height - 4);
  }
}

export function renderMindMap(
  ctx: CanvasRenderingContext2D,
  roots: LayoutNode[],
  selectedId: number | null,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  const colors = getThemeColors();

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const stack: LayoutNode[] = [...roots];
  while (stack.length > 0) {
    const node = stack.pop()!;
    for (const child of node.children) {
      renderConnection(ctx, node, child, colors.border);
      stack.push(child);
    }
  }

  const nodeStack: LayoutNode[] = [...roots];
  while (nodeStack.length > 0) {
    const node = nodeStack.pop()!;
    renderNode(ctx, node, selectedId, colors);
    for (const child of node.children) {
      nodeStack.push(child);
    }
  }

  ctx.restore();
}

export function findNodeAt(
  roots: LayoutNode[],
  mouseX: number,
  mouseY: number,
  offsetX: number,
  offsetY: number,
  scale: number,
): LayoutNode | null {
  const wx = (mouseX - offsetX) / scale;
  const wy = (mouseY - offsetY) / scale;

  const allNodes: LayoutNode[] = [];
  const stack: LayoutNode[] = [...roots];
  while (stack.length > 0) {
    const n = stack.pop()!;
    allNodes.push(n);
    for (const c of n.children) stack.push(c);
  }

  for (let i = allNodes.length - 1; i >= 0; i--) {
    const n = allNodes[i];
    if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
      return n;
    }
  }

  return null;
}
