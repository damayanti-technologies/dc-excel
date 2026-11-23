import React from 'react';
import { WorkbookSummary } from '@/types/workbook';
import { FolderSummary } from '@/types/folder';
import { WorkbookListItem } from './WorkbookListItem';

interface WorkbookListProps {
  workbooks: WorkbookSummary[];
  folders: FolderSummary[];
}

export const WorkbookList: React.FC<WorkbookListProps> = ({ workbooks, folders }) => {
  return (
    <div className="space-y-2">
      {/* Header labels */}
      <div className="hidden sm:flex items-center justify-between px-3.5 py-1 text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider">
        <div className="flex-1">Name</div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="w-28">Folder</span>
          <span className="w-16 text-right">Sheets</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="w-28 text-right hidden md:inline">Modified</span>
          <span className="w-7 text-right">Actions</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {workbooks.map((workbook) => (
          <WorkbookListItem key={workbook.id} workbook={workbook} folders={folders} />
        ))}
      </div>
    </div>
  );
};
