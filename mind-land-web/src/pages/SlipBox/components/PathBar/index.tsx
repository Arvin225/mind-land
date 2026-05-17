interface PathItem {
    title: string
    key?: string
    onClick?: () => void
}

function PathBar({ pathItems }: { pathItems: PathItem[] }) {
    return (
        <nav className="flex items-center gap-2 text-sm font-medium text-[--foreground]/70">
            {pathItems.map((item, index) => (
                <div key={item.key || index} className="flex items-center gap-2">
                    {index > 0 && <span className="text-[--foreground]/30">/</span>}
                    <button
                        onClick={item.onClick}
                        className={`hover:text-[#D4A574] transition-colors cursor-pointer ${item.onClick ? '' : 'text-[--foreground]/90'}`}
                        disabled={!item.onClick}
                    >
                        {item.title}
                    </button>
                </div>
            ))}
        </nav>
    )
}

export default PathBar