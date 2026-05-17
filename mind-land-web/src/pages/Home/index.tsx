import { Home as HomeIcon } from 'lucide-react';

function Home() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <HomeIcon className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">Home</h2>
            <p className="text-[--foreground]/50 max-w-md leading-relaxed">
                个人知识管理仪表板。在这里查看最近的笔记、待办事项和活动概览。
            </p>
            <div className="mt-8 px-4 py-2 rounded-full border border-[--border] text-xs text-[--foreground]/40">
                Coming soon
            </div>
        </div>
    );
}
export default Home;
