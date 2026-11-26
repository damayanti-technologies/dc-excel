import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Indent,
  Outdent,
  WrapText,
  Paintbrush,
  Eraser,
  ChevronDown,
  DollarSign,
  Percent,
  Split,
  Combine,
  Type,
  Grid
} from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  NUMBER_FORMAT_PRESETS
} from '@/engine/formatting/constants';
import { CellStyle } from '@/types/cell';
import { BorderPosition, BorderStyleType } from '@/types/formatting';
import { ColorPickerPopover } from './ColorPickerPopover';
import { BorderPickerPopover } from './BorderPickerPopover';
import { CellStylesMenu } from './CellStylesMenu';
import { cn } from '@/utils/cn';

interface FormattingToolbarProps {
  activeStyle?: CellStyle;
  isFormatPainterActive: boolean;
  onApplyStyle: (styleUpdate: Partial<CellStyle>) => void;
  onApplyBorders: (position: BorderPosition, style: BorderStyleType, color: string) => void;
  onClearFormatting: () => void;
  onToggleFormatPainter: () => void;
  onMerge: (mode: 'all' | 'across' | 'center') => void;
  onUnmerge: () => void;
  onOpenMobilePanel?: () => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  activeStyle = {},
  isFormatPainterActive,
  onApplyStyle,
  onApplyBorders,
  onClearFormatting,
  onToggleFormatPainter,
  onMerge,
  onUnmerge,
  onOpenMobilePanel
}) => {
  const currentFontFamily = activeStyle.fontFamily || activeStyle.font || 'Calibri, sans-serif';
  const currentFontSize = activeStyle.fontSize || 11;
  const isBold = !!activeStyle.bold;
  const isItalic = !!activeStyle.italic;
  const isUnderline = !!activeStyle.underline;
  const isStrikethrough = !!activeStyle.strikethrough;
  const hAlign = activeStyle.horizontalAlignment || 'left';
  const vAlign = activeStyle.verticalAlignment || 'middle';
  const isWrap = !!activeStyle.wrapText;
  const currentNumFormat = activeStyle.numberFormat || 'General';

  // Font family items
  const fontFamilyItems: (DropdownItem | 'divider')[] = FONT_FAMILIES.map((f) => ({
    id: f.value,
    label: f.label,
    style: { fontFamily: f.value },
    shortcut: currentFontFamily.includes(f.label) ? '✓' : undefined,
    onClick: () => onApplyStyle({ fontFamily: f.value })
  }));

  // Font size items
  const fontSizeItems: (DropdownItem | 'divider')[] = FONT_SIZES.map((size) => ({
    id: `size-${size}`,
    label: `${size}`,
    shortcut: currentFontSize === size ? '✓' : undefined,
    onClick: () => onApplyStyle({ fontSize: size })
  }));

  // Number format presets
  const numberFormatItems: (DropdownItem | 'divider')[] = NUMBER_FORMAT_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    shortcut: currentNumFormat === p.pattern ? '✓' : undefined,
    onClick: () => onApplyStyle({ numberFormat: p.pattern })
  }));

  // Merge options
  const mergeItems: (DropdownItem | 'divider')[] = [
    {
      id: 'merge-center',
      label: 'Merge & Center',
      icon: <Combine className="w-3.5 h-3.5" />,
      onClick: () => onMerge('center')
    },
    {
      id: 'merge-all',
      label: 'Merge Cells',
      icon: <Combine className="w-3.5 h-3.5" />,
      onClick: () => onMerge('all')
    },
    {
      id: 'merge-across',
      label: 'Merge Across',
      icon: <Combine className="w-3.5 h-3.5" />,
      onClick: () => onMerge('across')
    },
    'divider',
    {
      id: 'unmerge',
      label: 'Unmerge Cells',
      icon: <Split className="w-3.5 h-3.5" />,
      onClick: onUnmerge
    }
  ];

  const handleIncreaseFontSize = () => {
    const next = FONT_SIZES.find((s) => s > currentFontSize);
    if (next) onApplyStyle({ fontSize: next });
  };

  const handleDecreaseFontSize = () => {
    const prev = [...FONT_SIZES].reverse().find((s) => s < currentFontSize);
    if (prev) onApplyStyle({ fontSize: prev });
  };

  const handleIncreaseIndent = () => {
    const current = activeStyle.indentation || 0;
    onApplyStyle({ indentation: current + 1 });
  };

  const handleDecreaseIndent = () => {
    const current = activeStyle.indentation || 0;
    if (current > 0) {
      onApplyStyle({ indentation: current - 1 });
    }
  };

  return (
    <div className="h-9 bg-surface border-b border-border px-3 flex items-center justify-between gap-1 overflow-visible shrink-0 text-xs select-none">
      <div className="flex items-center gap-1 min-w-max">
        {/* 1. Format Painter */}
        <Tooltip content="Format Painter (Copy format and apply to another cell)">
          <button
            type="button"
            onClick={onToggleFormatPainter}
            className={cn(
              'p-1.5 rounded transition-colors flex items-center justify-center',
              isFormatPainterActive
                ? 'bg-accent text-accent-foreground shadow-xs ring-1 ring-accent'
                : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
            )}
            aria-label="Format Painter"
            aria-pressed={isFormatPainterActive}
          >
            <Paintbrush className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        {/* 2. Clear Formatting */}
        <Tooltip content="Clear Formatting">
          <button
            type="button"
            onClick={onClearFormatting}
            className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors"
            aria-label="Clear formatting"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 3. Font Family Dropdown */}
        <Dropdown
          align="left"
          trigger={
            <button
              type="button"
              className="h-7 px-2 rounded hover:bg-surface-secondary text-foreground text-xs font-medium transition-colors flex items-center gap-1 border border-border/40 max-w-[120px]"
              title="Font Family"
            >
              <span className="truncate">
                {FONT_FAMILIES.find((f) => currentFontFamily.includes(f.label))?.label || 'Calibri'}
              </span>
              <ChevronDown className="w-3 h-3 text-foreground-muted shrink-0" />
            </button>
          }
          items={fontFamilyItems}
        />

        {/* 4. Font Size Dropdown */}
        <Dropdown
          align="left"
          trigger={
            <button
              type="button"
              className="h-7 w-12 px-1.5 rounded hover:bg-surface-secondary text-foreground text-xs font-mono font-medium transition-colors flex items-center justify-between border border-border/40"
              title="Font Size"
            >
              <span>{currentFontSize}</span>
              <ChevronDown className="w-3 h-3 text-foreground-muted" />
            </button>
          }
          items={fontSizeItems}
        />

        {/* Increase / Decrease Font Size */}
        <div className="flex items-center gap-0.5">
          <Tooltip content="Increase Font Size">
            <button
              type="button"
              onClick={handleIncreaseFontSize}
              disabled={currentFontSize >= FONT_SIZES[FONT_SIZES.length - 1]!}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-30"
              aria-label="Increase font size"
            >
              <span className="text-xs font-bold leading-none">A<sup>+</sup></span>
            </button>
          </Tooltip>

          <Tooltip content="Decrease Font Size">
            <button
              type="button"
              onClick={handleDecreaseFontSize}
              disabled={currentFontSize <= FONT_SIZES[0]!}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-30"
              aria-label="Decrease font size"
            >
              <span className="text-xs font-bold leading-none">A<sup>-</sup></span>
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 5. Font Styles: Bold, Italic, Underline, Strikethrough */}
        <div className="flex items-center gap-0.5">
          <Tooltip content="Bold (Ctrl+B)">
            <button
              type="button"
              onClick={() => onApplyStyle({ bold: !isBold })}
              className={cn(
                'p-1.5 rounded transition-colors',
                isBold
                  ? 'bg-accent/15 text-accent font-bold ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Bold"
              aria-pressed={isBold}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Italic (Ctrl+I)">
            <button
              type="button"
              onClick={() => onApplyStyle({ italic: !isItalic })}
              className={cn(
                'p-1.5 rounded transition-colors',
                isItalic
                  ? 'bg-accent/15 text-accent font-bold ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Italic"
              aria-pressed={isItalic}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Underline (Ctrl+U)">
            <button
              type="button"
              onClick={() => onApplyStyle({ underline: !isUnderline })}
              className={cn(
                'p-1.5 rounded transition-colors',
                isUnderline
                  ? 'bg-accent/15 text-accent font-bold ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Underline"
              aria-pressed={isUnderline}
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Strikethrough">
            <button
              type="button"
              onClick={() => onApplyStyle({ strikethrough: !isStrikethrough })}
              className={cn(
                'p-1.5 rounded transition-colors',
                isStrikethrough
                  ? 'bg-accent/15 text-accent font-bold ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Strikethrough"
              aria-pressed={isStrikethrough}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 6. Text Color & Fill Color */}
        <div className="flex items-center gap-1">
          <ColorPickerPopover
            title="Text Color"
            currentColor={activeStyle.textColor}
            defaultLabel="Default"
            onSelectColor={(c) => onApplyStyle({ textColor: c })}
            trigger={
              <Tooltip content="Text Color">
                <button
                  type="button"
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-surface-secondary text-foreground transition-colors relative"
                  aria-label="Text Color"
                >
                  <Type className="w-3.5 h-3.5" />
                  <div
                    className="w-3.5 h-1 mt-0.5 rounded-xs"
                    style={{ backgroundColor: activeStyle.textColor || '#000000' }}
                  />
                </button>
              </Tooltip>
            }
          />

          <ColorPickerPopover
            title="Fill Color"
            currentColor={activeStyle.backgroundColor}
            defaultLabel="No Fill"
            onSelectColor={(c) => onApplyStyle({ backgroundColor: c })}
            trigger={
              <Tooltip content="Fill Color">
                <button
                  type="button"
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-surface-secondary text-foreground transition-colors relative"
                  aria-label="Fill Color"
                >
                  <div className="w-3.5 h-3.5 flex items-center justify-center font-bold text-xs">
                    🎨
                  </div>
                  <div
                    className="w-3.5 h-1 mt-0.5 rounded-xs border border-border/40"
                    style={{ backgroundColor: activeStyle.backgroundColor || 'transparent' }}
                  />
                </button>
              </Tooltip>
            }
          />
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 7. Borders */}
        <BorderPickerPopover
          onSelectBorder={onApplyBorders}
          trigger={
            <Tooltip content="Borders">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors"
                aria-label="Cell borders"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          }
        />

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 8. Alignment: Horizontal & Vertical */}
        <div className="flex items-center gap-0.5">
          <Tooltip content="Align Left">
            <button
              type="button"
              onClick={() => onApplyStyle({ horizontalAlignment: 'left' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                hAlign === 'left'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Align Center">
            <button
              type="button"
              onClick={() => onApplyStyle({ horizontalAlignment: 'center' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                hAlign === 'center'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Align Right">
            <button
              type="button"
              onClick={() => onApplyStyle({ horizontalAlignment: 'right' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                hAlign === 'right'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <div className="h-3 w-px bg-border/60 mx-0.5" />

          <Tooltip content="Vertical Align Top">
            <button
              type="button"
              onClick={() => onApplyStyle({ verticalAlignment: 'top' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                vAlign === 'top'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Align Top"
            >
              <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Vertical Align Middle">
            <button
              type="button"
              onClick={() => onApplyStyle({ verticalAlignment: 'middle' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                vAlign === 'middle'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Align Middle"
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Vertical Align Bottom">
            <button
              type="button"
              onClick={() => onApplyStyle({ verticalAlignment: 'bottom' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                vAlign === 'bottom'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Align Bottom"
            >
              <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 9. Indent & Wrap Text */}
        <div className="flex items-center gap-0.5">
          <Tooltip content="Decrease Indent">
            <button
              type="button"
              onClick={handleDecreaseIndent}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors"
              aria-label="Decrease indent"
            >
              <Outdent className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Increase Indent">
            <button
              type="button"
              onClick={handleIncreaseIndent}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground transition-colors"
              aria-label="Increase indent"
            >
              <Indent className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Wrap Text">
            <button
              type="button"
              onClick={() => onApplyStyle({ wrapText: !isWrap })}
              className={cn(
                'p-1.5 rounded transition-colors',
                isWrap
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Wrap text"
              aria-pressed={isWrap}
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 10. Merge Dropdown */}
        <Dropdown
          align="left"
          trigger={
            <button
              type="button"
              className="h-7 px-2 rounded hover:bg-surface-secondary text-foreground text-xs font-medium transition-colors flex items-center gap-1 border border-border/40"
              title="Merge Cells"
            >
              <Combine className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Merge</span>
              <ChevronDown className="w-3 h-3 text-foreground-muted" />
            </button>
          }
          items={mergeItems}
        />

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 11. Number Format Dropdown & Quick Actions */}
        <div className="flex items-center gap-0.5">
          <Dropdown
            align="left"
            trigger={
              <button
                type="button"
                className="h-7 px-2 rounded hover:bg-surface-secondary text-foreground text-xs font-medium transition-colors flex items-center gap-1 border border-border/40 max-w-[130px]"
                title="Number Format"
              >
                <span className="truncate">
                  {NUMBER_FORMAT_PRESETS.find((p) => p.pattern === currentNumFormat)?.label || 'General'}
                </span>
                <ChevronDown className="w-3 h-3 text-foreground-muted shrink-0" />
              </button>
            }
            items={numberFormatItems}
          />

          <Tooltip content="Format as Currency USD ($)">
            <button
              type="button"
              onClick={() => onApplyStyle({ numberFormat: '$#,##0.00' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                currentNumFormat === '$#,##0.00'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Currency USD"
            >
              <DollarSign className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Format as Percent (%)">
            <button
              type="button"
              onClick={() => onApplyStyle({ numberFormat: '0%' })}
              className={cn(
                'p-1.5 rounded transition-colors',
                currentNumFormat === '0%'
                  ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
                  : 'hover:bg-surface-secondary text-foreground-secondary hover:text-foreground'
              )}
              aria-label="Percentage"
            >
              <Percent className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Comma Style (1,234.56)">
            <button
              type="button"
              onClick={() => onApplyStyle({ numberFormat: '#,##0.00' })}
              className="p-1.5 rounded hover:bg-surface-secondary text-foreground-secondary hover:text-foreground font-mono font-bold text-xs"
              aria-label="Comma separator style"
            >
              ,
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* 12. Preset Cell Styles */}
        <CellStylesMenu onApplyStyle={onApplyStyle} />
      </div>

      {/* Mobile formatting drawer toggle */}
      {onOpenMobilePanel && (
        <button
          type="button"
          onClick={onOpenMobilePanel}
          className="md:hidden px-2 py-1 rounded bg-accent/10 text-accent font-medium text-xs flex items-center gap-1 shrink-0"
        >
          <span>More</span>
        </button>
      )}
    </div>
  );
};
