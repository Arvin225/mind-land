import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { openDocumentAction, fetchFoldersAction, fetchAllDocumentsAction } from "@/store/modules/outlineStore";
import BreadcrumbBar from "./BreadcrumbBar";
import FolderTreePanel from "./FolderTreePanel";
import DocumentHome from "./DocumentHome";
import OutlineEditor from "./OutlineEditor";

export default function Note() {
  const { docId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const viewMode = useSelector((s: RootState) => s.outline.viewMode);

  useEffect(() => {
    dispatch(fetchFoldersAction());
    dispatch(fetchAllDocumentsAction());
  }, [dispatch]);

  useEffect(() => {
    if (docId) {
      dispatch(openDocumentAction(Number(docId)));
    }
  }, [docId, dispatch]);

  return (
    <div className="h-full flex">
      <FolderTreePanel />
      <div className="flex-1 flex flex-col min-w-0">
        {viewMode !== "editor" && <BreadcrumbBar />}
        {viewMode === "editor" ? <OutlineEditor /> : <DocumentHome />}
      </div>
    </div>
  );
}
