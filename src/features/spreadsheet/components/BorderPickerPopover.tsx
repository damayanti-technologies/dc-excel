import React, { useState, useRef, useEffect } from 'react';
import { BorderPosition, BorderStyleType } from '@/types/formatting';
import {
  Square,
  Grid,
  Ban,
  Minus
} from 'lucide-react';
import { cn } from '@/utils/cn';

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
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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
    <div className="relative inline-block" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 z-50 p-3 bg-surface border border-border rounded-lg shadow-xl w-60 select-none animate-in fade-in zoom-in-95 duration-100"
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
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors border border-border/40 hover:border-accent"
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
                    className={cn(
                      'w-7 h-5 rounded px-1 flex items-center justify-center border transition-colors',
                      style === bs.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border/60 hover:bg-surface-secondary'
                    )}
                    title={bs.label}
                  >
                    <div className={cn('w-full', bs.previewClass)} />
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
                  title="Choose border color"
                />
                <span className="font-mono text-[10px] text-foreground-muted">{color}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
