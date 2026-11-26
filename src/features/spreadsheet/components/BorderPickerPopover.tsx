import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BorderPosition, BorderStyleType } from '@/types/formatting';
import {
  Square,
  Grid,
  Ban,
  Minus
} from 'lucide-react';

interface BorderPickerPopoverProps {
  onSelectBorder: (position: BorderPosition, style: BorderStyleType, color: string) => void;
  trigger: React.ReactNode;
}

const BORDER_POSITIONS: { id: BorderPosition; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Borders', icon: <Grid className="w-4 h-4" /> },
  { id: 'outside', label: 'Outside Borders', icon: <Square className="w-4 h-4" /> },
  { id: 'thick-outside', label: 'Thick Box', icon: <Square className="w-4 h-4 stroke-[2.5]" /> },
  { id: 'none', label: 'No Borders', icon: <Ban className="w-4 h-4 text-red-500" /> },
  { id: 'top', label: 'Top Border', icon: <Minus className="w-4 h-4 -translate-y-1.5" /> },
  { id: 'bottom', label: 'Bottom Border', icon: <Minus className="w-4 h-4 translate-y-1.5" /> },
  { id: 'left', label: 'Left Border', icon: <Minus className="w-4 h-4 -rotate-90 -translate-x-1.5" /> },
  { id: 'right', label: 'Right Border', icon: <Minus className="w-4 h-4 -rotate-90 translate-x-1.5" /> },
  { id: 'inside', label: 'Inside Borders', icon: <Grid className="w-4 h-4 stroke-1 opacity-70" /> },
  { id: 'horizontal', label: 'Horizontal', icon: <div className="flex flex-col gap-1"><Minus className="w-4 h-1.5" /><Minus className="w-4 h-1.5" /></div> },
  { id: 'vertical', label: 'Vertical', icon: <div className="flex gap-1"><Minus className="w-1.5 h-4 -rotate-90" /><Minus className="w-1.5 h-4 -rotate-90" /></div> }
];

const BORDER_STYLES: { id: BorderStyleType; label: string; previewClass: string }[] = [
  { id: 'thin', label: 'Thin', previewClass: 'border-b border-foreground' },
  { id: 'medium', label: 'Medium', previewClass: 'border-b-2 border-foreground' },
  { id: 'thick', label: 'Thick', previewClass: 'border-b-4 border-foreground' },
  { id: 'double', label: 'Double', previewClass: 'border-b-4 border-double border-foreground' },
  { id: 'dashed', label: 'Dashed', previewClass: 'border-b-2 border-dashed border-foreground' }
];

export const BorderPickerPopover: React.FC<BorderPickerPopoverProps> = ({
  onSelectBorder,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<BorderStyleType>('thin');
  const [color, setColor] = useState('#000000');
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 250;
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

  const handleApply = (position: BorderPosition) => {
    onSelectBorder(position, style, color);
    setIsOpen(false);
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
            className="p-3 bg-surface border border-border rounded-xl shadow-2xl w-60 select-none animate-in fade-in zoom-in-95 duration-100"
            role="dialog"
            aria-label="Border settings"
          >
            <div className="text-xs font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60">
              Borders
            </div>

            {/* Border Presets Grid */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {BORDER_POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => handleApply(pos.id)}
                  className="flex flex-col items-center justify-center p-2 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors border border-border/40 hover:border-accent cursor-pointer"
                  title={pos.label}
                  aria-label={pos.label}
                >
                  {pos.icon}
                  <span className="text-[10px] mt-1 text-foreground-muted truncate w-full text-center">
                    {pos.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Border Line Style & Color Options */}
            <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground-secondary font-medium">Line Style</span>
                <div className="flex items-center gap-1">
                  {BORDER_STYLES.map((bs) => (
                    <button
                      key={bs.id}
                      type="button"
                      onClick={() => setStyle(bs.id)}
                      className={`w-6 h-4 flex items-center justify-center rounded border transition-colors cursor-pointer ${
                        style === bs.id ? 'border-accent bg-accent/15' : 'border-border/50 hover:bg-surface-secondary'
                      }`}
                      title={bs.label}
                      aria-label={`Border style ${bs.label}`}
                    >
                      <div className={`w-3.5 ${bs.previewClass}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground-secondary font-medium">Line Color</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-5 h-5 p-0 border border-border rounded cursor-pointer bg-transparent"
                    title="Border line color"
                  />
                  <span className="font-mono text-[10px] text-foreground-muted">{color}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
