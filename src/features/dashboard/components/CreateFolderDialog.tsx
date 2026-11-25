import React, { useState, useEffect } from 'react';
import { Folder as FolderIcon, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/utils/cn';

const COLOR_OPTIONS = [
  { value: '#10b981', label: 'Emerald' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#d97706', label: 'Amber' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#e11d48', label: 'Rose' },
  { value: '#475569', label: 'Slate' }
];

export const CreateFolderDialog: React.FC = () => {
  const isOpen = useWorkspaceStore((state) => state.isCreateFolderOpen);
  const close = useWorkspaceStore((state) => state.closeCreateFolder);
  const createFolder = useWorkspaceStore((state) => state.createFolder);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setColor('#10b981');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createFolder(trimmed, color);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Create New Folder"
      description="Organize your spreadsheets into categorized local folders."
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
            leftIcon={<FolderIcon className="w-4 h-4" />}
          >
            Create Folder
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
          placeholder="e.g. Finance, Marketing, Projects"
          errorMessage={error || undefined}
          autoFocus
          required
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Folder Color</label>
          <div className="flex items-center gap-2.5 pt-1">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer',
                  color === c.value ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-105'
                )}
                style={{ backgroundColor: c.value }}
                title={c.label}
                aria-label={`Select ${c.label} color`}
              >
                {color === c.value && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
