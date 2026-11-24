import { CellCoordinates, CellValue } from '../../types/cell';
import {
  GoalSeekConfig,
  GoalSeekResult,
  Scenario,
} from '../../types/analysis';
import { colIndexToName } from '../../utils/coordinates';

/**
 * Solves for a variable cell's value using Secant numerical method to reach a target cell's value.
 *
 * @param config Goal seek configuration (target coord, desired val, variable coord, maxIterations, tolerance)
 * @param evaluateWithVariable Callback function that sets variable cell to x, calculates, and returns target cell's evaluated value
 */
export function solveGoalSeek(
  config: GoalSeekConfig,
  evaluateWithVariable: (x: number) => number
): GoalSeekResult {
  const { targetValue, maxIterations = 100, tolerance = 0.0001 } = config;

  // Objective function: g(x) = f(x) - targetValue = 0
  const g = (x: number): number => {
    const val = evaluateWithVariable(x);
    return isNaN(val) ? 1e9 : val - targetValue;
  };

  // Initial guesses
  let x0 = 0;
  try {
    const initialVal = evaluateWithVariable(0);
    if (!isNaN(initialVal) && Math.abs(initialVal - targetValue) <= tolerance) {
      return {
        converged: true,
        variableValue: 0,
        finalTargetValue: initialVal,
        iterations: 1,
      };
    }
  } catch {
    x0 = 1;
  }

  let x1 = x0 !== 0 ? x0 * 1.2 : 1;
  let g0 = g(x0);
  let g1 = g(x1);

  if (Math.abs(g0) <= tolerance) {
    return {
      converged: true,
      variableValue: x0,
      finalTargetValue: g0 + targetValue,
      iterations: 1,
    };
  }

  if (Math.abs(g1) <= tolerance) {
    return {
      converged: true,
      variableValue: x1,
      finalTargetValue: g1 + targetValue,
      iterations: 2,
    };
  }

  let iterations = 2;
  while (iterations < maxIterations) {
    const denominator = g1 - g0;
    if (Math.abs(denominator) < 1e-12) {
      // Secant slope too flat, perturb slightly
      x1 = x1 + (Math.random() - 0.5) * 2;
      g1 = g(x1);
      iterations++;
      continue;
    }

    const xNext = x1 - (g1 * (x1 - x0)) / denominator;

    // Guard against runaway infinities
    if (isNaN(xNext) || !isFinite(xNext)) {
      return {
        converged: false,
        variableValue: x1,
        finalTargetValue: g1 + targetValue,
        iterations,
        error: 'Numerical solver encountered infinity or NaN.',
      };
    }

    const gNext = g(xNext);

    if (Math.abs(gNext) <= tolerance) {
      return {
        converged: true,
        variableValue: xNext,
        finalTargetValue: gNext + targetValue,
        iterations: iterations + 1,
      };
    }

    x0 = x1;
    g0 = g1;
    x1 = xNext;
    g1 = gNext;

    iterations++;
  }

  return {
    converged: Math.abs(g1) <= tolerance,
    variableValue: x1,
    finalTargetValue: g1 + targetValue,
    iterations,
    error: Math.abs(g1) > tolerance ? 'Goal seek did not converge within the maximum iterations.' : undefined,
  };
}

/**
 * Summary table representation of scenarios
 */
export interface ScenarioSummaryRow {
  label: string;
  isResultCell?: boolean;
  values: Record<string, CellValue>; // scenarioId -> value
}

export interface ScenarioSummaryTable {
  scenarioNames: { id: string; name: string }[];
  changingRows: ScenarioSummaryRow[];
  resultRows: ScenarioSummaryRow[];
}

/**
 * Generates side-by-side scenario comparison table
 */
export function generateScenarioSummary(
  scenarios: Scenario[],
  resultCellCoords: CellCoordinates[],
  computeResultsForScenario: (scenario: Scenario) => Record<string, CellValue>
): ScenarioSummaryTable {
  const scenarioNames = scenarios.map((s) => ({ id: s.id, name: s.name }));

  // Collect all unique changing cells
  const changingCoordMap = new Map<string, CellCoordinates>();
  for (const s of scenarios) {
    for (const v of s.variables) {
      const key = `${v.coord.row},${v.coord.col}`;
      if (!changingCoordMap.has(key)) {
        changingCoordMap.set(key, v.coord);
      }
    }
  }

  const changingRows: ScenarioSummaryRow[] = [];
  for (const coord of changingCoordMap.values()) {
    const colName = colIndexToName(coord.col);
    const rowLabel = `${colName}${coord.row + 1}`;
    const values: Record<string, CellValue> = {};

    for (const s of scenarios) {
      const variable = s.variables.find(
        (v) => v.coord.row === coord.row && v.coord.col === coord.col
      );
      values[s.id] = variable ? variable.value : '-';
    }

    changingRows.push({
      label: rowLabel,
      isResultCell: false,
      values,
    });
  }

  // Calculate result cells for each scenario
  const scenarioResults: Record<string, Record<string, CellValue>> = {};
  for (const s of scenarios) {
    scenarioResults[s.id] = computeResultsForScenario(s);
  }

  const resultRows: ScenarioSummaryRow[] = [];
  for (const coord of resultCellCoords) {
    const colName = colIndexToName(coord.col);
    const rowLabel = `${colName}${coord.row + 1}`;
    const coordKey = `${coord.row},${coord.col}`;
    const values: Record<string, CellValue> = {};

    for (const s of scenarios) {
      values[s.id] = scenarioResults[s.id]?.[coordKey] ?? '-';
    }

    resultRows.push({
      label: rowLabel,
      isResultCell: true,
      values,
    });
  }

  return {
    scenarioNames,
    changingRows,
    resultRows,
  };
}
