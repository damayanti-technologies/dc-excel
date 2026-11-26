import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BUILT_IN_CELL_STYLES } from '@/engine/formatting/constants';
import { CellStyle } from '@/types/cell';
import { Palette } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CellStylesMenuProps {
  onApplyStyle: (style: CellStyle) => void;
  trigger?: React.ReactNode;
}

export const CellStylesMenu: React.FC<CellStylesMenuProps> = ({
  onApplyStyle,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 230;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - menuWidth - 8);
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
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const handleSelect = (style: CellStyle) => {
    onApplyStyle(style);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger || (
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface text-foreground-secondary hover:text-foreground text-xs font-medium border border-border/40 transition-colors"
          >
            <Palette className="w-3.5 h-3.5 text-accent" />
            <span>Cell Styles</span>
          </button>
        )}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999
            }}
            className="p-2.5 bg-surface border border-border rounded-xl shadow-2xl w-56 select-none animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto"
            role="menu"
            aria-label="Preset Cell Styles"
          >
            <div className="text-[11px] font-semibold text-foreground-muted px-1.5 pb-1.5 uppercase tracking-wider border-b border-border/40">
              Presets & Formatting
            </div>

            <div className="flex flex-col gap-1 py-1">
              {BUILT_IN_CELL_STYLES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset.style)}
                  style={{
                    backgroundColor: preset.style.backgroundColor || 'transparent',
                    color: preset.style.textColor || undefined,
                    fontWeight: preset.style.bold ? 700 : 400
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors border flex items-center justify-between cursor-pointer',
                    preset.style.backgroundColor
                      ? 'border-transparent hover:opacity-90'
                      : 'border-border/30 hover:bg-surface-secondary text-foreground'
                  )}
                >
                  <span>{preset.name}</span>
                  <span className="text-[10px] opacity-70">Aa</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
