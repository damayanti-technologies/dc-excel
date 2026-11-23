import React from 'react';
import { FolderSummary } from '@/types/folder';
import { FolderCard } from './FolderCard';

interface FolderGridProps {
  folders: FolderSummary[];
}

export const FolderGrid: React.FC<FolderGridProps> = ({ folders }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
      {folders.map((folder) => (
        <FolderCard key={folder.id} folder={folder} />
      ))}
    </div>
  );
};
