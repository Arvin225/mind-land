import { BookOpen } from 'lucide-react';

function Diary() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <BookOpen className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">日记</h2>
            <p className="text-[--foreground]/50 max-w-md leading-relaxed">
                每日日记和心情记录。按时间线整理，支持标签分类和回顾。
            </p>
            <div className="mt-8 px-4 py-2 rounded-full border border-[--border] text-xs text-[--foreground]/40">
                Coming soon
            </div>
        </div>
    );
}
export default Diary;
