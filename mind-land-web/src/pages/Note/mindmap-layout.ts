import { OutlineNode } from "@/apis/outline";

export interface LayoutNode {
  id: number;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode[];
  isCollapsed: boolean;
  depth: number;
  totalChildCount: number;
}

const LEVEL_GAP = 120;
const NODE_GAP = 24;
const NODE_W = 160;
const NODE_H = 40;
const MARGIN = 40;
const ROOT_GAP = 48;

export function computeLayout(nodes: OutlineNode[], collapsedNodes: Set<number>): LayoutNode[] {
  if (nodes.length === 0) return [];

  const childrenMap = new Map<number, OutlineNode[]>();
  for (const node of nodes) {
    if (!childrenMap.has(node.parentId)) {
      childrenMap.set(node.parentId, []);
    }
    childrenMap.get(node.parentId)!.push(node);
  }

  for (const [, children] of childrenMap) {
    children.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const nodeMap = new Map<number, OutlineNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const layoutNodes = new Map<number, LayoutNode>();
  const subtreeHeights = new Map<number, number>();

  function computeHeight(nodeId: number, depth: number): number {
    const rawChildren = childrenMap.get(nodeId) || [];
    const isCollapsed = collapsedNodes.has(nodeId) && depth > 0;
    const children = isCollapsed ? [] : rawChildren;

    if (children.length === 0) {
      subtreeHeights.set(nodeId, NODE_H);
      return NODE_H;
    }

    let total = 0;
    for (const child of children) {
      total += computeHeight(child.id, depth + 1);
    }
    total += (children.length - 1) * NODE_GAP;
    total = Math.max(total, NODE_H);

    subtreeHeights.set(nodeId, total);
    return total;
  }

  function assignPosition(nodeId: number, x: number, centerY: number, depth: number) {
    const outlineNode = nodeMap.get(nodeId)!;
    const rawChildren = childrenMap.get(nodeId) || [];
    const isCollapsed = collapsedNodes.has(nodeId) && depth > 0;
    const children = isCollapsed ? [] : rawChildren;

    const lNode: LayoutNode = {
      id: nodeId,
      content: outlineNode.content,
      x,
      y: centerY - NODE_H / 2,
      width: NODE_W,
      height: NODE_H,
      children: [],
      isCollapsed,
      depth,
      totalChildCount: rawChildren.length,
    };
    layoutNodes.set(nodeId, lNode);

    if (children.length === 0) return;

    const totalChildHeight = subtreeHeights.get(nodeId)!;
    const startY = centerY - totalChildHeight / 2;

    let currentY = startY;
    for (const child of children) {
      const childHeight = subtreeHeights.get(child.id)!;
      assignPosition(child.id, x + LEVEL_GAP, currentY + childHeight / 2, depth + 1);
      lNode.children.push(layoutNodes.get(child.id)!);
      currentY += childHeight + NODE_GAP;
    }
  }

  const roots = childrenMap.get(0) || [];
  const result: LayoutNode[] = [];

  let currentY = MARGIN;
  for (const root of roots) {
    computeHeight(root.id, 0);
    assignPosition(root.id, MARGIN, currentY + subtreeHeights.get(root.id)! / 2, 0);
    result.push(layoutNodes.get(root.id)!);
    currentY += subtreeHeights.get(root.id)! + ROOT_GAP;
  }

  return result;
}
