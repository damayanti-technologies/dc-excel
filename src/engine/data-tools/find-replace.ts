import { Sheet } from '@/types/sheet';
import { FindOptions, FindMatch } from '@/types/data-tools';
import { parseKey, coordToKey } from '@/utils/coordinates';

/**
 * Searches a single sheet for matching cells according to find options.
 */
export function findMatchesInSheet(sheet: Sheet, options: FindOptions): FindMatch[] {
  const { query, matchCase, matchEntireCell, searchFormulas } = options;
  if (!query) return [];

  const matches: FindMatch[] = [];
  const normalizedQuery = matchCase ? query : query.toLowerCase();

  for (const [key, cell] of Object.entries(sheet.cells || {})) {
    if (!cell) continue;
    const coord = parseKey(key);
    if (!coord) continue;

    let targetText = '';
    if (searchFormulas && cell.formula) {
      targetText = cell.formula;
    } else if (cell.value !== null && cell.value !== undefined) {
      targetText = String(cell.value);
    }

    if (!targetText) continue;

    const normalizedTarget = matchCase ? targetText : targetText.toLowerCase();

    let isMatch = false;
    if (matchEntireCell) {
      isMatch = normalizedTarget === normalizedQuery;
    } else {
      isMatch = normalizedTarget.includes(normalizedQuery);
    }

    if (isMatch) {
      matches.push({
        sheetId: sheet.id,
        sheetName: sheet.name,
        row: coord.row,
        col: coord.col,
        cellKey: key,
        cellValue: cell.value !== null && cell.value !== undefined ? String(cell.value) : '',
        formula: cell.formula
      });
    }
  }

  // Sort matches naturally by row then column
  matches.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  return matches;
}

/**
 * Searches across an entire workbook or active sheet.
 */
export function findMatches(
  sheets: Sheet[],
  activeSheetId: string,
  options: FindOptions
): FindMatch[] {
  if (options.scope === 'sheet') {
    const targetSheet = sheets.find((s) => s.id === activeSheetId);
    return targetSheet ? findMatchesInSheet(targetSheet, options) : [];
  }

  const allMatches: FindMatch[] = [];
  for (const sheet of sheets) {
    allMatches.push(...findMatchesInSheet(sheet, options));
  }
  return allMatches;
}

/**
 * Replaces text in a single matched cell.
 */
export function replaceMatchInSheet(
  sheet: Sheet,
  match: FindMatch,
  options: FindOptions
): { updatedSheet: Sheet; replaced: boolean } {
  const { query, replaceWith = '', matchCase, matchEntireCell, searchFormulas } = options;
  const key = coordToKey(match.row, match.col);
  const cell = sheet.cells[key];
  if (!cell) {
    return { updatedSheet: sheet, replaced: false };
  }

  const flags = matchCase ? 'g' : 'gi';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = matchEntireCell
    ? new RegExp(`^${escapedQuery}$`, flags)
    : new RegExp(escapedQuery, flags);

  let updatedCell = { ...cell };
  let replaced = false;

  if (searchFormulas && cell.formula) {
    const newFormula = cell.formula.replace(regex, replaceWith);
    if (newFormula !== cell.formula) {
      updatedCell.formula = newFormula;
      replaced = true;
    }
  } else if (cell.value !== null && cell.value !== undefined) {
    const strVal = String(cell.value);
    const newVal = strVal.replace(regex, replaceWith);
    if (newVal !== strVal) {
      // Coerce back to number if applicable
      const numVal = Number(newVal);
      updatedCell.value = !Number.isNaN(numVal) && newVal.trim() !== '' ? numVal : newVal;
      updatedCell.dataType = typeof updatedCell.value === 'number' ? 'number' : 'string';
      replaced = true;
    }
  }

  if (!replaced) {
    return { updatedSheet: sheet, replaced: false };
  }

  return {
    updatedSheet: {
      ...sheet,
      cells: {
        ...sheet.cells,
        [key]: updatedCell
      }
    },
    replaced: true
  };
}

/**
 * Executes Replace All across active sheet or workbook.
 */
export function replaceAllMatches(
  sheets: Sheet[],
  activeSheetId: string,
  options: FindOptions
): { updatedSheets: Sheet[]; replacementCount: number } {
  const matches = findMatches(sheets, activeSheetId, options);
  if (matches.length === 0) {
    return { updatedSheets: sheets, replacementCount: 0 };
  }

  let count = 0;
  const sheetMap = new Map(sheets.map((s) => [s.id, { ...s, cells: { ...s.cells } }]));

  for (const m of matches) {
    const sheet = sheetMap.get(m.sheetId);
    if (sheet) {
      const { updatedSheet, replaced } = replaceMatchInSheet(sheet, m, options);
      if (replaced) {
        sheetMap.set(m.sheetId, updatedSheet);
        count++;
      }
    }
  }

  return {
    updatedSheets: Array.from(sheetMap.values()),
    replacementCount: count
  };
}
