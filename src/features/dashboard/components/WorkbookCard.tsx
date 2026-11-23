import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Star,
  MoreVertical,
  Folder as FolderIcon,
  Copy,
  Edit2,
  FolderInput,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { WorkbookSummary } from '@/types/workbook';
import { FolderSummary } from '@/types/folder';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { formatRelativeTime } from '@/utils/date';
import { cn } from '@/utils/cn';

interface WorkbookCardProps {
  workbook: WorkbookSummary;
  folders: FolderSummary[];
}

export const WorkbookCard: React.FC<WorkbookCardProps> = ({ workbook, folders }) => {
  const navigate = useNavigate();
  const toggleStar = useWorkspaceStore((state) => state.toggleStar);
  const openRenameWorkbook = useWorkspaceStore((state) => state.openRenameWorkbook);
  const duplicateWorkbook = useWorkspaceStore((state) => state.duplicateWorkbook);
  const openMoveWorkbook = useWorkspaceStore((state) => state.openMoveWorkbook);
  const openDeleteWorkbook = useWorkspaceStore((state) => state.openDeleteWorkbook);

  const folder = workbook.folderId ? folders.find((f) => f.id === workbook.folderId) : null;

  const handleOpen = () => {
    navigate(`/workbook/${workbook.id}`);
  };

  const handleStarToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleStar(workbook.id);
  };

  const menuItems: (DropdownItem | 'divider')[] = [
    {
      id: 'open',
      label: 'Open Workbook',
      icon: <ExternalLink className="w-3.5 h-3.5 text-accent" />,
      onClick: handleOpen
    },
    {
      id: 'star',
      label: workbook.isStarred ? 'Remove from Starred' : 'Add to Starred',
      icon: (
        <Star
          className={cn(
            'w-3.5 h-3.5',
            workbook.isStarred ? 'fill-amber-400 text-amber-500' : 'text-foreground-muted'
          )}
        />
      ),
      onClick: () => void toggleStar(workbook.id)
    },
    'divider',
    {
      id: 'rename',
      label: 'Rename',
      icon: <Edit2 className="w-3.5 h-3.5 text-foreground-muted" />,
      onClick: () => openRenameWorkbook(workbook)
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-3.5 h-3.5 text-foreground-muted" />,
      onClick: () => void duplicateWorkbook(workbook.id)
    },
    {
      id: 'move',
      label: 'Move to Folder',
      icon: <FolderInput className="w-3.5 h-3.5 text-foreground-muted" />,
      onClick: () => openMoveWorkbook(workbook)
    },
    'divider',
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      destructive: true,
      onClick: () => openDeleteWorkbook(workbook)
    }
  ];

  return (
    <div
      onClick={handleOpen}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 hover:shadow-md transition-all cursor-pointer overflow-hidden p-4 space-y-3"
    >
      {/* Top Header: Preview icon & Quick Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <FileSpreadsheet className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Star toggle button */}
          <button
            type="button"
            onClick={handleStarToggle}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              workbook.isStarred
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-foreground-subtle hover:text-foreground hover:bg-surface-secondary opacity-0 group-hover:opacity-100 focus:opacity-100'
            )}
            title={workbook.isStarred ? 'Unstar' : 'Star'}
            aria-label={workbook.isStarred ? 'Unstar workbook' : 'Star workbook'}
          >
            <Star
              className={cn(
                'w-4 h-4',
                workbook.isStarred && 'fill-amber-400 text-amber-500'
              )}
            />
          </button>

          {/* Context Menu Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors focus-ring"
                title="Workbook options"
                aria-label="Workbook options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            }
            items={menuItems}
          />
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="space-y-1.5 min-w-0">
        <h3
          className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate"
          title={workbook.name}
        >
          {workbook.name}
        </h3>

        {/* Folder tag if present */}
        {folder && (
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-secondary text-[11px] font-medium text-foreground-secondary border border-border/60 max-w-full truncate">
            <FolderIcon className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{folder.name}</span>
          </div>
        )}
      </div>

      {/* Footer details: Sheet count & Modified / Opened time */}
      <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px] text-foreground-muted">
        <span>
          {workbook.sheetCount} {workbook.sheetCount === 1 ? 'sheet' : 'sheets'}
        </span>
        <span title={new Date(workbook.updatedAt).toLocaleString()}>
          {workbook.lastOpenedAt
            ? `Opened ${formatRelativeTime(workbook.lastOpenedAt)}`
            : `Modified ${formatRelativeTime(workbook.updatedAt)}`}
        </span>
      </div>
    </div>
  );
};
