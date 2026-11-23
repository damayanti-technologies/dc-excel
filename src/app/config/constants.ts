export const APP_CONFIG = {
  name: 'OmniSheet',
  version: '0.3.0',
  stage: 'Stage 3: Home Dashboard & Workbook Management',
  tagline: 'Professional Local-First Spreadsheet',
  dbName: 'omnisheet_db',
  dbVersion: 2,
  defaultGrid: {
    rowCount: 1000,
    columnCount: 26,
    rowHeight: 24,
    columnWidth: 100
  }
} as const;
