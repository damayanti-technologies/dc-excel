import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const MoveWorkbookDialog: React.FC = () => {
  const workbookToMove = useWorkspaceStore((state) => state.workbookToMove);
  const close = useWorkspaceStore((state) => state.closeMoveWorkbook);
  const moveWorkbook = useWorkspaceStore((state) => state.moveWorkbook);
  const folders = useWorkspaceStore((state) => state.folders);

  const [targetFolderId, setTargetFolderId] = useState<string>('root');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workbookToMove) {
      setTargetFolderId(workbookToMove.folderId || 'root');
      setIsSubmitting(false);
    }
  }, [workbookToMove]);

  const handleSubmit = async () => {
    if (!workbookToMove) return;
    try {
      setIsSubmitting(true);
      const destination = targetFolderId === 'root' ? null : targetFolderId;
      await moveWorkbook(workbookToMove.id, destination);
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [
    { value: 'root', label: 'Workspace Root (Unfiled)' },
    ...folders.map((f) => ({ value: f.id, label: f.name }))
  ];

  return (
    <Modal
      isOpen={Boolean(workbookToMove)}
      onClose={close}
      title="Move Workbook"
      description={`Choose where to store "${workbookToMove?.name || ''}".`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => void handleSubmit()}
            isLoading={isSubmitting}
          >
            Move Workbook
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <Select
          label="Destination Folder"
          value={targetFolderId}
          onChange={(e) => setTargetFolderId(e.target.value)}
          options={options}
          helperText="Moving will update folder organization immediately."
        />
      </div>
    </Modal>
  );
};
