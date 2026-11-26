import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { COLOR_PALETTE } from '@/engine/formatting/constants';
import { Pipette, Ban, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ColorPickerPopoverProps {
  title: string;
  currentColor?: string;
  defaultLabel?: string; // e.g. "Automatic" or "No Fill"
  onSelectColor: (color: string | undefined) => void;
  trigger: React.ReactNode;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  title,
  currentColor,
  defaultLabel = 'Reset to Default',
  onSelectColor,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(currentColor || '#000000');
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 260;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popoverWidth - 8);
      }
      if (left < 8) left = 8;
      const top = rect.bottom + 4;
      setCoords({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const handleSelect = (color: string | undefined) => {
    onSelectColor(color);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#([0-9A-F]{3}){1,2}$/i.test(customHex)) {
      handleSelect(customHex);
    }
  };

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999
            }}
            className="p-2.5 bg-surface border border-border rounded-xl shadow-2xl w-64 select-none animate-in fade-in zoom-in-95 duration-100"
            role="dialog"
            aria-label={title}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">{title}</span>
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="text-[11px] flex items-center gap-1 text-foreground-muted hover:text-foreground hover:bg-surface-secondary px-1.5 py-0.5 rounded transition-colors"
              >
                <Ban className="w-3 h-3 text-red-500" />
                <span>{defaultLabel}</span>
              </button>
            </div>

            {/* Color Matrix */}
            <div className="grid grid-cols-10 gap-1 mb-3">
              {COLOR_PALETTE.map((c, i) => {
                const isSelected = currentColor?.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={`${c}-${i}`}
                    type="button"
                    onClick={() => handleSelect(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      'w-5 h-5 rounded-xs border transition-transform hover:scale-115 flex items-center justify-center cursor-pointer',
                      isSelected ? 'ring-2 ring-accent ring-offset-1 border-foreground' : 'border-border/40 hover:border-foreground/50'
                    )}
                    title={c}
                    aria-label={`Select color ${c}`}
                  >
                    {isSelected && (
                      <Check
                        className={cn(
                          'w-3 h-3',
                          ['#ffffff', '#f5f5f5', '#fafafa', '#fee2e2', '#ffedd5', '#fef3c7', '#fef9c3', '#ecfdf5', '#ccfbf1', '#e0f2fe'].includes(c)
                            ? 'text-black'
                            : 'text-white'
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-border/60 flex items-center gap-1.5">
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="w-6 h-6 p-0 border border-border rounded cursor-pointer bg-transparent"
                  title="Pick custom color"
                />
                <Pipette className="w-3 h-3 absolute pointer-events-none text-foreground-muted left-1.5" />
              </div>

              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#000000"
                className="flex-1 h-6 px-1.5 text-xs font-mono bg-surface-secondary border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />

              <button
                type="submit"
                className="h-6 px-2 text-[11px] font-medium bg-accent text-accent-foreground rounded hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
};
