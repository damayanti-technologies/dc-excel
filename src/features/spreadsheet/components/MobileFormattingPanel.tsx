import React, { useState } from 'react';
import { CellStyle } from '@/types/cell';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  NUMBER_FORMAT_PRESETS,
  COLOR_PALETTE,
  matchFontFamily
} from '@/engine/formatting/constants';
import {
  X,
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
  WrapText,
  Ban
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface MobileFormattingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeStyle?: CellStyle;
  onApplyStyle: (styleUpdate: Partial<CellStyle>) => void;
  onClearFormatting: () => void;
}

type TabType = 'font' | 'align' | 'color' | 'number';

export const MobileFormattingPanel: React.FC<MobileFormattingPanelProps> = ({
  isOpen,
  onClose,
  activeStyle = {},
  onApplyStyle,
  onClearFormatting
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('font');

  if (!isOpen) return null;

  const currentFontFamily = activeStyle.fontFamily || activeStyle.font || 'Calibri, sans-serif';
  const matchedFont = matchFontFamily(currentFontFamily);
  const currentFontSize = activeStyle.fontSize || 11;
  const isBold = !!activeStyle.bold;
  const isItalic = !!activeStyle.italic;
  const isUnderline = !!activeStyle.underline;
  const isStrikethrough = !!activeStyle.strikethrough;
  const hAlign = activeStyle.horizontalAlignment || 'left';
  const vAlign = activeStyle.verticalAlignment || 'middle';
  const isWrap = !!activeStyle.wrapText;
  const currentNumFormat = activeStyle.numberFormat || 'General';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 md:hidden animate-in fade-in duration-200">
      <div className="bg-surface border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">Cell Formatting</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearFormatting}
              className="text-xs text-red-500 font-medium px-2 py-1 rounded hover:bg-surface-secondary"
            >
              Clear Format
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-secondary text-foreground-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface-secondary/40 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('font')}
            className={cn('flex-1 py-2.5 text-center border-b-2', activeTab === 'font' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted')}
          >
            Font
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('align')}
            className={cn('flex-1 py-2.5 text-center border-b-2', activeTab === 'align' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted')}
          >
            Align
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('color')}
            className={cn('flex-1 py-2.5 text-center border-b-2', activeTab === 'color' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted')}
          >
            Color
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('number')}
            className={cn('flex-1 py-2.5 text-center border-b-2', activeTab === 'number' ? 'border-accent text-accent' : 'border-transparent text-foreground-muted')}
          >
            Format
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'font' && (
            <>
              {/* Style toggles */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onApplyStyle({ bold: !isBold })}
                  className={cn('p-2.5 rounded-lg border flex items-center justify-center', isBold ? 'bg-accent/15 border-accent text-accent font-bold' : 'border-border')}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onApplyStyle({ italic: !isItalic })}
                  className={cn('p-2.5 rounded-lg border flex items-center justify-center', isItalic ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onApplyStyle({ underline: !isUnderline })}
                  className={cn('p-2.5 rounded-lg border flex items-center justify-center', isUnderline ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onApplyStyle({ strikethrough: !isStrikethrough })}
                  className={cn('p-2.5 rounded-lg border flex items-center justify-center', isStrikethrough ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-foreground-muted mb-1 text-[11px]">Font Family</label>
                <select
                  value={matchedFont?.value || currentFontFamily}
                  onChange={(e) => onApplyStyle({ fontFamily: e.target.value })}
                  className="w-full p-2 bg-surface-secondary border border-border rounded-lg text-foreground text-xs"
                >
                  <optgroup label="Modern Sans-Serif">
                    {FONT_FAMILIES.filter((f) => f.category === 'sans-serif').map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Classic & Editorial Serif">
                    {FONT_FAMILIES.filter((f) => f.category === 'serif').map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Monospace & Code">
                    {FONT_FAMILIES.filter((f) => f.category === 'monospace').map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Display & Expressive">
                    {FONT_FAMILIES.filter((f) => f.category === 'display').map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-foreground-muted mb-1 text-[11px]">Font Size</label>
                <select
                  value={currentFontSize}
                  onChange={(e) => onApplyStyle({ fontSize: Number(e.target.value) })}
                  className="w-full p-2 bg-surface-secondary border border-border rounded-lg text-foreground font-mono"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} pt
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeTab === 'align' && (
            <>
              <div>
                <label className="block text-foreground-muted mb-1.5 text-[11px]">Horizontal Alignment</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyStyle({ horizontalAlignment: 'left' })}
                    className={cn('p-2.5 rounded-lg border flex items-center justify-center', hAlign === 'left' ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyStyle({ horizontalAlignment: 'center' })}
                    className={cn('p-2.5 rounded-lg border flex items-center justify-center', hAlign === 'center' ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyStyle({ horizontalAlignment: 'right' })}
                    className={cn('p-2.5 rounded-lg border flex items-center justify-center', hAlign === 'right' ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-foreground-muted mb-1.5 text-[11px]">Vertical Alignment</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onApplyStyle({ verticalAlignment: 'top' })}
                    className={cn('p-2.5 rounded-lg border flex items-center justify-center', vAlign === 'top' ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                  >
                    <AlignVerticalJustifyStart className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyStyle({ verticalAlignment: 'middle' })}
                    className={cn('p-2.5 rounded-lg border flex items-center justify-center', vAlign === 'middle' ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                  >
                    <AlignVerticalJustifyCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyStyle({ verticalAlignment: 'bottom' })}
                    className={cn('p-2.5 rounded-lg border flex items-center justify-center', vAlign === 'bottom' ? 'bg-accent/15 border-accent text-accent' : 'border-border')}
                  >
                    <AlignVerticalJustifyEnd className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onApplyStyle({ wrapText: !isWrap })}
                  className={cn(
                    'w-full py-2.5 px-3 rounded-lg border flex items-center justify-between',
                    isWrap ? 'bg-accent/15 border-accent text-accent' : 'border-border text-foreground'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <WrapText className="w-4 h-4" />
                    <span>Wrap Text in Cell</span>
                  </span>
                  <span className="font-semibold">{isWrap ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'color' && (
            <>
              <div>
                <label className="block text-foreground-muted mb-2 text-[11px]">Text Color</label>
                <div className="grid grid-cols-10 gap-1.5 mb-2">
                  {COLOR_PALETTE.slice(0, 20).map((c, i) => (
                    <button
                      key={`text-${c}-${i}`}
                      type="button"
                      onClick={() => onApplyStyle({ textColor: c })}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded border border-border/60"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-foreground-muted mb-2 text-[11px]">Cell Fill Color</label>
                <div className="grid grid-cols-10 gap-1.5 mb-2">
                  {COLOR_PALETTE.slice(0, 20).map((c, i) => (
                    <button
                      key={`fill-${c}-${i}`}
                      type="button"
                      onClick={() => onApplyStyle({ backgroundColor: c })}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded border border-border/60"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onApplyStyle({ backgroundColor: undefined })}
                  className="mt-2 text-xs flex items-center gap-1.5 text-foreground-muted px-2 py-1 rounded border border-border"
                >
                  <Ban className="w-3.5 h-3.5 text-red-500" />
                  <span>No Fill</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'number' && (
            <div>
              <label className="block text-foreground-muted mb-1 text-[11px]">Number Format</label>
              <div className="space-y-1">
                {NUMBER_FORMAT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onApplyStyle({ numberFormat: p.pattern })}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between text-xs',
                      currentNumFormat === p.pattern ? 'bg-accent/15 border-accent text-accent font-medium' : 'border-border/60 hover:bg-surface-secondary'
                    )}
                  >
                    <span>{p.label}</span>
                    <span className="font-mono text-[11px] text-foreground-muted">{p.example}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
