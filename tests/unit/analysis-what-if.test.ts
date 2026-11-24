import { describe, it, expect } from 'vitest';
import {
  solveGoalSeek,
  generateScenarioSummary,
} from '../../src/engine/analysis/what-if';
import { Scenario } from '../../src/types/analysis';

describe('What-If Analysis Engine', () => {
  describe('solveGoalSeek', () => {
    it('solves a linear formula relationship accurately', () => {
      // Formula: f(x) = 2 * x + 50
      // Target: 250 -> expected x = 100
      const config = {
        targetCoord: { row: 1, col: 0 },
        targetValue: 250,
        variableCoord: { row: 0, col: 0 },
        maxIterations: 50,
        tolerance: 0.001,
      };

      const result = solveGoalSeek(config, (x) => 2 * x + 50);

      expect(result.converged).toBe(true);
      expect(result.variableValue).toBeCloseTo(100, 2);
      expect(result.finalTargetValue).toBeCloseTo(250, 2);
    });

    it('solves a non-linear formula relationship accurately', () => {
      // Formula: f(x) = x^2
      // Target: 144 -> expected x = 12
      const config = {
        targetCoord: { row: 1, col: 0 },
        targetValue: 144,
        variableCoord: { row: 0, col: 0 },
        maxIterations: 100,
        tolerance: 0.001,
      };

      const result = solveGoalSeek(config, (x) => x * x);

      expect(result.converged).toBe(true);
      expect(Math.abs(result.variableValue)).toBeCloseTo(12, 1);
      expect(result.finalTargetValue).toBeCloseTo(144, 2);
    });
  });

  describe('generateScenarioSummary', () => {
    it('generates side-by-side scenario comparison table', () => {
      const scenarios: Scenario[] = [
        {
          id: 'sc-1',
          name: 'Conservative',
          variables: [
            { coord: { row: 0, col: 0 }, value: 100 }, // Price
            { coord: { row: 1, col: 0 }, value: 50 },  // Units
          ],
        },
        {
          id: 'sc-2',
          name: 'Optimistic',
          variables: [
            { coord: { row: 0, col: 0 }, value: 120 },
            { coord: { row: 1, col: 0 }, value: 80 },
          ],
        },
      ];

      const resultCoords = [{ row: 2, col: 0 }]; // Revenue = Price * Units

      const computeResults = (sc: Scenario) => {
        const price = Number(sc.variables.find((v) => v.coord.row === 0)?.value || 0);
        const units = Number(sc.variables.find((v) => v.coord.row === 1)?.value || 0);
        return {
          '2,0': price * units,
        };
      };

      const summary = generateScenarioSummary(scenarios, resultCoords, computeResults);

      expect(summary.scenarioNames).toHaveLength(2);
      expect(summary.changingRows).toHaveLength(2); // A1 and A2
      expect(summary.resultRows).toHaveLength(1);   // A3

      expect(summary.resultRows[0]?.values['sc-1']).toBe(5000);
      expect(summary.resultRows[0]?.values['sc-2']).toBe(9600);
    });
  });
});
