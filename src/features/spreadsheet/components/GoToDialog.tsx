import React, { useState, useEffect } from 'react';
import { Sheet } from '@/types/sheet';
import { CellCoordinates, CellRange } from '@/types/cell';
import { NamedRange } from '@/types/analysis';
import { a1ToRange, coordToA1 } from '@/utils/coordinates';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Navigation, Bookmark, History } from 'lucide-react';
import { cn } from '@/utils/cn';

interface GoToDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeCell: CellCoordinates | null;
  currentSheetId: string;
  sheets: Sheet[];
  namedRanges: NamedRange[];
  onNavigate: (sheetId: string, range: CellRange) => void;
}

export const GoToDialog: React.FC<GoToDialogProps> = ({
  isOpen,
  onClose,
  activeCell,
  currentSheetId,
  sheets,
  namedRanges,
  onNavigate
}) => {
  const [referenceInput, setReferenceInput] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState(currentSheetId);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentLocations, setRecentLocations] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setReferenceInput(activeCell ? coordToA1(activeCell) : 'A1');
      setSelectedSheetId(currentSheetId);
      setErrorMessage('');
    }
  }, [isOpen, activeCell, currentSheetId]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const raw = referenceInput.trim();
    if (!raw) return;

    let targetSheetId = selectedSheetId;
    let targetRef = raw;

    // Support SheetName!A1 syntax if present
    if (raw.includes('!')) {
      const [sheetPart, refPart] = raw.split('!');
      const cleanSheetName = sheetPart!.replace(/^'|'$/g, '').trim();
      const foundSheet = sheets.find(
        (s) => s.name.toLowerCase() === cleanSheetName.toLowerCase()
      );
      if (foundSheet) {
        targetSheetId = foundSheet.id;
        targetRef = refPart!.trim();
      } else {
        setErrorMessage(`Worksheet "${cleanSheetName}" not found.`);
        return;
      }
    }

    // 1. Check if it's a named range
    const matchedNamedRange = namedRanges.find(
      (nr) => nr.name.toLowerCase() === targetRef.toLowerCase()
    );
    if (matchedNamedRange) {
      if (matchedNamedRange.scope === 'sheet' && matchedNamedRange.sheetId) {
        targetSheetId = matchedNamedRange.sheetId;
      }
      onNavigate(targetSheetId, matchedNamedRange.range);
      updateRecents(matchedNamedRange.name);
      onClose();
      return;
    }

    // 2. Parse as A1 coordinate or range
    const parsedRange = a1ToRange(targetRef);
    if (parsedRange) {
      onNavigate(targetSheetId, parsedRange);
      const displayLabel = `${sheets.find((s) => s.id === targetSheetId)?.name || 'Sheet'}!${targetRef.toUpperCase()}`;
      updateRecents(displayLabel);
      onClose();
    } else {
      setErrorMessage(`Invalid reference: "${targetRef}". Enter A1 notation (e.g. B5), range (e.g. A1:C10), or named range.`);
    }
  };

  const updateRecents = (location: string) => {
    setRecentLocations((prev) => [location, ...prev.filter((l) => l !== location)].slice(0, 5));
  };

  const handleSelectNamedRange = (nr: NamedRange) => {
    const sheetId = nr.scope === 'sheet' && nr.sheetId ? nr.sheetId : selectedSheetId;
    onNavigate(sheetId, nr.range);
    updateRecents(nr.name);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Go To Reference"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Reference Input */}
        <div>
          <label htmlFor="reference-input" className="block text-xs font-medium text-foreground mb-1">
            Reference (e.g. <span className="font-mono text-accent">B5</span>, <span className="font-mono text-accent">A1:C10</span>, or Named Range):
          </label>
          <div className="relative">
            <input
              id="reference-input"
              type="text"
              value={referenceInput}
              onChange={(e) => {
                setReferenceInput(e.target.value);
                setErrorMessage('');
              }}
              placeholder="A1, C5:D15, or Revenue"
              autoFocus
              className={cn(
                'w-full px-3 py-2 text-sm bg-background border rounded-lg font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent',
                errorMessage ? 'border-red-500' : 'border-border'
              )}
            />
          </div>
          {errorMessage && (
            <p className="mt-1 text-xs text-red-500 font-medium">{errorMessage}</p>
          )}
        </div>

        {/* Target Worksheet (if multiple sheets exist) */}
        {sheets.length > 1 && (
          <div>
            <label htmlFor="target-worksheet" className="block text-xs font-medium text-foreground-muted mb-1">
              Target Worksheet:
            </label>
            <select
              id="target-worksheet"
              value={selectedSheetId}
              onChange={(e) => setSelectedSheetId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.metadata?.isHidden ? '(Hidden)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Named Ranges List */}
        {namedRanges.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted mb-1.5">
              <Bookmark className="w-3.5 h-3.5 text-accent" />
              <span>Defined Named Ranges</span>
            </div>
            <div className="border border-border rounded-lg max-h-32 overflow-y-auto divide-y divide-border bg-surface-secondary/40">
              {namedRanges.map((nr) => (
                <button
                  key={nr.id}
                  type="button"
                  onClick={() => handleSelectNamedRange(nr)}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-secondary flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <span className="font-mono font-medium text-foreground group-hover:text-accent">
                    {nr.name}
                  </span>
                  <span className="text-[10px] text-foreground-muted">
                    {nr.scope === 'workbook' ? 'Workbook' : 'Worksheet'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Locations */}
        {recentLocations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted mb-1">
              <History className="w-3.5 h-3.5 text-foreground-muted" />
              <span>Recent Locations</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentLocations.map((loc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setReferenceInput(loc);
                    setErrorMessage('');
                  }}
                  className="px-2 py-0.5 text-[11px] font-mono bg-surface-secondary hover:bg-surface border border-border rounded text-foreground cursor-pointer transition-colors"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5" />
            <span>Go To</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
