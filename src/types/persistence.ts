import { Workbook } from './workbook';
import { Sheet } from './sheet';

/**
 * Detailed status of workbook persistence.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'dirty' | 'error' | 'recovering';

/**
 * Historical version checkpoint of a workbook.
 */
export interface WorkbookVersion {
  id: string;
  workbookId: string;
  revision: number;
  label: string;
  description?: string;
  createdAt: number;
  sizeBytes: number;
  isManual: boolean;
  workbookSnapshot: Workbook;
  sheetsSnapshot: Sheet[];
}

/**
 * Crash recovery snapshot for uncommitted changes.
 */
export interface CrashRecoveryRecord {
  workbookId: string;
  workbookName: string;
  revision: number;
  timestamp: number;
  pendingChangeCount: number;
  workbookSnapshot: Workbook;
  sheetsSnapshot: Sheet[];
  isDirty: boolean;
}

/**
 * Manifest included inside portable OmniSheet (.omni / .zip) backup archives.
 */
export interface BackupManifest {
  version: string; // e.g. '1.0.0'
  appVersion: string; // e.g. 'OmniSheet 0.13.0'
  createdAt: number;
  workbookCount: number;
  sheetCount: number;
  workbooksSummary: {
    id: string;
    name: string;
    sheetCount: number;
    cellCount: number;
  }[];
}

/**
 * Full in-memory representation of backup contents.
 */
export interface BackupArchiveData {
  manifest: BackupManifest;
  workbooks: Workbook[];
  sheets: Sheet[];
}

/**
 * Storage breakdown metrics for the Storage Management panel.
 */
export interface StorageBreakdown {
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  workbookCount: number;
  sheetCount: number;
  versionCount: number;
  versionSizeBytes: number;
  recoveryCount: number;
  backupCount: number;
}

/**
 * Inter-tab communication message for multi-tab conflict detection.
 */
export interface MultiTabMessage {
  type: 'tab_opened' | 'tab_closed' | 'workbook_saved' | 'conflict_detected';
  tabId: string;
  workbookId: string;
  revision: number;
  timestamp: number;
}

/**
 * Data integrity diagnostic report.
 */
export interface DataIntegrityReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  orphanedSheets: string[];
  missingSheets: string[];
  invalidCoordinates: string[];
}
