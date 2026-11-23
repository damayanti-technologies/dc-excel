import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  activeModal: string | null;
  globalLoading: boolean;
  loadingMessage: string | null;

  setOnline: (isOnline: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean, message?: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  activeModal: null,
  globalLoading: false,
  loadingMessage: null,

  setOnline: (isOnline) => set({ isOnline }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
  setGlobalLoading: (globalLoading, loadingMessage = null) =>
    set({ globalLoading, loadingMessage })
}));
