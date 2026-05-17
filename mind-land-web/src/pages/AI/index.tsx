import { Sparkles, Brain, MessageSquare, FileSearch, Wand2, Zap } from 'lucide-react';

const plannedFeatures = [
    { icon: Brain, label: '智能笔记分类', desc: '自动识别笔记内容，推荐合适的分类和标签' },
    { icon: MessageSquare, label: 'AI 对话', desc: '与笔记库对话，基于已有知识回答问题' },
    { icon: FileSearch, label: '智能搜索', desc: '语义搜索，理解查询意图，精准定位相关内容' },
    { icon: Wand2, label: '内容摘要', desc: '一键生成笔记摘要，快速把握核心观点' },
    { icon: Zap, label: '写作辅助', desc: '智能续写、润色和翻译，提升写作效率' },
];

function AI() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <Sparkles className="w-16 h-16 text-[--foreground]/20 mb-6" />
            <h2 className="text-2xl font-serif-display text-[--foreground]/80 mb-3">AI</h2>
            <p className="text-[--foreground]/40 max-w-md leading-relaxed mb-10">
                功能开发中
            </p>
            <div className="w-full max-w-lg">
                <h3 className="text-sm font-medium text-[--foreground]/60 mb-4 text-left">
                    计划中的 AI 功能
                </h3>
                <div className="space-y-3">
                    {plannedFeatures.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.label}
                                className="flex items-start gap-4 p-4 rounded-xl border border-[--border] bg-[--surface]/50"
                            >
                                <Icon className="w-5 h-5 text-[--foreground]/30 mt-0.5 shrink-0" />
                                <div className="text-left">
                                    <div className="text-sm font-medium text-[--foreground]/70">
                                        {feature.label}
                                    </div>
                                    <div className="text-xs text-[--foreground]/40 mt-0.5">
                                        {feature.desc}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
export default AI;
