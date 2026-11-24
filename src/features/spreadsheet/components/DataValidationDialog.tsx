import React, { useState } from 'react';
import { CheckSquare, X, AlertTriangle, Info, Ban } from 'lucide-react';
import { CellRange } from '@/types/sheet';
import {
  DataValidationRule,
  ValidationType,
  ValidationOperator
} from '@/types/data-tools';
import { formatRangeLabel } from '@/engine/grid/selection';

interface DataValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  range: CellRange;
  existingRule?: DataValidationRule;
  onApplyRule: (rule: DataValidationRule) => void;
  onClearRule: () => void;
}

export const DataValidationDialog: React.FC<DataValidationDialogProps> = ({
  isOpen,
  onClose,
  range,
  existingRule,
  onApplyRule,
  onClearRule
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'error'>('settings');

  // Settings
  const [validationType, setValidationType] = useState<ValidationType>(
    existingRule?.type || 'whole_number'
  );
  const [operator, setOperator] = useState<ValidationOperator>(
    existingRule?.operator || 'between'
  );
  const [val1, setVal1] = useState(existingRule?.val1 || '1');
  const [val2, setVal2] = useState(existingRule?.val2 || '100');
  const [listText, setListText] = useState(
    existingRule?.listValues ? existingRule.listValues.join(', ') : 'Option 1, Option 2, Option 3'
  );
  const [allowBlank, setAllowBlank] = useState(existingRule?.allowBlank ?? true);
  const [showDropdown, setShowDropdown] = useState(existingRule?.showDropdown ?? true);

  // Error Alert
  const [errorStyle, setErrorStyle] = useState<'stop' | 'warning' | 'info'>(
    existingRule?.errorStyle || 'stop'
  );
  const [errorTitle, setErrorTitle] = useState(
    existingRule?.errorTitle || 'Invalid Entry'
  );
  const [errorMessage, setErrorMessage] = useState(
    existingRule?.errorMessage || 'The value you entered does not match the validation criteria for this cell.'
  );

  if (!isOpen) return null;

  const isBetween = operator === 'between' || operator === 'not_between';
  const showOperator = validationType !== 'list';

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    let listValues: string[] | undefined = undefined;
    if (validationType === 'list') {
      listValues = listText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const rule: DataValidationRule = {
      id: existingRule?.id || `val_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      range,
      type: validationType,
      operator: showOperator ? operator : undefined,
      val1: validationType !== 'list' ? val1 : undefined,
      val2: showOperator && isBetween ? val2 : undefined,
      listValues,
      allowBlank,
      showDropdown: validationType === 'list' ? showDropdown : false,
      errorTitle,
      errorMessage,
      errorStyle
    };

    onApplyRule(rule);
    onClose();
  };

  const handleClear = () => {
    onClearRule();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <h2 id="validation-dialog-title" className="text-sm font-semibold text-foreground">
              Data Validation
            </h2>
            <span className="text-xs text-muted-foreground ml-1">
              ({formatRangeLabel(range)})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border px-4 pt-2 bg-surface-secondary/20 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Validation Criteria
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('error')}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'error'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Error Alert
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-5 flex flex-col gap-4">
          {activeTab === 'settings' ? (
            <div className="flex flex-col gap-3.5">
              {/* Allow criteria */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Allow:
                </label>
                <select
                  value={validationType}
                  onChange={(e) => setValidationType(e.target.value as ValidationType)}
                  className="w-full h-8 px-2.5 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                >
                  <option value="whole_number">Whole Number</option>
                  <option value="decimal">Decimal</option>
                  <option value="list">List (Dropdown)</option>
                  <option value="date">Date</option>
                  <option value="text_length">Text Length</option>
                  <option value="custom">Custom Formula</option>
                </select>
              </div>

              {/* List items input */}
              {validationType === 'list' ? (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Source list (comma-separated):
                  </label>
                  <textarea
                    rows={3}
                    value={listText}
                    onChange={(e) => setListText(e.target.value)}
                    placeholder="e.g. High, Medium, Low"
                    className="w-full p-2 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                  />
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={showDropdown}
                      onChange={(e) => setShowDropdown(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    <span>Show in-cell dropdown arrow</span>
                  </label>
                </div>
              ) : (
                <>
                  {/* Operator */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Data:
                    </label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as ValidationOperator)}
                      className="w-full h-8 px-2.5 rounded-md border border-border bg-surface text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                    >
                      <option value="between">between</option>
                      <option value="not_between">not between</option>
                      <option value="equal">equal to</option>
                      <option value="not_equal">not equal to</option>
                      <option value="greater_than">greater than</option>
                      <option value="less_than">less than</option>
                      <option value="greater_or_equal">greater than or equal to</option>
                      <option value="less_or_equal">less than or equal to</option>
                    </select>
                  </div>

                  {/* Value inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        {isBetween ? 'Minimum:' : 'Value:'}
                      </label>
                      <input
                        type={validationType === 'date' ? 'date' : 'text'}
                        value={val1}
                        onChange={(e) => setVal1(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                      />
                    </div>
                    {isBetween && (
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Maximum:
                        </label>
                        <input
                          type={validationType === 'date' ? 'date' : 'text'}
                          value={val2}
                          onChange={(e) => setVal2(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Ignore blank checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs pt-1">
                <input
                  type="checkbox"
                  checked={allowBlank}
                  onChange={(e) => setAllowBlank(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>Ignore blank cells</span>
              </label>
            </div>
          ) : (
            /* Error Alert Tab */
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Style:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setErrorStyle('stop')}
                    className={`flex items-center gap-1.5 p-2 rounded-md border text-xs font-medium transition-colors ${
                      errorStyle === 'stop'
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border bg-surface text-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrorStyle('warning')}
                    className={`flex items-center gap-1.5 p-2 rounded-md border text-xs font-medium transition-colors ${
                      errorStyle === 'warning'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-border bg-surface text-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Warning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrorStyle('info')}
                    className={`flex items-center gap-1.5 p-2 rounded-md border text-xs font-medium transition-colors ${
                      errorStyle === 'info'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Information</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  value={errorTitle}
                  onChange={(e) => setErrorTitle(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Error message:
                </label>
                <textarea
                  rows={3}
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  className="w-full p-2 rounded-md border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-destructive text-xs font-medium transition-colors"
            >
              Clear All
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-border bg-surface text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
