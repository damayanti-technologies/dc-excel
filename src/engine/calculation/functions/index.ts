import { functionRegistry, FunctionRegistry } from './registry';
import { lookupFunctions } from './lookup';
import { textFunctions } from './text';
import { datetimeFunctions } from './datetime';
import { mathFunctions } from './math';
import { statisticalFunctions } from './statistical';
import { logicalFunctions } from './logical';
import { informationFunctions } from './information';
import { FormulaFunctionHandler } from '../types';

// Register all function categories
const allFunctions = [
  ...lookupFunctions,
  ...textFunctions,
  ...datetimeFunctions,
  ...mathFunctions,
  ...statisticalFunctions,
  ...logicalFunctions,
  ...informationFunctions
];

for (const fn of allFunctions) {
  functionRegistry.register(fn);
}

// Built-in record map for backward compatibility
export const builtinFunctions: Record<string, FormulaFunctionHandler> = {};
for (const fn of allFunctions) {
  builtinFunctions[fn.name] = fn.handler;
}

export {
  functionRegistry,
  FunctionRegistry,
  lookupFunctions,
  textFunctions,
  datetimeFunctions,
  mathFunctions,
  statisticalFunctions,
  logicalFunctions,
  informationFunctions
};
