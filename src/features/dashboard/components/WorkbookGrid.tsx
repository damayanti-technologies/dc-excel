import React from 'react';
import { WorkbookSummary } from '@/types/workbook';
import { FolderSummary } from '@/types/folder';
import { WorkbookCard } from './WorkbookCard';

interface WorkbookGridProps {
  workbooks: WorkbookSummary[];
  folders: FolderSummary[];
}

export const WorkbookGrid: React.FC<WorkbookGridProps> = ({ workbooks, folders }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {workbooks.map((workbook) => (
        <WorkbookCard key={workbook.id} workbook={workbook} folders={folders} />
      ))}
    </div>
  );
};
