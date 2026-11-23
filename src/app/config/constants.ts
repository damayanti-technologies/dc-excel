export const APP_CONFIG = {
  name: 'OmniSheet',
  version: '0.1.0',
  stage: 'Stage 1: Project Foundation & Software Architecture',
  tagline: 'Professional Local-First Spreadsheet',
  dbName: 'omnisheet_db',
  dbVersion: 1,
  defaultGrid: {
    rowCount: 1000,
    columnCount: 26,
    rowHeight: 24,
    columnWidth: 100
  }
} as const;
