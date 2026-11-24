import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Play,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Scenario, ScenarioVariable } from '@/types/analysis';
import { CellValue } from '@/types/cell';
import { a1ToCoord, coordToA1 } from '@/utils/coordinates';
import { generateScenarioSummary, ScenarioSummaryTable } from '@/engine/analysis/what-if';

interface ScenarioManagerDialogProps {
  isOpen: boolean;
  scenarios: Scenario[];
  onAddScenario: (scenario: Scenario) => void;
  onUpdateScenario: (scenario: Scenario) => void;
  onDeleteScenario: (id: string) => void;
  onApplyScenario: (scenario: Scenario) => void;
  onComputeScenarioResults?: (scenario: Scenario) => Record<string, CellValue>;
  onClose: () => void;
}

export const ScenarioManagerDialog: React.FC<ScenarioManagerDialogProps> = ({
  isOpen,
  scenarios,
  onAddScenario,
  onUpdateScenario,
  onDeleteScenario,
  onApplyScenario,
  onComputeScenarioResults,
  onClose,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    scenarios.length > 0 ? scenarios[0]!.id : null
  );

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  // Editor form state
  const [nameInput, setNameInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [variablesInput, setVariablesInput] = useState<{ coordStr: string; valStr: string }[]>([
    { coordStr: 'A1', valStr: '100' },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Summary View state
  const [summaryTable, setSummaryTable] = useState<ScenarioSummaryTable | null>(null);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    setEditingScenario(null);
    setNameInput('');
    setCommentInput('');
    setVariablesInput([{ coordStr: 'A1', valStr: '100' }]);
    setErrorMsg(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setNameInput(scenario.name);
    setCommentInput(scenario.comment || '');
    setVariablesInput(
      scenario.variables.map((v) => ({
        coordStr: coordToA1(v.coord),
        valStr: String(v.value ?? ''),
      }))
    );
    setErrorMsg(null);
    setIsEditorOpen(true);
  };

  const handleAddVariableRow = () => {
    setVariablesInput([...variablesInput, { coordStr: '', valStr: '' }]);
  };

  const handleRemoveVariableRow = (index: number) => {
    setVariablesInput(variablesInput.filter((_, i) => i !== index));
  };

  const handleSaveEditor = () => {
    if (!nameInput.trim()) {
      setErrorMsg('Please enter a scenario name.');
      return;
    }

    const variables: ScenarioVariable[] = [];
    for (const item of variablesInput) {
      if (!item.coordStr.trim()) continue;
      const coord = a1ToCoord(item.coordStr);
      if (!coord) {
        setErrorMsg(`Invalid cell reference "${item.coordStr}". Use format like A1.`);
        return;
      }
      const numVal = parseFloat(item.valStr);
      variables.push({
        coord,
        value: !isNaN(numVal) ? numVal : item.valStr,
      });
    }

    if (variables.length === 0) {
      setErrorMsg('Please specify at least one changing cell.');
      return;
    }

    if (editingScenario) {
      const updated: Scenario = {
        ...editingScenario,
        name: nameInput.trim(),
        comment: commentInput.trim() || undefined,
        variables,
      };
      onUpdateScenario(updated);
    } else {
      const created: Scenario = {
        id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: nameInput.trim(),
        comment: commentInput.trim() || undefined,
        variables,
      };
      onAddScenario(created);
      setSelectedScenarioId(created.id);
    }

    setIsEditorOpen(false);
  };

  const handleShowScenario = () => {
    const sc = scenarios.find((s) => s.id === selectedScenarioId);
    if (sc) {
      onApplyScenario(sc);
    }
  };

  const handleGenerateSummary = () => {
    if (!onComputeScenarioResults) return;
    const summary = generateScenarioSummary(
      scenarios,
      [],
      onComputeScenarioResults
    );
    setSummaryTable(summary);
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Scenario Manager</h2>
                <p className="text-xs text-foreground-muted">
                  Create, compare, and switch between what-if input models
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

          {/* Main Layout: List & Details */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto flex-1">
            {/* Scenarios List */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground mb-2">
                Scenarios ({scenarios.length}):
              </span>
              <div className="flex-1 min-h-[180px] border border-border rounded-lg bg-surface-secondary/20 p-2 space-y-1 overflow-y-auto">
                {scenarios.length === 0 ? (
                  <div className="text-center py-8 text-foreground-muted text-xs">
                    No scenarios defined. Click "Add..." below.
                  </div>
                ) : (
                  scenarios.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${
                        selectedScenarioId === sc.id
                          ? 'bg-accent/15 border border-accent/40 text-accent font-semibold'
                          : 'hover:bg-surface-secondary text-foreground'
                      }`}
                    >
                      <span>{sc.name}</span>
                      <span className="text-[10px] text-foreground-muted">
                        {sc.variables.length} vars
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Action buttons under list */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleOpenNew}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add...</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedScenario}
                  onClick={() => selectedScenario && handleOpenEdit(selectedScenario)}
                  className="px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors disabled:opacity-40"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!selectedScenario}
                  onClick={() => selectedScenario && onDeleteScenario(selectedScenario.id)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 border border-border rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Selected Scenario Preview */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground mb-2">
                Scenario Details:
              </span>
              <div className="flex-1 min-h-[180px] border border-border rounded-lg bg-surface-secondary/20 p-3 flex flex-col justify-between">
                {selectedScenario ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-foreground">{selectedScenario.name}</div>
                      <div className="text-[11px] text-foreground-muted mt-0.5">
                        {selectedScenario.comment || 'No comments'}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-foreground-muted block mb-1">
                        Changing Cells:
                      </span>
                      <div className="space-y-1">
                        {selectedScenario.variables.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-2 py-1 bg-surface border border-border rounded text-xs font-mono"
                          >
                            <span className="text-foreground-muted">{coordToA1(v.coord)}:</span>
                            <span className="font-semibold text-foreground">{String(v.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-foreground-muted text-xs">
                    Select a scenario to view its variable inputs.
                  </div>
                )}

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    disabled={!selectedScenario}
                    onClick={handleShowScenario}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-40"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Apply Scenario</span>
                  </button>

                  {onComputeScenarioResults && scenarios.length > 0 && (
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Summary</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
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

      {/* Editor Sub-Dialog */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
              <h3 className="text-sm font-semibold text-foreground">
                {editingScenario ? 'Edit Scenario' : 'Add Scenario'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Best Case, Worst Case"
                  className="w-full px-3 py-2 text-xs bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Changing Cells & Values:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariableRow}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Cell</span>
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {variablesInput.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.coordStr}
                        onChange={(e) => {
                          const updated = [...variablesInput];
                          updated[idx]!.coordStr = e.target.value.toUpperCase();
                          setVariablesInput(updated);
                        }}
                        placeholder="Cell (A1)"
                        className="w-24 px-2.5 py-1.5 text-xs font-mono bg-surface-secondary border border-border rounded-lg"
                      />
                      <input
                        type="text"
                        value={item.valStr}
                        onChange={(e) => {
                          const updated = [...variablesInput];
                          updated[idx]!.valStr = e.target.value;
                          setVariablesInput(updated);
                        }}
                        placeholder="Value"
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-surface-secondary border border-border rounded-lg"
                      />
                      {variablesInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariableRow(idx)}
                          className="p-1.5 text-foreground-muted hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Comment (Optional)
                </label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={2}
                  placeholder="Notes about assumptions for this scenario..."
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
                Save Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary View Modal */}
      {summaryTable && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
              <h3 className="text-sm font-semibold text-foreground">
                Scenario Summary Comparison
              </h3>
              <button
                onClick={() => setSummaryTable(null)}
                className="p-1 rounded text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <table className="w-full text-xs text-left border-collapse border border-border">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="p-2 border border-border">Changing Cells</th>
                    {summaryTable.scenarioNames.map((s) => (
                      <th key={s.id} className="p-2 border border-border font-bold">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryTable.changingRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-secondary/40">
                      <td className="p-2 border border-border font-mono font-medium">
                        {row.label}
                      </td>
                      {summaryTable.scenarioNames.map((s) => (
                        <td key={s.id} className="p-2 border border-border font-mono text-right">
                          {String(row.values[s.id] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-border bg-surface-secondary/40">
              <button
                type="button"
                onClick={() => setSummaryTable(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
