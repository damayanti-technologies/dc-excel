import { Sheet, SheetMetadata, SparseCellMap } from '@/types/sheet';
import { CellRange } from '@/types/cell';

export interface SheetNameValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName: string;
}

/**
 * Validates a candidate worksheet name against standard spreadsheet constraints.
 * 1. Must not be empty or whitespace only.
 * 2. Maximum length of 31 characters (Excel compatibility).
 * 3. Cannot contain forbidden characters: \ / ? * : [ ]
 * 4. Cannot match an existing sheet name in the same workbook (case-insensitive).
 */
export function validateSheetName(
  candidateName: string,
  existingSheets: Array<{ id: string; name: string }>,
  currentSheetId?: string
): SheetNameValidationResult {
  const trimmed = candidateName.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Worksheet name cannot be empty.',
      sanitizedName: trimmed
    };
  }

  if (trimmed.length > 31) {
    return {
      isValid: false,
      error: 'Worksheet name cannot exceed 31 characters.',
      sanitizedName: trimmed
    };
  }

  // Forbidden characters in standard spreadsheets: \ / ? * : [ ]
  const forbiddenRegex = /[\\/?*:[\]]/;
  if (forbiddenRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Worksheet name cannot contain \\ / ? * : [ or ].',
      sanitizedName: trimmed
    };
  }

  // Check for duplicate names (case-insensitive)
  const isDuplicate = existingSheets.some(
    (s) => s.id !== currentSheetId && s.name.trim().toLowerCase() === trimmed.toLowerCase()
  );

  if (isDuplicate) {
    return {
      isValid: false,
      error: `A worksheet named "${trimmed}" already exists.`,
      sanitizedName: trimmed
    };
  }

  return {
    isValid: true,
    sanitizedName: trimmed
  };
}

/**
 * Generates an automatic, conflict-free default sheet name (e.g. "Sheet1", "Sheet2").
 * Guarantees that the generated name does not collide with any existing sheet in the workbook.
 */
export function generateUniqueSheetName(
  existingSheets: Array<{ name: string }>,
  basePrefix = 'Sheet'
): string {
  const existingNamesLower = new Set(
    existingSheets.map((s) => s.name.trim().toLowerCase())
  );

  let counter = 1;
  while (counter < 10000) {
    const candidate = `${basePrefix}${counter}`;
    if (!existingNamesLower.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }

  return `${basePrefix}_${Date.now()}`;
}

/**
 * Generates a unique duplicate sheet name (e.g. "Sales (Copy)", "Sales (Copy 2)").
 */
export function generateDuplicateSheetName(
  originalName: string,
  existingSheets: Array<{ name: string }>
): string {
  const existingNamesLower = new Set(
    existingSheets.map((s) => s.name.trim().toLowerCase())
  );

  const trimmedOrig = originalName.trim();
  // Strip existing copy pattern if present, e.g. "Data (Copy)" or "Data (Copy 2)"
  const copyPatternMatch = trimmedOrig.match(/^(.*?)\s*\(Copy(?:\s+(\d+))?\)$/i);
  const baseName = copyPatternMatch && copyPatternMatch[1] ? copyPatternMatch[1].trim() : trimmedOrig;

  // Try "Base (Copy)"
  const firstCandidate = `${baseName} (Copy)`.slice(0, 31);
  if (!existingNamesLower.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }

  // Try "Base (Copy 2)", "Base (Copy 3)", etc.
  let counter = 2;
  while (counter < 1000) {
    const candidate = `${baseName} (Copy ${counter})`.slice(0, 31);
    if (!existingNamesLower.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }

  return `${baseName.slice(0, 20)}_${Date.now()}`;
}

/**
 * Deep clones a sheet's sparse cells, formatting, row heights, column widths,
 * merged ranges, and metadata for worksheet duplication.
 */
export function cloneSheet(
  original: Sheet,
  newId: string,
  newName: string,
  newIndex: number
): Sheet {
  const clonedCells: SparseCellMap = {};
  for (const [key, cell] of Object.entries(original.cells || {})) {
    clonedCells[key] = {
      ...cell,
      style: cell.style
        ? {
            ...cell.style,
            borders: cell.style.borders
              ? {
                  top: cell.style.borders.top ? { ...cell.style.borders.top } : undefined,
                  right: cell.style.borders.right ? { ...cell.style.borders.right } : undefined,
                  bottom: cell.style.borders.bottom ? { ...cell.style.borders.bottom } : undefined,
                  left: cell.style.borders.left ? { ...cell.style.borders.left } : undefined
                }
              : undefined
          }
        : undefined
    };
  }

  const clonedRowHeights = original.rowHeights ? { ...original.rowHeights } : undefined;
  const clonedColWidths = original.columnWidths ? { ...original.columnWidths } : undefined;
  const clonedMergedRanges: CellRange[] = (original.mergedRanges || []).map((r) => ({
    startRow: r.startRow,
    startCol: r.startCol,
    endRow: r.endRow,
    endCol: r.endCol
  }));

  const clonedMetadata: SheetMetadata = original.metadata
    ? {
        ...original.metadata,
        // When duplicated, sheet starts visible
        isHidden: false
      }
    : {};

  return {
    id: newId,
    workbookId: original.workbookId,
    name: newName,
    index: newIndex,
    rowCount: original.rowCount,
    columnCount: original.columnCount,
    cells: clonedCells,
    rowHeights: clonedRowHeights,
    columnWidths: clonedColWidths,
    mergedRanges: clonedMergedRanges,
    metadata: clonedMetadata
  };
}

/**
 * Reorders a list of sheet IDs by moving a source item before or after a target item.
 */
export function reorderSheetList(
  sheetIds: string[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after' = 'before'
): string[] {
  if (sourceId === targetId) return [...sheetIds];

  const sourceIndex = sheetIds.indexOf(sourceId);
  const targetIndex = sheetIds.indexOf(targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return [...sheetIds];
  }

  const listWithoutSource = sheetIds.filter((id) => id !== sourceId);
  const newTargetIndex = listWithoutSource.indexOf(targetId);

  const insertIndex = position === 'before' ? newTargetIndex : newTargetIndex + 1;
  const result = [...listWithoutSource];
  result.splice(insertIndex, 0, sourceId);

  return result;
}
