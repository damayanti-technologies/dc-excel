import React, { useState } from 'react';
import { AlertTriangle, FolderInput, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/utils/cn';

export const DeleteFolderDialog: React.FC = () => {
  const folderToDelete = useWorkspaceStore((state) => state.folderToDelete);
  const close = useWorkspaceStore((state) => state.closeDeleteFolder);
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder);

  const [mode, setMode] = useState<'keep_workbooks' | 'delete_all'>('keep_workbooks');
  const [isDeleting, setIsDeleting] = useState(false);

  const workbookCount = folderToDelete?.workbookCount || 0;

  const handleConfirm = async () => {
    if (!folderToDelete) return;
    try {
      setIsDeleting(true);
      await deleteFolder(folderToDelete.id, mode);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(folderToDelete)}
      onClose={close}
      title={`Delete Folder: ${folderToDelete?.name || ''}`}
      description="Choose what to do with the workbooks inside this folder."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={close} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant={mode === 'delete_all' ? 'danger' : 'accent'}
            size="sm"
            onClick={() => void handleConfirm()}
            isLoading={isDeleting}
            leftIcon={mode === 'delete_all' ? <Trash2 className="w-4 h-4" /> : <FolderInput className="w-4 h-4" />}
          >
            {mode === 'delete_all' ? 'Delete Folder & Workbooks' : 'Delete Folder Only'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        {workbookCount > 0 ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              This folder currently contains{' '}
              <strong>
                {workbookCount} {workbookCount === 1 ? 'workbook' : 'workbooks'}
              </strong>
              . Choose how you want DC Excel to handle them:
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground-secondary">
            This folder is empty. Deleting it will remove the folder permanently.
          </p>
        )}

        {workbookCount > 0 && (
          <div className="space-y-2">
            {/* Option 1: Keep workbooks (default) */}
            <label
              onClick={() => setMode('keep_workbooks')}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                mode === 'keep_workbooks'
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-border bg-surface hover:bg-surface-secondary'
              )}
            >
              <input
                type="radio"
                name="delete_folder_mode"
                checked={mode === 'keep_workbooks'}
                onChange={() => setMode('keep_workbooks')}
                className="mt-0.5 text-accent focus:ring-accent"
              />
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-foreground">
                  Keep workbooks (Recommended)
                </div>
                <div className="text-foreground-muted">
                  The folder will be deleted, and all {workbookCount} workbooks will be safely moved
                  to your workspace root.
                </div>
              </div>
            </label>

            {/* Option 2: Delete all */}
            <label
              onClick={() => setMode('delete_all')}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                mode === 'delete_all'
                  ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500'
                  : 'border-border bg-surface hover:bg-surface-secondary'
              )}
            >
              <input
                type="radio"
                name="delete_folder_mode"
                checked={mode === 'delete_all'}
                onChange={() => setMode('delete_all')}
                className="mt-0.5 text-red-500 focus:ring-red-500"
              />
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold text-red-600 dark:text-red-400">
                  Delete everything inside
                </div>
                <div className="text-foreground-muted">
                  Permanently erase the folder AND all {workbookCount} workbooks and their sheets from
                  local storage. This cannot be undone.
                </div>
              </div>
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
};
