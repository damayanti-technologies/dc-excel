import React from 'react';
import {
  ArrowUpDown,
  LayoutGrid,
  List,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  SortAsc
} from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import {
  useWorkspaceStore,
  WorkspaceSortBy
} from '@/stores/workspace-store';
import { cn } from '@/utils/cn';

interface SortDropdownProps {
  showViewToggle?: boolean;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ showViewToggle = true }) => {
  const sortBy = useWorkspaceStore((state) => state.sortBy);
  const sortOrder = useWorkspaceStore((state) => state.sortOrder);
  const viewMode = useWorkspaceStore((state) => state.viewMode);
  const setSortBy = useWorkspaceStore((state) => state.setSortBy);
  const setSortOrder = useWorkspaceStore((state) => state.setSortOrder);
  const setViewMode = useWorkspaceStore((state) => state.setViewMode);

  const sortLabels: Record<WorkspaceSortBy, string> = {
    updatedAt: 'Last Modified',
    lastOpenedAt: 'Last Opened',
    name: 'Name',
    createdAt: 'Date Created'
  };

  const sortItems: (DropdownItem | 'divider')[] = [
    {
      id: 'sort-updated',
      label: 'Last Modified',
      icon: <Clock className="w-3.5 h-3.5" />,
      shortcut: sortBy === 'updatedAt' ? '✓' : undefined,
      onClick: () => setSortBy('updatedAt')
    },
    {
      id: 'sort-opened',
      label: 'Last Opened',
      icon: <Clock className="w-3.5 h-3.5" />,
      shortcut: sortBy === 'lastOpenedAt' ? '✓' : undefined,
      onClick: () => setSortBy('lastOpenedAt')
    },
    {
      id: 'sort-name',
      label: 'Name (A-Z)',
      icon: <SortAsc className="w-3.5 h-3.5" />,
      shortcut: sortBy === 'name' ? '✓' : undefined,
      onClick: () => setSortBy('name')
    },
    {
      id: 'sort-created',
      label: 'Date Created',
      icon: <Calendar className="w-3.5 h-3.5" />,
      shortcut: sortBy === 'createdAt' ? '✓' : undefined,
      onClick: () => setSortBy('createdAt')
    }
  ];

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sort By Dropdown */}
      <Dropdown
        align="right"
        trigger={
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-xs font-medium text-foreground transition-colors cursor-pointer"
            aria-label="Sort options"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-foreground-muted" />
            <span>{sortLabels[sortBy]}</span>
          </button>
        }
        items={sortItems}
      />

      {/* Asc / Desc Direction Toggle */}
      <button
        type="button"
        onClick={toggleSortOrder}
        className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
        title={sortOrder === 'asc' ? 'Ascending (Click for Descending)' : 'Descending (Click for Ascending)'}
        aria-label="Toggle sort order"
      >
        {sortOrder === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5 text-accent" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 text-accent" />
        )}
      </button>

      {/* View Mode Toggle (Grid / List) */}
      {showViewToggle && (
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            )}
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            )}
            title="List view"
            aria-label="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
