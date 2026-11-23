import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const CreateWorkbookDialog: React.FC = () => {
  const navigate = useNavigate();
  const isOpen = useWorkspaceStore((state) => state.isCreateWorkbookOpen);
  const initialFolderId = useWorkspaceStore((state) => state.createWorkbookFolderId);
  const close = useWorkspaceStore((state) => state.closeCreateWorkbook);
  const createWorkbook = useWorkspaceStore((state) => state.createWorkbook);
  const folders = useWorkspaceStore((state) => state.folders);

  const [name, setName] = useState('Untitled Workbook');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('Untitled Workbook');
      setSelectedFolderId(initialFolderId || 'root');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialFolderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Workbook name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const targetFolderId = selectedFolderId === 'root' ? null : selectedFolderId;
      const created = await createWorkbook(trimmed, targetFolderId);
      navigate(`/workbook/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workbook');
      setIsSubmitting(false);
    }
  };

  const folderOptions = [
    { value: 'root', label: 'Workspace Root (Unfiled)' },
    ...folders.map((f) => ({ value: f.id, label: f.name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Create New Workbook"
      description="Create a clean local spreadsheet saved to your device's IndexedDB."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Create & Open
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
          placeholder="e.g. Q4 Financial Model, Inventory, Budget"
          errorMessage={error || undefined}
          autoFocus
          required
        />

        <Select
          label="Destination Folder"
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          options={folderOptions}
          helperText="You can move this workbook anytime later."
        />
      </form>
    </Modal>
  );
};
