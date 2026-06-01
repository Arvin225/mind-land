import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  fetchDocumentsAction,
  openDocumentAction,
  setSelectedNode,
} from "@/store/modules/outlineStore";
import { GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MindMapView from "@/pages/Note/MindMapView";

export default function MindMap() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { documents, nodes, currentDocumentId, selectedNodeId } = useSelector(
    (s: RootState) => s.outline,
  );
  const [collapsedNodes] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    dispatch(fetchDocumentsAction({ recent: true, page: 1, size: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (documents.length > 0 && !currentDocumentId && !loaded) {
      setLoaded(true);
      dispatch(openDocumentAction(documents[0].id));
    }
    if (documents.length === 0) {
      setLoaded(true);
    }
  }, [documents, currentDocumentId, dispatch, loaded]);

  const hasContent = nodes.length > 0 && currentDocumentId !== null;

  if (!hasContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <GitBranch className="w-16 h-16 text-foreground/20 mb-6" />
        <h2 className="text-2xl font-serif-display text-foreground/80 mb-3">脑图</h2>
        <p className="text-text-secondary max-w-md leading-relaxed">
          还没有大纲文档，请先创建文档后在文档中切换到脑图视图。
        </p>
        <button
          onClick={() => navigate("/note")}
          className="mt-8 px-5 py-2.5 rounded-lg bg-[#D4A574] text-white text-sm font-medium hover:bg-[#c49564] transition-colors cursor-pointer"
        >
          前往大纲笔记
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <MindMapView
        nodes={nodes}
        collapsedNodes={collapsedNodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={(id) => dispatch(setSelectedNode(id))}
        onDoubleClickNode={() => {}}
      />
    </div>
  );
}
