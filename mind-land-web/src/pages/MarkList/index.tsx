import { Scissors } from 'lucide-react';

function MarkList() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <Scissors className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">剪藏</h2>
            <p className="text-[--foreground]/50 max-w-md leading-relaxed">
                网页剪藏和书签管理。保存网页内容，分类整理，打造个人知识库。
            </p>
            <div className="mt-8 px-4 py-2 rounded-full border border-[--border] text-xs text-[--foreground]/40">
                Coming soon
            </div>
        </div>
    );
}
export default MarkList;
