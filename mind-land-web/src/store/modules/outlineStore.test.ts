import { describe, it, expect } from "vitest";
import outlineReducer, {
  addNode,
  indentNode,
  outdentNode,
  deleteNode,
  collapseNode,
  expandNode,
  setFocusMode,
} from "./outlineStore";
import type { OutlineState } from "./outlineStore";
import type { OutlineNode } from "@/apis/outline";

function createNode(overrides: Partial<OutlineNode>): OutlineNode {
  return {
    id: 0,
    documentId: 1,
    content: "",
    parentId: 0,
    sortOrder: 0,
    isCollapsed: false,
    note: "",
    del: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function createState(overrides?: Partial<OutlineState>): OutlineState {
  return {
    folders: [],
    documents: [],
    nodes: [],
    currentDocumentId: null,
    currentDocumentTitle: "",
    selectedNodeId: null,
    focusModeNodeId: null,
    currentView: "all",
    viewMode: "home",
    isMindMapView: false,
    saveStatus: "",
    searchQuery: "",
    searchResults: [],
    versions: [],
    docListTotal: 0,
    loading: false,
    currentFolderId: null,
    breadcrumbPath: [],
    allDocuments: [],
    ...overrides,
  } as OutlineState;
}

describe("outlineStore sync reducers", () => {
  describe("addNode", () => {
    it("inserts a new empty node after the target node and shifts siblings", () => {
      const state = createState({
        nodes: [
          createNode({ id: 1, content: "A", sortOrder: 0 }),
          createNode({ id: 2, content: "B", sortOrder: 1 }),
        ],
        currentDocumentId: 1,
      });

      const next = outlineReducer(state, addNode(1));
      expect(next.nodes).toHaveLength(3);

      const newNode = next.nodes.find((n) => n.content === "")!;
      expect(newNode.parentId).toBe(0);
      expect(newNode.sortOrder).toBe(1);

      const nodeA = next.nodes.find((n) => n.id === 1)!;
      const nodeB = next.nodes.find((n) => n.id === 2)!;
      expect(nodeA.sortOrder).toBe(0);
      expect(nodeB.sortOrder).toBe(2);
    });

    it("marks saveStatus as unsaved", () => {
      const state = createState({
        nodes: [createNode({ id: 1, content: "A" })],
        currentDocumentId: 1,
      });
      const next = outlineReducer(state, addNode(1));
      expect(next.saveStatus).toBe("unsaved");
    });
  });

  describe("indentNode", () => {
    it("makes the node a child of its previous sibling", () => {
      const state = createState({
        nodes: [
          createNode({ id: 1, content: "A", sortOrder: 0 }),
          createNode({ id: 2, content: "B", sortOrder: 1 }),
          createNode({ id: 3, content: "C", sortOrder: 2 }),
        ],
      });

      const next = outlineReducer(state, indentNode(2));
      const nodeB = next.nodes.find((n) => n.id === 2)!;
      expect(nodeB.parentId).toBe(1);
      expect(nodeB.sortOrder).toBe(0);
    });

    it("does nothing if node is the first sibling", () => {
      const state = createState({
        nodes: [
          createNode({ id: 1, content: "A", sortOrder: 0 }),
          createNode({ id: 2, content: "B", sortOrder: 1 }),
        ],
      });

      const next = outlineReducer(state, indentNode(1));
      expect(next.nodes).toHaveLength(2);
      expect(next.nodes.find((n) => n.id === 1)!.parentId).toBe(0);
    });
  });

  describe("outdentNode", () => {
    it("moves the node to be a sibling of its parent", () => {
      const state = createState({
        nodes: [
          createNode({ id: 1, content: "A", sortOrder: 0 }),
          createNode({ id: 2, content: "B", parentId: 1, sortOrder: 0 }),
          createNode({ id: 3, content: "C", sortOrder: 1 }),
        ],
      });

      const next = outlineReducer(state, outdentNode(2));
      const nodeB = next.nodes.find((n) => n.id === 2)!;
      expect(nodeB.parentId).toBe(0);
      expect(nodeB.sortOrder).toBe(1);
    });

    it("does nothing if node has no parent", () => {
      const state = createState({
        nodes: [createNode({ id: 1, content: "A", sortOrder: 0 })],
      });

      const next = outlineReducer(state, outdentNode(1));
      expect(next.nodes.find((n) => n.id === 1)!.parentId).toBe(0);
    });
  });

  describe("deleteNode", () => {
    it("deletes the node and all its descendants", () => {
      const state = createState({
        nodes: [
          createNode({ id: 1, content: "A", sortOrder: 0 }),
          createNode({ id: 2, content: "B", parentId: 1, sortOrder: 0 }),
          createNode({ id: 3, content: "C", parentId: 2, sortOrder: 0 }),
          createNode({ id: 4, content: "D", sortOrder: 1 }),
        ],
      });

      const next = outlineReducer(state, deleteNode(1));
      expect(next.nodes).toHaveLength(1);
      expect(next.nodes[0].id).toBe(4);
    });

    it("reorders remaining siblings after deletion", () => {
      const state = createState({
        nodes: [
          createNode({ id: 1, content: "A", sortOrder: 0 }),
          createNode({ id: 2, content: "B", sortOrder: 1 }),
          createNode({ id: 3, content: "C", sortOrder: 2 }),
        ],
      });

      const next = outlineReducer(state, deleteNode(2));
      expect(next.nodes).toHaveLength(2);
      expect(next.nodes.find((n) => n.id === 3)!.sortOrder).toBe(1);
    });

    it("clears selectedNodeId if deleted node was selected", () => {
      const state = createState({
        nodes: [createNode({ id: 1 })],
        selectedNodeId: 1,
      });

      const next = outlineReducer(state, deleteNode(1));
      expect(next.selectedNodeId).toBeNull();
    });

    it("clears focusModeNodeId if deleted node was focused", () => {
      const state = createState({
        nodes: [createNode({ id: 1 }), createNode({ id: 2, parentId: 1 })],
        focusModeNodeId: 2,
      });

      const next = outlineReducer(state, deleteNode(1));
      expect(next.focusModeNodeId).toBeNull();
    });
  });

  describe("collapseNode / expandNode", () => {
    it("collapseNode sets isCollapsed to true", () => {
      const state = createState({
        nodes: [createNode({ id: 1, isCollapsed: false })],
      });

      const next = outlineReducer(state, collapseNode(1));
      expect(next.nodes[0].isCollapsed).toBe(true);
    });

    it("expandNode sets isCollapsed to false", () => {
      const state = createState({
        nodes: [createNode({ id: 1, isCollapsed: true })],
      });

      const next = outlineReducer(state, expandNode(1));
      expect(next.nodes[0].isCollapsed).toBe(false);
    });
  });

  describe("setFocusMode", () => {
    it("sets focusModeNodeId", () => {
      const state = createState();
      const next = outlineReducer(state, setFocusMode(5));
      expect(next.focusModeNodeId).toBe(5);
    });

    it("clears focusModeNodeId when called with null", () => {
      const state = createState({ focusModeNodeId: 5 });
      const next = outlineReducer(state, setFocusMode(null));
      expect(next.focusModeNodeId).toBeNull();
    });
  });
});
