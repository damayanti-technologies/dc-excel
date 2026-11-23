import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { workbookService } from '@/services';
import { clearAllStores } from '@/storage/indexeddb/database';

describe('Workspace Store & Dashboard Controls', () => {
  beforeEach(async () => {
    await clearAllStores();
    useWorkspaceStore.setState({
      workbooks: [],
      folders: [],
      searchQuery: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      viewMode: 'grid'
    });
  });

  it('updates search query and sort options in store', () => {
    const store = useWorkspaceStore.getState();

    store.setSearchQuery('financial report');
    expect(useWorkspaceStore.getState().searchQuery).toBe('financial report');

    store.setSortBy('name');
    expect(useWorkspaceStore.getState().sortBy).toBe('name');

    store.setSortOrder('asc');
    expect(useWorkspaceStore.getState().sortOrder).toBe('asc');

    store.setViewMode('list');
    expect(useWorkspaceStore.getState().viewMode).toBe('list');
  });

  it('loads workspace data from IndexedDB via loadWorkspaceData', async () => {
    await workbookService.createWorkbook('Alpha Sheet');
    await workbookService.createWorkbook('Beta Sheet');

    await useWorkspaceStore.getState().loadWorkspaceData('home');

    const workbooks = useWorkspaceStore.getState().workbooks;
    expect(workbooks.length).toBe(2);
    expect(workbooks.some((w) => w.name === 'Alpha Sheet')).toBe(true);
    expect(workbooks.some((w) => w.name === 'Beta Sheet')).toBe(true);
  });

  it('handles dialog open and close actions', () => {
    const store = useWorkspaceStore.getState();

    store.openCreateWorkbook('f-123');
    expect(useWorkspaceStore.getState().isCreateWorkbookOpen).toBe(true);
    expect(useWorkspaceStore.getState().createWorkbookFolderId).toBe('f-123');

    store.closeCreateWorkbook();
    expect(useWorkspaceStore.getState().isCreateWorkbookOpen).toBe(false);
    expect(useWorkspaceStore.getState().createWorkbookFolderId).toBeNull();

    store.openCreateFolder();
    expect(useWorkspaceStore.getState().isCreateFolderOpen).toBe(true);

    store.closeCreateFolder();
    expect(useWorkspaceStore.getState().isCreateFolderOpen).toBe(false);
  });
});
