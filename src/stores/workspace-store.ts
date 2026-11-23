import { create } from 'zustand';
import { Workbook, WorkbookSummary } from '@/types/workbook';
import { Folder, FolderSummary } from '@/types/folder';
import { workbookService, folderService } from '@/services';
import { toast } from './toast-store';
import { Logger } from '@/utils/logger';

export type WorkspaceSortBy = 'updatedAt' | 'lastOpenedAt' | 'name' | 'createdAt';
export type WorkspaceSortOrder = 'asc' | 'desc';
export type WorkspaceViewMode = 'grid' | 'list';
export type WorkspaceView = 'all' | 'recent' | 'starred' | 'folder' | 'home';

interface WorkspaceState {
  // Data
  workbooks: WorkbookSummary[];
  folders: FolderSummary[];
  activeFolderId: string | null;
  activeFolder: Folder | null;
  currentView: WorkspaceView;
  isLoading: boolean;
  error: string | null;

  // Search & Filter & Sort
  searchQuery: string;
  sortBy: WorkspaceSortBy;
  sortOrder: WorkspaceSortOrder;
  viewMode: WorkspaceViewMode;

  // Dialog states
  isCreateWorkbookOpen: boolean;
  createWorkbookFolderId: string | null;
  workbookToRename: WorkbookSummary | null;
  workbookToDelete: WorkbookSummary | null;
  workbookToMove: WorkbookSummary | null;
  isCreateFolderOpen: boolean;
  folderToRename: FolderSummary | null;
  folderToDelete: FolderSummary | null;

  // Setters
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: WorkspaceSortBy) => void;
  setSortOrder: (sortOrder: WorkspaceSortOrder) => void;
  setViewMode: (viewMode: WorkspaceViewMode) => void;

  // Dialog actions
  openCreateWorkbook: (folderId?: string | null) => void;
  closeCreateWorkbook: () => void;
  openRenameWorkbook: (wb: WorkbookSummary) => void;
  closeRenameWorkbook: () => void;
  openDeleteWorkbook: (wb: WorkbookSummary) => void;
  closeDeleteWorkbook: () => void;
  openMoveWorkbook: (wb: WorkbookSummary) => void;
  closeMoveWorkbook: () => void;
  openCreateFolder: () => void;
  closeCreateFolder: () => void;
  openRenameFolder: (folder: FolderSummary) => void;
  closeRenameFolder: () => void;
  openDeleteFolder: (folder: FolderSummary) => void;
  closeDeleteFolder: () => void;

  // Async operations
  loadWorkspaceData: (view?: WorkspaceView, folderId?: string | null) => Promise<void>;
  createWorkbook: (name: string, folderId?: string | null) => Promise<Workbook>;
  renameWorkbook: (id: string, name: string) => Promise<void>;
  duplicateWorkbook: (id: string, name?: string) => Promise<Workbook>;
  deleteWorkbook: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  moveWorkbook: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string, mode: 'keep_workbooks' | 'delete_all') => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workbooks: [],
  folders: [],
  activeFolderId: null,
  activeFolder: null,
  currentView: 'home',
  isLoading: false,
  error: null,

  searchQuery: '',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  viewMode: 'grid',

  isCreateWorkbookOpen: false,
  createWorkbookFolderId: null,
  workbookToRename: null,
  workbookToDelete: null,
  workbookToMove: null,
  isCreateFolderOpen: false,
  folderToRename: null,
  folderToDelete: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setViewMode: (viewMode) => set({ viewMode }),

  openCreateWorkbook: (folderId = null) =>
    set({ isCreateWorkbookOpen: true, createWorkbookFolderId: folderId }),
  closeCreateWorkbook: () =>
    set({ isCreateWorkbookOpen: false, createWorkbookFolderId: null }),

  openRenameWorkbook: (wb) => set({ workbookToRename: wb }),
  closeRenameWorkbook: () => set({ workbookToRename: null }),

  openDeleteWorkbook: (wb) => set({ workbookToDelete: wb }),
  closeDeleteWorkbook: () => set({ workbookToDelete: null }),

  openMoveWorkbook: (wb) => set({ workbookToMove: wb }),
  closeMoveWorkbook: () => set({ workbookToMove: null }),

  openCreateFolder: () => set({ isCreateFolderOpen: true }),
  closeCreateFolder: () => set({ isCreateFolderOpen: false }),

  openRenameFolder: (folder) => set({ folderToRename: folder }),
  closeRenameFolder: () => set({ folderToRename: null }),

  openDeleteFolder: (folder) => set({ folderToDelete: folder }),
  closeDeleteFolder: () => set({ folderToDelete: null }),

  loadWorkspaceData: async (view = 'home', folderId = null) => {
    set({ isLoading: true, error: null, currentView: view, activeFolderId: folderId });
    try {
      const [foldersList, allWorkbooks] = await Promise.all([
        folderService.listFolders(),
        workbookService.getAllWorkbooks()
      ]);

      let activeFolder: Folder | null = null;
      if (folderId) {
        activeFolder = await folderService.getFolder(folderId);
      }

      set({
        folders: foldersList,
        workbooks: allWorkbooks,
        activeFolder,
        isLoading: false
      });
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to load workspace data', err);
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load workspace'
      });
      toast.error('Storage Error', 'Could not load workbooks from local database.');
    }
  },

  createWorkbook: async (name, folderId = null) => {
    try {
      const targetFolderId = folderId ?? get().createWorkbookFolderId;
      const { workbook } = await workbookService.createWorkbook(name, targetFolderId);
      toast.success('Workbook Created', `"${workbook.name}" is ready.`);
      get().closeCreateWorkbook();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
      return workbook;
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to create workbook', err);
      toast.error('Creation Failed', 'Could not create workbook.');
      throw err;
    }
  },

  renameWorkbook: async (id, name) => {
    try {
      const updated = await workbookService.renameWorkbook(id, name);
      toast.success('Workbook Renamed', `Renamed to "${updated.name}".`);
      get().closeRenameWorkbook();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to rename workbook', err);
      toast.error('Rename Failed', 'Could not rename workbook.');
      throw err;
    }
  },

  duplicateWorkbook: async (id, name) => {
    try {
      const duplicate = await workbookService.duplicateWorkbook(id, name);
      toast.success('Workbook Duplicated', `Created "${duplicate.name}".`);
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
      return duplicate;
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to duplicate workbook', err);
      toast.error('Duplication Failed', 'Could not duplicate workbook.');
      throw err;
    }
  },

  deleteWorkbook: async (id) => {
    try {
      await workbookService.deleteWorkbook(id);
      toast.success('Workbook Deleted', 'Workbook and sheets permanently removed.');
      get().closeDeleteWorkbook();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to delete workbook', err);
      toast.error('Delete Failed', 'Could not delete workbook.');
      throw err;
    }
  },

  toggleStar: async (id) => {
    try {
      const isStarred = await workbookService.toggleStar(id);
      toast.info(isStarred ? 'Starred' : 'Unstarred', isStarred ? 'Added to Starred.' : 'Removed from Starred.');
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to toggle star', err);
      toast.error('Error', 'Could not update star status.');
    }
  },

  moveWorkbook: async (id, folderId) => {
    try {
      await workbookService.moveToFolder(id, folderId);
      toast.success('Workbook Moved', folderId ? 'Moved to folder.' : 'Moved to workspace root.');
      get().closeMoveWorkbook();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to move workbook', err);
      toast.error('Move Failed', 'Could not move workbook.');
    }
  },

  createFolder: async (name, color) => {
    try {
      const folder = await folderService.createFolder(name, color);
      toast.success('Folder Created', `Folder "${folder.name}" created.`);
      get().closeCreateFolder();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
      return folder;
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to create folder', err);
      toast.error('Folder Error', 'Could not create folder.');
      throw err;
    }
  },

  renameFolder: async (id, name) => {
    try {
      await folderService.renameFolder(id, name);
      toast.success('Folder Renamed', `Renamed to "${name.trim()}".`);
      get().closeRenameFolder();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to rename folder', err);
      toast.error('Rename Failed', 'Could not rename folder.');
      throw err;
    }
  },

  deleteFolder: async (id, mode) => {
    try {
      await folderService.deleteFolder(id, mode);
      toast.success(
        'Folder Deleted',
        mode === 'keep_workbooks'
          ? 'Folder deleted. Workbooks moved to workspace root.'
          : 'Folder and all contained workbooks permanently deleted.'
      );
      get().closeDeleteFolder();
      await get().loadWorkspaceData(get().currentView, get().activeFolderId);
    } catch (err) {
      Logger.error('WorkspaceStore', 'Failed to delete folder', err);
      toast.error('Delete Failed', 'Could not delete folder.');
      throw err;
    }
  }
}));
