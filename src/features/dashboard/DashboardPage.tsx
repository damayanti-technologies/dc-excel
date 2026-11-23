import React, { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Folder as FolderIcon,
  Plus,
  Star,
  Clock,
  ArrowRight,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import {
  useWorkspaceStore,
  WorkspaceView
} from '@/stores/workspace-store';
import {
  DashboardWelcome,
  QuickActions,
  SortDropdown,
  WorkbookGrid,
  WorkbookList,
  FolderGrid,
  RenameWorkbookDialog,
  DeleteWorkbookDialog,
  MoveWorkbookDialog,
  CreateFolderDialog,
  RenameFolderDialog,
  DeleteFolderDialog
} from './components';

interface DashboardPageProps {
  viewModeOverride?: WorkspaceView | 'folders' | 'folder_detail';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ viewModeOverride }) => {
  const { folderId } = useParams<{ folderId?: string }>();

  const workbooks = useWorkspaceStore((state) => state.workbooks);
  const folders = useWorkspaceStore((state) => state.folders);
  const activeFolder = useWorkspaceStore((state) => state.activeFolder);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const loadWorkspaceData = useWorkspaceStore((state) => state.loadWorkspaceData);

  const searchQuery = useWorkspaceStore((state) => state.searchQuery);
  const setSearchQuery = useWorkspaceStore((state) => state.setSearchQuery);
  const sortBy = useWorkspaceStore((state) => state.sortBy);
  const sortOrder = useWorkspaceStore((state) => state.sortOrder);
  const viewMode = useWorkspaceStore((state) => state.viewMode);

  const openCreateWorkbook = useWorkspaceStore((state) => state.openCreateWorkbook);
  const openCreateFolder = useWorkspaceStore((state) => state.openCreateFolder);
  const openRenameFolder = useWorkspaceStore((state) => state.openRenameFolder);
  const openDeleteFolder = useWorkspaceStore((state) => state.openDeleteFolder);

  // Determine current effective view
  const currentView = viewModeOverride || (folderId ? 'folder_detail' : 'home');

  useEffect(() => {
    void loadWorkspaceData(
      currentView === 'folder_detail' ? 'folder' : (currentView as WorkspaceView),
      folderId || null
    );
  }, [currentView, folderId, loadWorkspaceData]);

  // Filter and sort workbooks
  const filteredWorkbooks = useMemo(() => {
    let list = [...workbooks];

    // Filter by view
    if (currentView === 'recent') {
      list = list.filter((wb) => wb.lastOpenedAt || wb.updatedAt);
    } else if (currentView === 'starred') {
      list = list.filter((wb) => wb.isStarred);
    } else if (currentView === 'folder_detail' && folderId) {
      list = list.filter((wb) => wb.folderId === folderId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((wb) => wb.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastOpenedAt': {
          const aOpened = a.lastOpenedAt || 0;
          const bOpened = b.lastOpenedAt || 0;
          comparison = aOpened - bOpened;
          break;
        }
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'updatedAt':
        default:
          comparison = a.updatedAt - b.updatedAt;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [workbooks, currentView, folderId, searchQuery, sortBy, sortOrder]);

  // Recent workbooks for Home view
  const homeRecentWorkbooks = useMemo(() => {
    const list = [...workbooks];
    list.sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt));
    return list.slice(0, 4);
  }, [workbooks]);

  if (isLoading && workbooks.length === 0) {
    return <LoadingState message="Loading your local workspace..." />;
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 select-none">
      {/* 1. View Specific Headers */}
      {currentView === 'home' && (
        <div className="space-y-6">
          <DashboardWelcome />
          <QuickActions />
        </div>
      )}

      {currentView === 'recent' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Recent Workbooks
              </h1>
              <Badge variant="neutral" size="sm">
                {filteredWorkbooks.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Spreadsheets you have recently opened or edited.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Filter recent..."
              className="w-full sm:w-60"
            />
            <SortDropdown />
          </div>
        </div>
      )}

      {currentView === 'starred' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Starred Workbooks
              </h1>
              <Badge variant="neutral" size="sm">
                {filteredWorkbooks.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Your favorite spreadsheets flagged for quick access.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Filter starred..."
              className="w-full sm:w-60"
            />
            <SortDropdown />
          </div>
        </div>
      )}

      {currentView === 'all' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                My Workbooks
              </h1>
              <Badge variant="neutral" size="sm">
                {filteredWorkbooks.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted">
              All spreadsheets across your entire local workspace.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search all workbooks..."
              className="w-full sm:w-60"
            />
            <SortDropdown />
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => openCreateWorkbook()}
            >
              New Workbook
            </Button>
          </div>
        </div>
      )}

      {currentView === 'folders' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5 text-accent" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                My Folders
              </h1>
              <Badge variant="neutral" size="sm">
                {folders.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Organize spreadsheets into categorized workspaces.
            </p>
          </div>
          <Button
            variant="accent"
            size="sm"
            leftIcon={<FolderPlus className="w-4 h-4" />}
            onClick={openCreateFolder}
          >
            Create Folder
          </Button>
        </div>
      )}

      {currentView === 'folder_detail' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${activeFolder?.color || '#2563eb'}20`,
                  color: activeFolder?.color || '#2563eb'
                }}
              >
                <FolderIcon className="w-4 h-4 fill-current/20" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {activeFolder?.name || 'Folder'}
              </h1>
              <Badge variant="neutral" size="sm">
                {filteredWorkbooks.length} {filteredWorkbooks.length === 1 ? 'workbook' : 'workbooks'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted">
              Showing workbooks stored inside this folder.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeFolder && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openRenameFolder({
                      ...activeFolder,
                      workbookCount: filteredWorkbooks.length
                    })
                  }
                >
                  Rename Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openDeleteFolder({
                      ...activeFolder,
                      workbookCount: filteredWorkbooks.length
                    })
                  }
                  className="text-red-600 dark:text-red-400 hover:border-red-500/50"
                >
                  Delete Folder
                </Button>
              </>
            )}
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => openCreateWorkbook(folderId)}
            >
              New in Folder
            </Button>
          </div>
        </div>
      )}

      {/* 2. Main Body Content Based on View */}

      {/* Folders List View */}
      {currentView === 'folders' && (
        <div>
          {folders.length === 0 ? (
            <EmptyState
              icon={<FolderIcon className="w-7 h-7 text-accent" />}
              title="No Folders Created"
              description="Create folders to group related financial models, project budgets, or research sheets."
              action={
                <Button
                  variant="accent"
                  size="sm"
                  leftIcon={<FolderPlus className="w-4 h-4" />}
                  onClick={openCreateFolder}
                >
                  Create Your First Folder
                </Button>
              }
            />
          ) : (
            <FolderGrid folders={folders} />
          )}
        </div>
      )}

      {/* Home View Sections */}
      {currentView === 'home' && (
        <div className="space-y-8">
          {/* Folders Quick Access on Home (if any exist) */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-2">
                  <FolderIcon className="w-3.5 h-3.5 text-accent" />
                  <span>Folders</span>
                  <Badge variant="neutral" size="sm">{folders.length}</Badge>
                </div>
                <Link
                  to="/folders"
                  className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <FolderGrid folders={folders.slice(0, 4)} />
            </div>
          )}

          {/* Recent Workbooks section on Home */}
          {homeRecentWorkbooks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>Recent Workbooks</span>
                </div>
                {workbooks.length > 4 && (
                  <Link
                    to="/recent"
                    className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    <span>View all recent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              <WorkbookGrid workbooks={homeRecentWorkbooks} folders={folders} />
            </div>
          )}

          {/* All Workbooks header and list/grid on Home */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-accent" />
                  <span>All Workbooks</span>
                  <Badge variant="neutral" size="sm">{workbooks.length}</Badge>
                </div>
                <p className="text-xs text-foreground-muted">
                  IndexedDB persistent storage
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Search workbooks..."
                  className="w-full sm:w-56"
                />
                <SortDropdown />
              </div>
            </div>

            {/* Workbook Grid or List */}
            {filteredWorkbooks.length === 0 ? (
              <EmptyState
                icon={<FileSpreadsheet className="w-7 h-7 text-accent" />}
                title={searchQuery ? 'No Matching Workbooks' : 'No Workbooks Yet'}
                description={
                  searchQuery
                    ? `No workbooks found matching "${searchQuery}". Clear your search query to see all spreadsheets.`
                    : 'Get started by creating your first spreadsheet workbook. It will be stored safely in your browser.'
                }
                action={
                  searchQuery ? (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => openCreateWorkbook()}
                    >
                      Create Workbook
                    </Button>
                  )
                }
              />
            ) : viewMode === 'grid' ? (
              <WorkbookGrid workbooks={filteredWorkbooks} folders={folders} />
            ) : (
              <WorkbookList workbooks={filteredWorkbooks} folders={folders} />
            )}
          </div>
        </div>
      )}

      {/* Specific Filter Views: Recent, Starred, All, Folder Detail */}
      {(currentView === 'recent' ||
        currentView === 'starred' ||
        currentView === 'all' ||
        currentView === 'folder_detail') && (
        <div>
          {filteredWorkbooks.length === 0 ? (
            <EmptyState
              icon={
                currentView === 'starred' ? (
                  <Star className="w-7 h-7 text-amber-500" />
                ) : currentView === 'recent' ? (
                  <Clock className="w-7 h-7 text-accent" />
                ) : (
                  <FileSpreadsheet className="w-7 h-7 text-accent" />
                )
              }
              title={
                searchQuery
                  ? 'No Matching Workbooks'
                  : currentView === 'starred'
                  ? 'No Starred Workbooks'
                  : currentView === 'recent'
                  ? 'No Recent Workbooks'
                  : currentView === 'folder_detail'
                  ? 'This Folder is Empty'
                  : 'No Workbooks Found'
              }
              description={
                searchQuery
                  ? `No workbooks matching "${searchQuery}". Clear your search query.`
                  : currentView === 'starred'
                  ? 'Click the star icon on any workbook card or row to pin it here for quick access.'
                  : currentView === 'recent'
                  ? 'Workbooks you open will automatically appear in this list.'
                  : currentView === 'folder_detail'
                  ? 'Create a workbook in this folder or move existing workbooks here.'
                  : 'Your workspace has no workbooks yet.'
              }
              action={
                searchQuery ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                ) : currentView === 'folder_detail' ? (
                  <Button
                    variant="accent"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => openCreateWorkbook(folderId)}
                  >
                    Create Workbook in Folder
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => openCreateWorkbook()}
                  >
                    Create Workbook
                  </Button>
                )
              }
            />
          ) : viewMode === 'grid' ? (
            <WorkbookGrid workbooks={filteredWorkbooks} folders={folders} />
          ) : (
            <WorkbookList workbooks={filteredWorkbooks} folders={folders} />
          )}
        </div>
      )}

      {/* All Reusable Modals & Dialogs */}
      <RenameWorkbookDialog />
      <DeleteWorkbookDialog />
      <MoveWorkbookDialog />
      <CreateFolderDialog />
      <RenameFolderDialog />
      <DeleteFolderDialog />
    </div>
  );
};
