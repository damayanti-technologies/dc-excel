import React, { useState } from 'react';
import {
  X,
  Target,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { GoalSeekConfig, GoalSeekResult } from '@/types/analysis';
import { CellCoordinates } from '@/types/cell';
import { solveGoalSeek } from '@/engine/analysis/what-if';
import { a1ToCoord, coordToA1 } from '@/utils/coordinates';

interface GoalSeekDialogProps {
  isOpen: boolean;
  activeCell: CellCoordinates | null;
  onRunGoalSeek: (
    targetCoord: CellCoordinates,
    targetValue: number,
    variableCoord: CellCoordinates
  ) => { evaluateWithVariable: (x: number) => number; commitVariableValue: (x: number) => void };
  onClose: () => void;
}

export const GoalSeekDialog: React.FC<GoalSeekDialogProps> = ({
  isOpen,
  activeCell,
  onRunGoalSeek,
  onClose,
}) => {
  const [targetCellStr, setTargetCellStr] = useState(
    activeCell ? coordToA1(activeCell) : 'C1'
  );
  const [targetValStr, setTargetValStr] = useState('100');
  const [variableCellStr, setVariableCellStr] = useState('A1');

  const [isSolving, setIsSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<GoalSeekResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [committedCallback, setCommittedCallback] = useState<((val: number) => void) | null>(null);

  if (!isOpen) return null;

  const handleStartSolving = () => {
    setErrorMsg(null);
    setSolveResult(null);

    const targetCoord = a1ToCoord(targetCellStr);
    if (!targetCoord) {
      setErrorMsg('Invalid target cell coordinate (e.g. C1).');
      return;
    }

    const variableCoord = a1ToCoord(variableCellStr);
    if (!variableCoord) {
      setErrorMsg('Invalid changing cell coordinate (e.g. A1).');
      return;
    }

    const targetValue = parseFloat(targetValStr);
    if (isNaN(targetValue)) {
      setErrorMsg('Please enter a valid numeric target value.');
      return;
    }

    setIsSolving(true);

    try {
      const { evaluateWithVariable, commitVariableValue } = onRunGoalSeek(
        targetCoord,
        targetValue,
        variableCoord
      );

      const config: GoalSeekConfig = {
        targetCoord,
        targetValue,
        variableCoord,
        maxIterations: 100,
        tolerance: 0.001,
      };

      const result = solveGoalSeek(config, evaluateWithVariable);
      setSolveResult(result);
      setCommittedCallback(() => commitVariableValue);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error executing goal seek solver.');
    } finally {
      setIsSolving(false);
    }
  };

  const handleCommit = () => {
    if (solveResult && committedCallback) {
      committedCallback(solveResult.variableValue);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Goal Seek</h2>
              <p className="text-xs text-foreground-muted">
                Find the right input value to reach your target calculation result
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

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Set cell (Target formula cell):
            </label>
            <input
              type="text"
              value={targetCellStr}
              onChange={(e) => {
                setTargetCellStr(e.target.value.toUpperCase());
                setSolveResult(null);
              }}
              placeholder="e.g. C1"
              className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              To value (Desired outcome):
            </label>
            <input
              type="number"
              value={targetValStr}
              onChange={(e) => {
                setTargetValStr(e.target.value);
                setSolveResult(null);
              }}
              placeholder="e.g. 1000"
              className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              By changing cell (Variable cell):
            </label>
            <input
              type="text"
              value={variableCellStr}
              onChange={(e) => {
                setVariableCellStr(e.target.value.toUpperCase());
                setSolveResult(null);
              }}
              placeholder="e.g. A1"
              className="w-full px-3 py-2 text-xs font-mono bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Solver Feedback Display */}
          {solveResult && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                solveResult.converged
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {solveResult.converged ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Goal Seeking found a solution!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Goal Seek did not fully converge.</span>
                  </>
                )}
              </div>
              <div className="text-[11px] grid grid-cols-2 gap-1 pt-1 font-mono">
                <div>Target value: {targetValStr}</div>
                <div>Current value: {solveResult.finalTargetValue.toFixed(4)}</div>
                <div className="col-span-2 font-semibold">
                  New input value for {variableCellStr}: {solveResult.variableValue.toFixed(4)}
                </div>
                <div className="text-[10px] text-foreground-muted col-span-2">
                  Iterations: {solveResult.iterations}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-surface-secondary/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-foreground hover:bg-surface-secondary border border-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          {!solveResult ? (
            <button
              type="button"
              disabled={isSolving}
              onClick={handleStartSolving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSolving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Find Solution</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCommit}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              OK (Apply Value)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
