import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { Sheet } from '@/types/sheet';
import { cn } from '@/utils/cn';

interface UnhideSheetsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hiddenSheets: Sheet[];
  onUnhide: (sheetId: string) => void;
}

export const UnhideSheetsDialog: React.FC<UnhideSheetsDialogProps> = ({
  isOpen,
  onClose,
  hiddenSheets,
  onUnhide
}) => {
  const [selectedSheetId, setSelectedSheetId] = useState<string>(
    hiddenSheets[0]?.id || ''
  );

  // Sync selection when hiddenSheets changes
  React.useEffect(() => {
    if (hiddenSheets.length > 0 && !hiddenSheets.some((s) => s.id === selectedSheetId)) {
      setSelectedSheetId(hiddenSheets[0]!.id);
    }
  }, [hiddenSheets, selectedSheetId]);

  const handleConfirm = () => {
    if (selectedSheetId) {
      onUnhide(selectedSheetId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unhide Worksheet"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedSheetId || hiddenSheets.length === 0}
          >
            Unhide
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-foreground-muted">
          Select a worksheet to restore to the tab bar:
        </p>

        {hiddenSheets.length === 0 ? (
          <div className="py-6 text-center text-foreground-muted text-xs flex flex-col items-center gap-2">
            <EyeOff className="w-6 h-6 text-foreground-muted/50" />
            <span>No hidden worksheets in this workbook.</span>
          </div>
        ) : (
          <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border bg-surface">
            {hiddenSheets.map((sheet) => {
              const isSelected = sheet.id === selectedSheetId;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => setSelectedSheetId(sheet.id)}
                  onDoubleClick={() => {
                    onUnhide(sheet.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-foreground hover:bg-surface-secondary'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {sheet.metadata?.tabColor && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sheet.metadata.tabColor }}
                      />
                    )}
                    <span className="truncate">{sheet.name}</span>
                  </div>
                  {isSelected && <Eye className="w-3.5 h-3.5 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
