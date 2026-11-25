import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { NamedRange, NamedRangeScope } from '@/types/analysis';
import { CellRange } from '@/types/cell';
import {
  validateRangeName,
  formatRangeReference,
  parseRangeReference,
} from '@/engine/analysis/named-ranges';

interface NameManagerDialogProps {
  isOpen: boolean;
  namedRanges: NamedRange[];
  currentSheetId: string;
  currentSheetName: string;
  sheets: { id: string; name: string }[];
  currentSelection?: CellRange;
  onAddNamedRange: (nr: NamedRange) => void;
  onUpdateNamedRange: (nr: NamedRange) => void;
  onDeleteNamedRange: (id: string) => void;
  onClose: () => void;
}

export const NameManagerDialog: React.FC<NameManagerDialogProps> = ({
  isOpen,
  namedRanges,
  currentSheetId,
  currentSheetName,
  sheets,
  currentSelection,
  onAddNamedRange,
  onUpdateNamedRange,
  onDeleteNamedRange,
  onClose,
}) => {
  const [filterScope, setFilterScope] = useState<'all' | 'workbook' | 'sheet'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NamedRange | null>(null);

  // Editor Sub-Dialog State
  const [nameInput, setNameInput] = useState('');
  const [scopeInput, setScopeInput] = useState<NamedRangeScope>('workbook');
  const [sheetIdInput, setSheetIdInput] = useState<string>(currentSheetId);
  const [rangeInput, setRangeInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    setEditingItem(null);
    setNameInput('');
    setScopeInput('workbook');
    setSheetIdInput(currentSheetId);
    setRangeInput(
      currentSelection
        ? formatRangeReference(currentSelection)
        : 'A1:A10'
    );
    setCommentInput('');
    setValidationError(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: NamedRange) => {
    setEditingItem(item);
    setNameInput(item.name);
    setScopeInput(item.scope);
    setSheetIdInput(item.sheetId);
    setRangeInput(formatRangeReference(item.range));
    setCommentInput(item.comment || '');
    setValidationError(null);
    setIsEditorOpen(true);
  };

  const handleSaveEditor = () => {
    // 1. Validate range reference
    const parsedRange = parseRangeReference(rangeInput);
    if (!parsedRange) {
      setValidationError('Invalid cell reference. Use format like A1:B10 or C5.');
      return;
    }

    // 2. Validate range name
    const existingOtherNames = namedRanges
      .filter((nr) => (editingItem ? nr.id !== editingItem.id : true))
      .filter((nr) => (scopeInput === 'workbook' ? true : nr.scope === scopeInput))
      .map((nr) => nr.name);

    const check = validateRangeName(nameInput, existingOtherNames);
    if (!check.isValid) {
      setValidationError(check.error || 'Invalid range name.');
      return;
    }

    if (editingItem) {
      const updated: NamedRange = {
        ...editingItem,
        name: nameInput.trim(),
        scope: scopeInput,
        sheetId: sheetIdInput,
        range: parsedRange,
        comment: commentInput.trim() || undefined,
      };
      onUpdateNamedRange(updated);
    } else {
      const created: NamedRange = {
        id: `nr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: nameInput.trim(),
        scope: scopeInput,
        sheetId: sheetIdInput,
        range: parsedRange,
        comment: commentInput.trim() || undefined,
      };
      onAddNamedRange(created);
    }

    setIsEditorOpen(false);
  };

  const displayedRanges = namedRanges.filter((nr) => {
    if (filterScope === 'all') return true;
    if (filterScope === 'workbook') return nr.scope === 'workbook';
    return nr.scope === currentSheetId;
  });

  const getScopeLabel = (scope: NamedRangeScope): string => {
    if (scope === 'workbook') return 'Workbook';
    const foundSheet = sheets.find((s) => s.id === scope);
    return foundSheet ? foundSheet.name : 'Sheet';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Name Manager</h2>
                <p className="text-xs text-foreground-muted">
                  Create, edit, and navigate named cell ranges for formulas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="px-6 py-3 border-b border-border bg-surface flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted">Filter:</span>
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as typeof filterScope)}
                className="px-2.5 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all">All Scopes</option>
                <option value="workbook">Workbook-Scoped</option>
                <option value="sheet">This Sheet ({currentSheetName})</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New...</span>
            </button>
          </div>

          {/* Table List */}
          <div className="p-6 overflow-y-auto flex-1">
            {displayedRanges.length === 0 ? (
              <div className="text-center py-12 text-foreground-muted">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No named ranges defined.</p>
                <p className="text-xs text-foreground-muted/80 mt-1">
                  Click "New..." above to define your first named range for formulas like =SUM(Sales).
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-secondary/70 border-b border-border text-foreground-muted font-semibold">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Refers To</th>
                      <th className="p-2.5">Scope</th>
                      <th className="p-2.5">Comment</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedRanges.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-secondary/30 transition-colors">
                        <td className="p-2.5 font-semibold text-accent font-mono">
                          {item.name}
                        </td>
                        <td className="p-2.5 font-mono text-foreground">
                          {formatRangeReference(item.range)}
                        </td>
                        <td className="p-2.5 text-foreground-muted">
                          {getScopeLabel(item.scope)}
                        </td>
                        <td className="p-2.5 text-foreground-muted truncate max-w-[150px]">
                          {item.comment || '-'}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded text-foreground-muted hover:text-foreground transition-colors"
                              title="Edit Named Range"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteNamedRange(item.id)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-colors"
                              title="Delete Named Range"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-surface-secondary/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* New / Edit Named Range Sub-Dialog */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
              <h3 className="text-sm font-semibold text-foreground">
                {editingItem ? 'Edit Name' : 'New Name'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {validationError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="e.g. Sales, TaxRate"
                  className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-[10px] text-foreground-muted mt-1">
                  Must start with letter or underscore. No spaces or cell coordinates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Scope</label>
                <select
                  value={scopeInput}
                  onChange={(e) => setScopeInput(e.target.value as NamedRangeScope)}
                  className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="workbook">Workbook</option>
                  {sheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Refers to
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => {
                    setRangeInput(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="e.g. A1:B10"
                  className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Comment (Optional)
                </label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={2}
                  placeholder="Describe what this range represents..."
                  className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-surface-secondary/40">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-3 py-1.5 text-xs text-foreground hover:bg-surface-secondary border border-border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditor}
                className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs"
              >
                {editingItem ? 'Save Changes' : 'Create Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
