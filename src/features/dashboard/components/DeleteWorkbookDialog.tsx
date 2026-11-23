import React, { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const DeleteWorkbookDialog: React.FC = () => {
  const workbookToDelete = useWorkspaceStore((state) => state.workbookToDelete);
  const close = useWorkspaceStore((state) => state.closeDeleteWorkbook);
  const deleteWorkbook = useWorkspaceStore((state) => state.deleteWorkbook);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!workbookToDelete) return;
    try {
      setIsDeleting(true);
      await deleteWorkbook(workbookToDelete.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={Boolean(workbookToDelete)}
      onClose={close}
      onConfirm={() => void handleConfirm()}
      title="Delete Workbook"
      message={`Are you sure you want to delete "${workbookToDelete?.name || ''}"? This will permanently delete the workbook and all sheets inside it from your browser's local storage. This action cannot be undone.`}
      confirmLabel="Delete Permanently"
      isDestructive={true}
      isLoading={isDeleting}
    />
  );
};
