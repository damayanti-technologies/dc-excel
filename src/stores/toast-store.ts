import { create } from 'zustand';
import { generateId } from '@/utils/id';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId('toast');
    const newToast: ToastItem = {
      ...toast,
      id,
      durationMs: toast.durationMs ?? 4000
    };

    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));

    if (newToast.durationMs && newToast.durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, newToast.durationMs);
    }

    return id;
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),

  clearAll: () => set({ toasts: [] })
}));

/**
 * Convenient imperative helper for dispatching toast notifications.
 */
export const toast = {
  info: (title: string, description?: string, durationMs?: number) =>
    useToastStore.getState().addToast({ type: 'info', title, description, durationMs }),
  success: (title: string, description?: string, durationMs?: number) =>
    useToastStore.getState().addToast({ type: 'success', title, description, durationMs }),
  warning: (title: string, description?: string, durationMs?: number) =>
    useToastStore.getState().addToast({ type: 'warning', title, description, durationMs }),
  error: (title: string, description?: string, durationMs?: number) =>
    useToastStore.getState().addToast({ type: 'error', title, description, durationMs }),
  dismiss: (id: string) => useToastStore.getState().dismissToast(id)
};
