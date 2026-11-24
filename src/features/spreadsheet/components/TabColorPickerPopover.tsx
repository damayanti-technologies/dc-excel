import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Ban } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TAB_COLOR_PALETTE } from '@/engine/worksheet';

interface TabColorPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor?: string;
  onSelectColor: (hex: string | null) => void;
  anchorPosition?: { x: number; y: number } | null;
}

export const TabColorPickerPopover: React.FC<TabColorPickerPopoverProps> = ({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  anchorPosition
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [customHex, setCustomHex] = useState(currentColor || '#2563eb');

  useEffect(() => {
    if (currentColor) {
      setCustomHex(currentColor);
    }
  }, [currentColor]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Position popover near anchor position
  const style: React.CSSProperties = anchorPosition
    ? {
        position: 'fixed',
        left: `${Math.min(anchorPosition.x, window.innerWidth - 220)}px`,
        top: `${Math.max(10, anchorPosition.y - 230)}px`
      }
    : {
        position: 'fixed',
        bottom: '48px',
        left: '120px'
      };

  return (
    <div
      ref={popoverRef}
      style={style}
      className={cn(
        'z-50 w-52 p-3 bg-surface-elevated border border-border rounded-xl shadow-xl',
        'animate-in fade-in zoom-in-95 duration-100 select-none'
      )}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-accent" />
          Tab Color
        </span>
        {currentColor && (
          <span
            className="w-3.5 h-3.5 rounded-full border border-border"
            style={{ backgroundColor: currentColor }}
            title={`Current: ${currentColor}`}
          />
        )}
      </div>

      {/* Reset / No Color Button */}
      <button
        type="button"
        onClick={() => {
          onSelectColor(null);
          onClose();
        }}
        className="w-full mb-2.5 px-2 py-1 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-secondary rounded flex items-center justify-center gap-1.5 border border-border/60 transition-colors"
      >
        <Ban className="w-3.5 h-3.5" />
        No Color (Reset)
      </button>

      {/* Curated Color Grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {TAB_COLOR_PALETTE.map((c) => {
          const isSelected = currentColor?.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => {
                onSelectColor(c.hex);
                onClose();
              }}
              style={{ backgroundColor: c.hex }}
              className={cn(
                'w-10 h-7 rounded flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-xs',
                isSelected ? 'ring-2 ring-foreground ring-offset-1 ring-offset-surface' : ''
              )}
              title={c.name}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
            </button>
          );
        })}
      </div>

      {/* Custom Color Input */}
      <div className="pt-2 border-t border-border flex items-center gap-2">
        <label className="text-[11px] text-foreground-muted shrink-0 cursor-pointer flex items-center gap-1">
          Custom:
          <input
            type="color"
            value={customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              onSelectColor(e.target.value);
            }}
            className="w-6 h-6 p-0 border border-border rounded cursor-pointer bg-transparent"
          />
        </label>
        <input
          type="text"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSelectColor(customHex);
              onClose();
            }
          }}
          placeholder="#2563eb"
          className="w-20 px-1.5 py-0.5 text-xs font-mono bg-surface border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
};
