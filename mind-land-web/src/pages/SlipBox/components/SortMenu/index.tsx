import { ChevronDown } from "lucide-react"
import { useState } from "react"

interface SortOption {
    key: string
    label: string
}

const sortOptions: SortOption[] = [
    { key: 'c-asc', label: '创建时间升序' },
    { key: 'c-dec', label: '创建时间降序' },
    { key: 'e-asc', label: '编辑时间升序' },
    { key: 'e-dec', label: '编辑时间降序' },
]

function SortMenu({ onSelect }: { onSelect?: (key: string) => void }) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState('c-asc')

    const handleSelect = (key: string) => {
        setSelected(key)
        setOpen(false)
        onSelect?.(key)
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="p-1.5 rounded-lg hover:bg-[--hover] text-[--foreground]/50 hover:text-[--foreground]/80 transition-colors"
            >
                <ChevronDown className="w-4 h-4" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-36 liquid-glass-strong rounded-xl py-2 shadow-xl">
                        {sortOptions.map(option => (
                            <button
                                key={option.key}
                                onClick={() => handleSelect(option.key)}
                                className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-[--hover] ${
                                    selected === option.key ? 'text-[#D4A574]' : 'text-[--foreground]/70'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default SortMenu