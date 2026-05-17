import { ListTree } from 'lucide-react';

function Note() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <ListTree className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">大纲笔记</h2>
            <p className="text-[--foreground]/50 max-w-md leading-relaxed">
                创建和编辑结构化的大纲笔记。支持多层缩进、折叠展开，适合整理思路和写作框架。
            </p>
            <div className="mt-8 px-4 py-2 rounded-full border border-[--border] text-xs text-[--foreground]/40">
                Coming soon
            </div>
        </div>
    );
}
export default Note;
