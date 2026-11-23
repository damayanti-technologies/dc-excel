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

interface WorkbookListItemProps {
  workbook: WorkbookSummary;
  folders: FolderSummary[];
}

export const WorkbookListItem: React.FC<WorkbookListItemProps> = ({ workbook, folders }) => {
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
      className="group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-border/80 bg-surface hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer text-xs"
    >
      {/* Left: Icon, Star, Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Star Button */}
        <button
          type="button"
          onClick={handleStarToggle}
          className={cn(
            'p-1 rounded transition-colors shrink-0',
            workbook.isStarred
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-foreground-subtle hover:text-foreground opacity-30 group-hover:opacity-100'
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

        <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <span
            className="font-semibold text-foreground group-hover:text-accent transition-colors truncate block"
            title={workbook.name}
          >
            {workbook.name}
          </span>
        </div>
      </div>

      {/* Middle: Folder & Sheets */}
      <div className="hidden sm:flex items-center gap-4 text-foreground-muted shrink-0 text-[11px]">
        {folder ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-secondary text-foreground-secondary border border-border/60 max-w-[130px] truncate">
            <FolderIcon className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{folder.name}</span>
          </span>
        ) : (
          <span className="text-foreground-subtle w-24">Workspace Root</span>
        )}

        <span className="w-16 text-right">
          {workbook.sheetCount} {workbook.sheetCount === 1 ? 'sheet' : 'sheets'}
        </span>
      </div>

      {/* Right: Date & Actions */}
      <div className="flex items-center gap-3 shrink-0 text-foreground-muted text-[11px]">
        <span
          className="hidden md:inline w-28 text-right"
          title={new Date(workbook.updatedAt).toLocaleString()}
        >
          {workbook.lastOpenedAt
            ? formatRelativeTime(workbook.lastOpenedAt)
            : formatRelativeTime(workbook.updatedAt)}
        </span>

        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
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
    </div>
  );
};
