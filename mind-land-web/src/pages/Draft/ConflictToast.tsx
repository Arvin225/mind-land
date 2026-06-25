interface Props {
    onReload: () => void;
    onOverwrite: () => void;
}

export default function ConflictToast({ onReload, onOverwrite }: Props) {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md w-full px-4">
            <div className="rounded-lg border border-amber-400/50 bg-surface shadow-lg p-4">
                <p className="text-sm text-text-primary mb-3">
                    文档已被另一会话修改。选择如何处理：
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onReload}
                        className="px-3 py-1.5 rounded-lg text-sm bg-hover hover:bg-hover/80 text-text-primary transition-colors"
                    >
                        从服务端重载（放弃本地）
                    </button>
                    <button
                        onClick={onOverwrite}
                        className="px-3 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                        覆盖服务端
                    </button>
                </div>
            </div>
        </div>
    );
}
