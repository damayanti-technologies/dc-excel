import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const RenameFolderDialog: React.FC = () => {
  const folderToRename = useWorkspaceStore((state) => state.folderToRename);
  const close = useWorkspaceStore((state) => state.closeRenameFolder);
  const renameFolder = useWorkspaceStore((state) => state.renameFolder);

  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folderToRename) {
      setName(folderToRename.name);
      setError(null);
      setIsSubmitting(false);
    }
  }, [folderToRename]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folderToRename) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await renameFolder(folderToRename.id, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(folderToRename)}
      onClose={close}
      title="Rename Folder"
      description="Enter a new name for this folder."
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
          label="Folder Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Folder name"
          errorMessage={error || undefined}
          autoFocus
          required
        />
      </form>
    </Modal>
  );
};
