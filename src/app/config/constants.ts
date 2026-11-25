export const APP_CONFIG = {
  name: 'DC Excel',
  version: '1.0.0',
  stage: 'Production Release',
  tagline: 'Professional Local-First Spreadsheet',
  dbName: 'omnisheet_db',
  dbVersion: 3,
  defaultGrid: {
    rowCount: 1000,
    columnCount: 26,
    rowHeight: 24,
    columnWidth: 100
  }
} as const;
