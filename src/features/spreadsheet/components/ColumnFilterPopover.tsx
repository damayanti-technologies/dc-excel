import React, { useState, useMemo } from 'react';
import {
  ArrowDownAZ,
  ArrowUpZA,
  Search,
  FilterX,
  X,
  Check
} from 'lucide-react';
import { Sheet, CellRange } from '@/types/sheet';
import { ColumnFilter, FilterConditionType } from '@/types/data-tools';
import { getDistinctColumnValues } from '@/engine/data-tools/filtering';
import { colIndexToName } from '@/utils/coordinates';

interface ColumnFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  col: number;
  sheet: Sheet;
  range: CellRange;
  currentFilter?: ColumnFilter;
  onApplyFilter: (col: number, filter: ColumnFilter | null) => void;
  onQuickSort?: (direction: 'asc' | 'desc') => void;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  isOpen,
  onClose,
  col,
  sheet,
  range,
  currentFilter,
  onApplyFilter,
  onQuickSort
}) => {
  // Extract distinct string values from column data
  const distinctStrings = useMemo(() => {
    return getDistinctColumnValues(sheet.cells, range, col, true);
  }, [sheet.cells, range, col]);

  const [selectedValues, setSelectedValues] = useState<Set<string>>(() => {
    if (currentFilter?.selectedValues && currentFilter.selectedValues.length > 0) {
      return new Set(currentFilter.selectedValues);
    }
    return new Set(distinctStrings);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [conditionType, setConditionType] = useState<FilterConditionType | 'none'>(
    currentFilter?.condition?.type || 'none'
  );
  const [conditionVal1, setConditionVal1] = useState(
    currentFilter?.condition?.val1 != null ? String(currentFilter.condition.val1) : ''
  );

  if (!isOpen) return null;

  const filteredItems = distinctStrings.filter((val) => {
    if (!searchQuery) return true;
    const label = val === '' ? '(Blanks)' : val;
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleToggleValue = (val: string) => {
    const next = new Set(selectedValues);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setSelectedValues(next);
  };

  const handleSelectAll = () => {
    setSelectedValues(new Set(distinctStrings));
  };

  const handleClearAll = () => {
    setSelectedValues(new Set());
  };

  const handleApply = () => {
    const hasCondition = conditionType !== 'none';
    const isValuesFiltered = selectedValues.size < distinctStrings.length;

    if (!hasCondition && !isValuesFiltered) {
      // No filter active on this column
      onApplyFilter(col, null);
    } else {
      const filter: ColumnFilter = {
        col,
        selectedValues: isValuesFiltered ? Array.from(selectedValues) : undefined,
        condition: hasCondition
          ? {
              type: conditionType,
              val1: conditionVal1
            }
          : undefined
      };
      onApplyFilter(col, filter);
    }
    onClose();
  };

  const handleClearColumnFilter = () => {
    onApplyFilter(col, null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center sm:items-start sm:justify-start bg-black/40 backdrop-blur-2xs p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-72 sm:w-80 bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-foreground sm:mt-16 sm:ml-20 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Filter Column ${colIndexToName(col)}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-surface-secondary/40">
          <span className="font-semibold text-foreground">
            Filter: Column {colIndexToName(col)}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Sort Actions */}
        {onQuickSort && (
          <div className="p-2 border-b border-border flex flex-col gap-0.5 bg-background">
            <button
              onClick={() => {
                onQuickSort('asc');
                onClose();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-secondary text-left transition-colors"
            >
              <ArrowDownAZ className="w-3.5 h-3.5 text-primary" />
              <span>Sort A to Z (Ascending)</span>
            </button>
            <button
              onClick={() => {
                onQuickSort('desc');
                onClose();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-secondary text-left transition-colors"
            >
              <ArrowUpZA className="w-3.5 h-3.5 text-primary" />
              <span>Sort Z to A (Descending)</span>
            </button>
          </div>
        )}

        {/* Filter by Condition */}
        <div className="p-3 border-b border-border bg-surface-secondary/20 flex flex-col gap-2">
          <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Filter by Condition
          </span>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value as FilterConditionType | 'none')}
            className="w-full h-7 px-2 rounded border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
          >
            <option value="none">None</option>
            <option value="is_blank">Is Empty / Blank</option>
            <option value="is_not_blank">Is Not Empty</option>
            <option value="contains">Text Contains</option>
            <option value="not_contains">Does Not Contain</option>
            <option value="begins_with">Text Starts With</option>
            <option value="ends_with">Text Ends With</option>
            <option value="equals">Equals</option>
            <option value="not_equals">Does Not Equal</option>
            <option value="greater_than">Greater Than (&gt;)</option>
            <option value="less_than">Less Than (&lt;)</option>
            <option value="greater_or_equal">Greater or Equal (&ge;)</option>
            <option value="less_or_equal">Less or Equal (&le;)</option>
          </select>

          {conditionType !== 'none' && conditionType !== 'is_blank' && conditionType !== 'is_not_blank' && (
            <input
              type="text"
              value={conditionVal1}
              onChange={(e) => setConditionVal1(e.target.value)}
              placeholder="Value to match..."
              className="w-full h-7 px-2 rounded border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
            />
          )}
        </div>

        {/* Filter by Values (Distinct Checklist) */}
        <div className="p-3 flex flex-col gap-2 flex-1 min-h-0 bg-background">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
              Filter by Values
            </span>
            <div className="flex items-center gap-2 text-[11px] text-primary">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:underline font-medium"
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:underline font-medium"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search values */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search values..."
              className="w-full h-7 pl-7 pr-2 rounded border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
            />
          </div>

          {/* Value Checklist */}
          <div className="h-36 overflow-y-auto border border-border rounded p-1 space-y-0.5">
            {filteredItems.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-[11px]">
                No matching values
              </div>
            ) : (
              filteredItems.map((val, idx) => {
                const isChecked = selectedValues.has(val);
                const displayVal = val === '' ? '(Blanks)' : val;

                return (
                  <label
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-surface-secondary cursor-pointer select-none text-xs"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleValue(val)}
                        className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span className={val === '' ? 'italic text-muted-foreground' : 'text-foreground'}>
                        {displayVal}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-border bg-surface-secondary/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClearColumnFilter}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-muted-foreground hover:text-destructive text-xs transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
