import { useCallback, useRef } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from "lucide-react";
import { OutlineDocument, OutlineFolder } from "@/apis/outline";

interface FolderTreeItemProps {
  folder: OutlineFolder;
  depth: number;
  allFolders: OutlineFolder[];
  allDocuments: OutlineDocument[];
  expandedFolders: Set<number>;
  renamingId: number | null;
  renameValue: string;
  documents: OutlineDocument[];
  currentFolderId: number | null;
  currentDocumentId: number | null;
  onToggleExpand: (id: number) => void;
  onSelectFolder: (folder: OutlineFolder) => void;
  onSelectDocument: (doc: OutlineDocument) => void;
  onContextMenu: (e: React.MouseEvent, folder: OutlineFolder) => void;
  onRenameChange: (value: string) => void;
  onSubmitRename: (folder: OutlineFolder) => void;
}

export default function FolderTreeItem({
  folder,
  depth,
  allFolders,
  allDocuments,
  expandedFolders,
  renamingId,
  renameValue,
  documents,
  currentFolderId,
  currentDocumentId,
  onToggleExpand,
  onSelectFolder,
  onSelectDocument,
  onContextMenu,
  onRenameChange,
  onSubmitRename,
}: FolderTreeItemProps) {
  const children = allFolders
    .filter((f) => f.parentId === folder.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const hasChildren = children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(folder.id);
    },
    [folder.id, onToggleExpand]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onSubmitRename(folder);
      } else if (e.key === "Escape") {
        onRenameChange(folder.name);
      }
    },
    [folder, onSubmitRename, onRenameChange]
  );

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-hover transition-colors cursor-pointer ${
          currentFolderId === folder.id ? "bg-accent/10 text-accent" : "text-text-secondary"
        }`}
        style={{ paddingLeft: depth * 16 + 12 }}
        onClick={() => onSelectFolder(folder)}
        onContextMenu={(e) => onContextMenu(e, folder)}
        data-drop-target="folder"
        data-folder-id={folder.id}
      >
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0 cursor-pointer"
          onClick={handleToggleExpand}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </div>
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-text-muted shrink-0" />
        )}
        {renamingId === folder.id ? (
          <input
            ref={inputRef}
            className="flex-1 text-sm bg-transparent border border-accent rounded px-1 outline-none text-text-primary min-w-0"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSubmitRename(folder)}
            autoFocus
          />
        ) : (
          <span className="text-sm truncate flex-1">
            {folder.name}
          </span>
        )}
      </div>
      {isExpanded && (
        <div>
          {children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              allFolders={allFolders}
              allDocuments={allDocuments}
              documents={allDocuments.filter(d => d.folderId === child.id)}
              expandedFolders={expandedFolders}
              renamingId={renamingId}
              renameValue={renameValue}
              currentFolderId={currentFolderId}
              currentDocumentId={currentDocumentId}
              onToggleExpand={onToggleExpand}
              onSelectFolder={onSelectFolder}
              onSelectDocument={onSelectDocument}
              onContextMenu={onContextMenu}
              onRenameChange={onRenameChange}
              onSubmitRename={onSubmitRename}
            />
          ))}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-hover transition-colors cursor-pointer text-sm ${
                currentDocumentId === doc.id ? "bg-accent/10 text-accent" : "text-text-secondary"
              }`}
              style={{ paddingLeft: (depth + 1) * 16 + 28 }}
              onClick={() => onSelectDocument(doc)}
            >
              <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className="text-sm truncate">{doc.title || "未命名"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
