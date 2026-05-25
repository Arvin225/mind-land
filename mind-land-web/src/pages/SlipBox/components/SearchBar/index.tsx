import { Search } from "lucide-react"
import { useState } from "react"

function SearchBar({ onSearch }: { onSearch?: (value: string) => void }) {
    const [value, setValue] = useState('')

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onSearch) {
            onSearch(value)
        }
    }

    return (
        <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-[--foreground]/40" />
            <input
                type="text"
                aria-label="搜索"
                placeholder="Ctrl+K"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-[218px] pl-9 pr-8 py-2 rounded-xl bg-[--input] text-sm text-[--foreground] placeholder:text-[--foreground]/30 border border-[--border] outline-none focus:border-[#D4A574]/50 transition-colors"
            />
            {value && (
                <button
                    onClick={() => setValue('')}
                    aria-label="清除搜索"
                    className="absolute right-3 text-[--foreground]/40 hover:text-foreground/70 text-xs transition-colors"
                >
                    ×
                </button>
            )}
        </div>
    )
}

export default SearchBar