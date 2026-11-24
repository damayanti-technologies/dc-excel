import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface MergeConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MergeConfirmDialog: React.FC<MergeConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Merge Cells Warning">
      <div className="flex items-start gap-3 py-2">
        <div className="p-2 bg-amber-500/10 rounded-full text-amber-500 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 text-sm text-foreground space-y-1">
          <p className="font-medium">
            Merging cells only preserves the upper-left cell's value.
          </p>
          <p className="text-foreground-secondary text-xs">
            Any values or formulas stored in the remaining cells of the selected range will be discarded.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Merge Anyway
        </Button>
      </div>
    </Modal>
  );
};
