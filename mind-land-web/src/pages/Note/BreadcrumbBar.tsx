import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import {
  setCurrentFolderId,
  setCurrentView,
  fetchDocumentsAction,
  closeDocument,
  computeBreadcrumb,
} from "@/store/modules/outlineStore";
import { ChevronRight } from "lucide-react";

export default function BreadcrumbBar() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    currentFolderId,
    currentDocumentId,
    currentView,
    viewMode,
    folders,
    allDocuments,
  } = useSelector((s: RootState) => s.outline);

  const path = computeBreadcrumb(
    currentFolderId,
    currentDocumentId,
    currentView,
    viewMode,
    folders,
    allDocuments
  );

  const handleNavigate = useCallback(
    (item: { id: number; type: string }) => {
      if (item.type === "root") {
        dispatch(closeDocument());
        dispatch(setCurrentFolderId(null));
        dispatch(setCurrentView("all"));
        dispatch(fetchDocumentsAction({ page: 1, size: 50, folderId: 0 }));
      } else if (item.type === "folder") {
        dispatch(closeDocument());
        dispatch(setCurrentFolderId(item.id));
        dispatch(setCurrentView("all"));
        dispatch(fetchDocumentsAction({ folderId: item.id }));
      }
    },
    [dispatch]
  );

  return (
    <div className="flex items-center gap-1 px-4 py-2 text-xs">
      {path.map((item, i) => {
        const isLast = i === path.length - 1;
        return (
          <span key={`${item.type}-${item.id}`} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 text-text-muted/40 shrink-0" />
            )}
            {isLast ? (
              <span className="rounded-lg px-1.5 py-0.5 font-medium text-text-primary max-w-[160px] truncate">
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => handleNavigate(item)}
                className="rounded-lg px-1.5 py-0.5 hover:bg-hover transition-colors text-text-muted hover:text-text-primary max-w-[160px] truncate"
                title={item.name}
              >
                {item.name}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
