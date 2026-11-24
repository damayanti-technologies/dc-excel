import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CellValidationDropdownProps {
  listValues: string[];
  currentValue?: string | number | null;
  onSelect: (value: string) => void;
}

export const CellValidationDropdown: React.FC<CellValidationDropdownProps> = ({
  listValues,
  currentValue,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="absolute right-0 top-0 bottom-0 flex items-center z-20">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="h-full px-1 bg-surface-secondary/80 hover:bg-surface-secondary text-muted-foreground hover:text-foreground border-l border-border/40 transition-colors flex items-center justify-center cursor-pointer"
        title="Select from list"
        aria-label="Open cell dropdown"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-0.5 w-44 max-h-48 overflow-y-auto bg-surface border border-border rounded-md shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {listValues.length === 0 ? (
            <div className="px-3 py-1.5 text-muted-foreground text-[11px] italic">
              No options available
            </div>
          ) : (
            listValues.map((val, idx) => {
              const isSelected = String(currentValue ?? '') === val;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelect(val);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-surface-secondary transition-colors ${
                    isSelected ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{val}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
