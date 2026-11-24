import { create } from 'zustand';
import { CellStyle } from '@/types/cell';

interface FormatPainterState {
  isActive: boolean;
  isLocked: boolean;
  sourceStyle: CellStyle | null;
  activate: (style: CellStyle | undefined, isLocked?: boolean) => void;
  deactivate: () => void;
}

export const useFormatPainterStore = create<FormatPainterState>((set) => ({
  isActive: false,
  isLocked: false,
  sourceStyle: null,

  activate: (style, isLocked = false) => {
    set({
      isActive: true,
      isLocked,
      sourceStyle: style ? { ...style } : {}
    });
  },

  deactivate: () => {
    set({
      isActive: false,
      isLocked: false,
      sourceStyle: null
    });
  }
}));
