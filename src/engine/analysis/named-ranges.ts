import { CellCoordinates, CellRange } from '../../types/cell';
import { NamedRange } from '../../types/analysis';
import { nameToColIndex, colIndexToName } from '../../utils/coordinates';

/**
 * Validates a candidate name for a Named Range.
 * Excel/Sheets rules:
 * - Must start with a letter or underscore (_).
 * - Remaining characters can be letters, digits, underscores, and periods (.).
 * - Cannot look like a cell reference (e.g. A1, XFD1048576, R1C1).
 * - Cannot be TRUE or FALSE.
 * - Must be at least 1 character and no more than 255 characters.
 * - Cannot duplicate an existing name within the same scope.
 */
export function validateRangeName(
  name: string,
  existingNames: string[] = []
): { isValid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Name cannot be empty.' };
  }

  if (trimmed.length > 255) {
    return { isValid: false, error: 'Name cannot exceed 255 characters.' };
  }

  // Must begin with a letter or underscore
  if (!/^[a-zA-Z_]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name must start with a letter or underscore (_).',
    };
  }

  // Allowed characters: letters, numbers, underscores, periods
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name can only contain letters, numbers, underscores, and periods.',
    };
  }

  // Cannot be TRUE or FALSE
  const upper = trimmed.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE') {
    return {
      isValid: false,
      error: 'Name cannot be a boolean keyword (TRUE or FALSE).',
    };
  }

  // Cannot match standard cell coordinate pattern (e.g. A1, AA100, etc.)
  if (/^[A-Za-z]{1,3}\d+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name conflicts with a standard cell reference (e.g. A1).',
    };
  }

  // Cannot match R1C1 format
  if (/^[Rr]\d+[Cc]\d+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name conflicts with an R1C1 reference.',
    };
  }

  // Check uniqueness (case-insensitive)
  const isDuplicate = existingNames.some(
    (existing) => existing.toLowerCase() === trimmed.toLowerCase()
  );

  if (isDuplicate) {
    return {
      isValid: false,
      error: `The name "${trimmed}" is already in use in this scope.`,
    };
  }

  return { isValid: true };
}

/**
 * Resolves a named range with scope hierarchy:
 * 1. Sheet-scoped named range matching the current sheet ID has highest priority.
 * 2. Workbook-scoped named range is used if no sheet-scoped match exists.
 */
export function resolveNamedRange(
  name: string,
  currentSheetId: string,
  allNamedRanges: NamedRange[]
): NamedRange | undefined {
  const targetName = name.trim().toLowerCase();

  // 1. Look for sheet-specific scope first
  const sheetScoped = allNamedRanges.find(
    (nr) =>
      nr.name.toLowerCase() === targetName &&
      nr.scope === currentSheetId &&
      nr.sheetId === currentSheetId
  );
  if (sheetScoped) return sheetScoped;

  // 2. Look for workbook scope
  const workbookScoped = allNamedRanges.find(
    (nr) => nr.name.toLowerCase() === targetName && nr.scope === 'workbook'
  );
  if (workbookScoped) return workbookScoped;

  // 3. Fallback: match any named range by name
  return allNamedRanges.find((nr) => nr.name.toLowerCase() === targetName);
}

/**
 * Formats a CellRange into a string reference, e.g. "A1:B10" or "A1"
 */
export function formatRangeReference(range: CellRange): string {
  const startCol = colIndexToName(range.startCol);
  const startRow = range.startRow + 1;
  const endCol = colIndexToName(range.endCol);
  const endRow = range.endRow + 1;

  if (range.startRow === range.endRow && range.startCol === range.endCol) {
    return `${startCol}${startRow}`;
  }
  return `${startCol}${startRow}:${endCol}${endRow}`;
}

/**
 * Parses a string reference like "A1:B10" or "A1" into a CellRange
 */
export function parseRangeReference(ref: string): CellRange | null {
  const trimmed = ref.trim().toUpperCase();
  const parts = trimmed.split(':');

  const parseCoord = (coordStr: string): CellCoordinates | null => {
    const match = coordStr.match(/^([A-Z]+)(\d+)$/);
    if (!match || !match[1] || !match[2]) return null;
    const col = nameToColIndex(match[1]);
    const row = parseInt(match[2], 10) - 1;
    if (row < 0 || col < 0) return null;
    return { row, col };
  };

  if (parts.length === 1 && parts[0]) {
    const coord = parseCoord(parts[0]);
    if (!coord) return null;
    return {
      startRow: coord.row,
      startCol: coord.col,
      endRow: coord.row,
      endCol: coord.col,
    };
  } else if (parts.length === 2 && parts[0] && parts[1]) {
    const start = parseCoord(parts[0]);
    const end = parseCoord(parts[1]);
    if (!start || !end) return null;
    return {
      startRow: Math.min(start.row, end.row),
      startCol: Math.min(start.col, end.col),
      endRow: Math.max(start.row, end.row),
      endCol: Math.max(start.col, end.col),
    };
  }

  return null;
}

/**
 * Expands a NamedRange into all constituent cell coordinate keys ("row,col")
 */
export function expandNamedRangeCoordinates(range: CellRange): CellCoordinates[] {
  const coords: CellCoordinates[] = [];
  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      coords.push({ row: r, col: c });
    }
  }

  return coords;
}
