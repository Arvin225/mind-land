import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

function CustomSelect({ value, options, onChange }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label || '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="appearance-none bg-[--input] border border-[--glass-border] text-[--foreground] text-sm rounded-lg px-4 py-2 pr-10 min-w-[140px] cursor-pointer hover:bg-[--glass-highlight] transition-colors focus:outline-none focus:border-[rgba(212,165,116,0.4)] flex items-center justify-between"
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[--foreground]/50 absolute right-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div role="listbox" className="absolute top-full right-0 mt-1 w-full bg-surface-elevated border border-[--border] rounded-lg shadow-xl py-1 z-50">
          {options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                value === option.value
                  ? 'text-[#D4A574] bg-[rgba(212,165,116,0.08)]'
                  : 'text-[--foreground]/80 hover:bg-[--glass]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
