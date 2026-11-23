import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const RenameWorkbookDialog: React.FC = () => {
  const workbookToRename = useWorkspaceStore((state) => state.workbookToRename);
  const close = useWorkspaceStore((state) => state.closeRenameWorkbook);
  const renameWorkbook = useWorkspaceStore((state) => state.renameWorkbook);

  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workbookToRename) {
      setName(workbookToRename.name);
      setError(null);
      setIsSubmitting(false);
    }
  }, [workbookToRename]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workbookToRename) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Workbook name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await renameWorkbook(workbookToRename.id, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename workbook');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(workbookToRename)}
      onClose={close}
      title="Rename Workbook"
      description="Enter a new name for this spreadsheet."
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
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <Input
          label="Workbook Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Workbook name"
          errorMessage={error || undefined}
          autoFocus
          required
        />
      </form>
    </Modal>
  );
};
