import { GitBranch } from 'lucide-react';

function MindMap() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <GitBranch className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">脑图</h2>
            <p className="text-[--foreground]/50 max-w-md leading-relaxed">
                可视化思维导图工具。通过节点和连线展现思维结构，支持拖拽编辑和导出。
            </p>
            <div className="mt-8 px-4 py-2 rounded-full border border-[--border] text-xs text-[--foreground]/40">
                Coming soon
            </div>
        </div>
    );
}
export default MindMap;
