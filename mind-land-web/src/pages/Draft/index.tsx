import { FileText } from 'lucide-react';

function Draft() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <FileText className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">稿纸</h2>
            <p className="text-[--foreground]/50 max-w-md leading-relaxed">
                富文本写作工具。支持 Markdown 编辑、实时预览，专注写作体验。
            </p>
            <div className="mt-8 px-4 py-2 rounded-full border border-[--border] text-xs text-[--foreground]/40">
                Coming soon
            </div>
        </div>
    );
}
export default Draft;
