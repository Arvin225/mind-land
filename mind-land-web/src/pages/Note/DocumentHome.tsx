import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  fetchFoldersAction,
  fetchDocumentsAction,
  setCurrentFolderId,
  setCurrentView,
} from "@/store/modules/outlineStore";
import ContentToolbar from "./ContentToolbar";
import ContentList from "./ContentList";
import CreateDialog from "./CreateDialog";

export default function DocumentHome() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentFolderId, currentView } = useSelector((s: RootState) => s.outline);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"document" | "folder">("document");

  useEffect(() => {
    dispatch(fetchFoldersAction());
  }, [dispatch]);

  useEffect(() => {
    const params: any = { page: 1, size: 50 };
    if (currentView === "favorite") params.favorite = true;
    else if (currentView === "recent") params.recent = true;
    else if (currentView === "trash") params.trash = true;
    else params.folderId = currentFolderId ?? 0;
    dispatch(fetchDocumentsAction(params));
  }, [dispatch, currentView, currentFolderId]);

  return (
    <div className="flex-1 h-full min-w-0 flex flex-col">
      <ContentToolbar
        currentFolderId={currentFolderId}
        currentView={currentView}
        onCreateDocument={() => { setCreateType("document"); setShowCreate(true); }}
        onCreateFolder={() => { setCreateType("folder"); setShowCreate(true); }}
      />
      <ContentList
        currentFolderId={currentFolderId}
        currentView={currentView}
        onFolderClick={(folderId) => {
          dispatch(setCurrentFolderId(folderId));
          dispatch(setCurrentView("all"));
        }}
      />
      {showCreate && (
        <CreateDialog
          onClose={() => setShowCreate(false)}
          defaultFolderId={currentFolderId}
          defaultType={createType}
        />
      )}
    </div>
  );
}
