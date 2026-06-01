import { useSelector } from "react-redux";
import { RootState } from "@/store";
import DocumentCard from "./DocumentCard";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

interface DocumentListProps {
  onCreateDocument: () => void;
}

export default function DocumentList({ onCreateDocument }: DocumentListProps) {
  const { documents, loading, docListTotal } = useSelector(
    (s: RootState) => s.outline
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">文档</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              className="bg-transparent outline-none text-sm text-text-primary w-32 placeholder:text-text-muted"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm"
            onClick={onCreateDocument}
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-text-muted">
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-text-muted">
            <span>暂无文档</span>
          </div>
        ) : (
          filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))
        )}
      </div>

      {docListTotal > 0 && (
        <div className="px-6 py-2 border-t border-border text-xs text-text-muted">
          共 {docListTotal} 篇文档
        </div>
      )}
    </div>
  );
}
