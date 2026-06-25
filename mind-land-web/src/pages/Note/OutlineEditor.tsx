import { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  addNode,
  addChildNode,
  insertNodeAbove,
  indentNode,
  outdentNode,
  deleteNode,
  moveNodeUp,
  moveNodeDown,
  updateNodeContent,
  setSelectedNode,
  setFocusMode,
  setMindMapView,
  setNodes,
  setDocumentTitle,
  saveNodesAction,
  moveNode,
} from "@/store/modules/outlineStore";
import { OutlineNode } from "@/apis/outline";
import OutlineTree from "@/components/outline/OutlineTree";
import BreadcrumbBar from "./BreadcrumbBar";
import ShortcutHelp from "./ShortcutHelp";
import BreadcrumbNav from "./BreadcrumbNav";
import MindMapView from "./MindMapView";
import InDocSearchBar from "./InDocSearchBar";
import VersionHistoryPanel from "./VersionHistoryPanel";
import { Network, ListTree, MoreHorizontal, History } from "lucide-react";

export default function OutlineEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    nodes,
    selectedNodeId,
    focusModeNodeId,
    currentDocumentId,
    saveStatus,
    isMindMapView,
    isReadOnly,
  } = useSelector((s: RootState) => s.outline);

  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [searchMatchIds, setSearchMatchIds] = useState<number[]>([]);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const documents = useSelector((s: RootState) => s.outline.documents);
  const title = useSelector((s: RootState) => s.outline.currentDocumentTitle) ||
    documents.find((d) => d.id === currentDocumentId)?.title || "无标题";

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setDocumentTitle(e.target.value));
    },
    [dispatch],
  );

  const finishTitleEdit = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const undoStack = useRef<OutlineNode[][]>([]);
  const redoStack = useRef<OutlineNode[][]>([]);

  const pushSnapshot = useCallback(() => {
    undoStack.current.push(JSON.parse(JSON.stringify(nodesRef.current)));
    if (undoStack.current.length > 50) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    redoStack.current.push(JSON.parse(JSON.stringify(nodesRef.current)));
    const snapshot = undoStack.current.pop()!;
    dispatch(setNodes(snapshot));
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    undoStack.current.push(JSON.parse(JSON.stringify(nodesRef.current)));
    const snapshot = redoStack.current.pop()!;
    dispatch(setNodes(snapshot));
  }, [dispatch]);

  // Auto-save debounce
  useEffect(() => {
    if (!currentDocumentId || saveStatus !== "unsaved" || isReadOnly) return;

    const timer = setTimeout(() => {
      dispatch(saveNodesAction(currentDocumentId));
    }, 800);

    return () => clearTimeout(timer);
  }, [saveStatus, currentDocumentId, dispatch, isReadOnly]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isReadOnly) return;
      const target = e.target as HTMLElement;
      const isInNode = !!target.closest("[data-node-id]");

      // Undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo
      if ((e.ctrlKey && e.key === "z" && e.shiftKey) || (e.ctrlKey && e.key === "y")) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (currentDocumentId) {
          dispatch(saveNodesAction(currentDocumentId));
        }
        return;
      }

      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setShowSearchBar((prev) => !prev);
        return;
      }

      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        setShowShortcutHelp((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        if (showShortcutHelp) {
          setShowShortcutHelp(false);
          return;
        }
        if (showSearchBar) {
          setShowSearchBar(false);
          setSearchMatchIds([]);
          return;
        }
        if (showVersionHistory) {
          setShowVersionHistory(false);
          return;
        }
        if (focusModeNodeId !== null) {
          dispatch(setFocusMode(null));
          return;
        }
        return;
      }

      if (e.ctrlKey && e.key === "[") {
        e.preventDefault();
        dispatch(setFocusMode(null));
        return;
      }

      if (!isInNode || selectedNodeId === null) return;

      switch (e.key) {
        case "Enter": {
          e.preventDefault();
          pushSnapshot();
          dispatch(addNode(selectedNodeId));
          break;
        }
        case "Tab": {
          e.preventDefault();
          pushSnapshot();
          if (e.shiftKey) {
            dispatch(outdentNode(selectedNodeId));
          } else {
            dispatch(indentNode(selectedNodeId));
          }
          break;
        }
        case "Backspace": {
          const node = nodes.find((n) => n.id === selectedNodeId);
          if (node && node.content === "") {
            e.preventDefault();
            pushSnapshot();
            const prev = nodes
              .filter((n) => n.parentId === node.parentId && n.sortOrder < node.sortOrder)
              .sort((a, b) => b.sortOrder - a.sortOrder)[0];
            dispatch(deleteNode(selectedNodeId));
            if (prev) {
              dispatch(setSelectedNode(prev.id));
            }
          }
          break;
        }
        case "Delete": {
          e.preventDefault();
          pushSnapshot();
          dispatch(deleteNode(selectedNodeId));
          break;
        }
      }

      if (e.altKey) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          pushSnapshot();
          dispatch(moveNodeUp(selectedNodeId));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          pushSnapshot();
          dispatch(moveNodeDown(selectedNodeId));
        }
      }
    },
    [dispatch, selectedNodeId, currentDocumentId, focusModeNodeId, nodes, showShortcutHelp, handleUndo, handleRedo, pushSnapshot, isReadOnly],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus newly selected node's contentEditable
  useEffect(() => {
    if (selectedNodeId === null) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${selectedNodeId}"] [contenteditable]`) as HTMLElement | null;
      el?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedNodeId]);

  useEffect(() => {
    if (!contextMenuPos) return;
    const handler = () => setContextMenuPos(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenuPos]);

  const handleSelectNode = useCallback(
    (id: number) => dispatch(setSelectedNode(id)),
    [dispatch],
  );

  const handleToggleCollapse = useCallback((id: number) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDoubleClickDot = useCallback(
    (id: number) => dispatch(setFocusMode(id === focusModeNodeId ? null : id)),
    [dispatch, focusModeNodeId],
  );

  const handleUpdateContent = useCallback(
    (id: number, content: string) => {
      pushSnapshot();
      dispatch(updateNodeContent({ id, content }));
    },
    [dispatch, pushSnapshot],
  );

  const handleContextMenu = useCallback(
    (_e: React.MouseEvent, _id: number) => {
      // context menu handled in OutlineNode via onContextMenu
    },
    [],
  );

  const handleInsertAbove = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(insertNodeAbove(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleInsertBelow = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(addNode(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleCreateChild = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(addChildNode(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleIndent = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(indentNode(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleOutdent = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(outdentNode(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleMoveUp = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(moveNodeUp(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleMoveDown = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(moveNodeDown(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleDelete = useCallback(
    (id: number) => {
      pushSnapshot();
      dispatch(deleteNode(id));
    },
    [dispatch, pushSnapshot],
  );

  const handleFocus = useCallback(
    (id: number) => dispatch(setFocusMode(id)),
    [dispatch],
  );

  const handleMoveNode = useCallback(
    (nodeId: number, targetNodeId: number, position: "above" | "below" | "child") => {
      pushSnapshot();
      dispatch(moveNode({ nodeId, targetNodeId, position }));
    },
    [dispatch, pushSnapshot],
  );

  const handleSearchStateChange = useCallback(
    (_query: string, matchIds: number[]) => {
      setSearchMatchIds(matchIds);
    },
    [],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Merged breadcrumb + editor controls */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <BreadcrumbBar />
        </div>
        <div className="flex items-center gap-1 shrink-0 px-4 py-2">
          {isReadOnly && (
            <span className="text-xs text-text-muted bg-red-500/10 text-red-500 px-2 py-0.5 rounded">只读</span>
          )}
          <button
            onClick={() => dispatch(setMindMapView(!isMindMapView))}
            className={`p-1.5 rounded-lg transition-colors ${
              isMindMapView
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:text-text-primary hover:bg-hover"
            }`}
            title={isMindMapView ? "切换到大纲视图" : "切换到脑图视图"}
          >
            {isMindMapView ? <ListTree size={16} /> : <Network size={16} />}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors cursor-pointer"
              title="更多"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-surface border border-border rounded-xl shadow-xl py-1">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowVersionHistory(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-hover transition-colors text-xs text-text-primary"
                  >
                    <History size={14} />
                    版本历史
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Document title — aligned with first-level node dot */}
      <div className="max-w-[1000px] mx-auto w-full pl-[52px] pr-4 pt-3 pb-2">
        {isEditingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={handleTitleChange}
            onBlur={finishTitleEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") finishTitleEdit();
            }}
            className="w-full bg-transparent px-1 py-0.5 text-[34px] font-bold text-text-primary focus:outline-none"
          />
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            className="text-[34px] font-bold text-text-primary cursor-text rounded-lg px-1.5 py-0.5 transition-colors"
          >
            {title}
          </h1>
        )}
      </div>

      {showSearchBar && (
        <InDocSearchBar
          onClose={() => {
            setShowSearchBar(false);
            setSearchMatchIds([]);
          }}
          onSearchStateChange={handleSearchStateChange}
        />
      )}

      {focusModeNodeId !== null && !isMindMapView && (
        <BreadcrumbNav
          nodes={nodes}
          focusModeNodeId={focusModeNodeId}
          onNavigate={(id) => dispatch(setFocusMode(id))}
        />
      )}

      {isMindMapView ? (
        <div className="flex-1 overflow-hidden">
          <MindMapView
            nodes={nodes}
            collapsedNodes={collapsedNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onDoubleClickNode={(id) => {
              dispatch(setMindMapView(false));
              dispatch(setSelectedNode(id));
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto">
            <OutlineTree
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            collapsedNodes={collapsedNodes}
            focusModeNodeId={focusModeNodeId}
            searchMatchIds={searchMatchIds}
            onSelectNode={handleSelectNode}
            onToggleCollapse={handleToggleCollapse}
            onDoubleClickDot={handleDoubleClickDot}
            onUpdateContent={handleUpdateContent}
            onContextMenu={handleContextMenu}
            onInsertAbove={handleInsertAbove}
            onInsertBelow={handleInsertBelow}
            onCreateChild={handleCreateChild}
            onIndent={handleIndent}
            onOutdent={handleOutdent}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDelete={handleDelete}
            onFocus={handleFocus}
            onMoveNode={handleMoveNode}
          />
          </div>
        </div>
      )}

      {showShortcutHelp && (
        <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />
      )}

      {showVersionHistory && (
        <VersionHistoryPanel onClose={() => setShowVersionHistory(false)} />
      )}
    </div>
  );
}
