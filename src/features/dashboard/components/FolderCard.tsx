import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder as FolderIcon, MoreVertical, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { FolderSummary } from '@/types/folder';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface FolderCardProps {
  folder: FolderSummary;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder }) => {
  const navigate = useNavigate();
  const openRenameFolder = useWorkspaceStore((state) => state.openRenameFolder);
  const openDeleteFolder = useWorkspaceStore((state) => state.openDeleteFolder);

  const handleOpen = () => {
    navigate(`/folders/${folder.id}`);
  };

  const menuItems: (DropdownItem | 'divider')[] = [
    {
      id: 'open',
      label: 'Open Folder',
      icon: <FolderOpen className="w-3.5 h-3.5 text-accent" />,
      onClick: handleOpen
    },
    {
      id: 'rename',
      label: 'Rename Folder',
      icon: <Edit2 className="w-3.5 h-3.5 text-foreground-muted" />,
      onClick: () => openRenameFolder(folder)
    },
    'divider',
    {
      id: 'delete',
      label: 'Delete Folder',
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      destructive: true,
      onClick: () => openDeleteFolder(folder)
    }
  ];

  return (
    <div
      onClick={handleOpen}
      className="group relative flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-accent/40 hover:shadow-xs transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{
            backgroundColor: `${folder.color || '#2563eb'}18`,
            color: folder.color || '#2563eb'
          }}
        >
          <FolderIcon className="w-5 h-5 fill-current/20" />
        </div>

        <div className="min-w-0">
          <h3
            className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate"
            title={folder.name}
          >
            {folder.name}
          </h3>
          <p className="text-xs text-foreground-muted">
            {folder.workbookCount} {folder.workbookCount === 1 ? 'workbook' : 'workbooks'}
          </p>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="p-1.5 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
              title="Folder options"
              aria-label="Folder options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          }
          items={menuItems}
        />
      </div>
    </div>
  );
};
