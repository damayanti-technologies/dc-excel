import JSZip from 'jszip';
import { Workbook } from '@/types/workbook';
import { Sheet } from '@/types/sheet';
import { BackupManifest, BackupArchiveData } from '@/types/persistence';
import { workbookRepository } from '@/storage/repositories/workbook-repository';
import { sheetRepository } from '@/storage/repositories/sheet-repository';
import { triggerBrowserDownload } from '@/services/import-export-service';
import { generateId } from '@/utils/id';
import { Logger } from '@/utils/logger';

export class BackupService {
  private readonly BACKUP_FORMAT_VERSION = '1.0.0';
  private readonly APP_VERSION = 'OmniSheet 0.13.0';

  /**
   * Generates a portable ZIP backup archive containing selected workbooks and sheets.
   */
  public async createBackup(
    workbooks: Workbook[],
    sheets: Sheet[],
    customFileName?: string,
    autoDownload = true
  ): Promise<{ blob: Blob; fileName: string; manifest: BackupManifest }> {
    const zip = new JSZip();

    // Prepare workbooks summary for the manifest
    const workbooksSummary = workbooks.map((wb) => {
      const wbSheets = sheets.filter((s) => s.workbookId === wb.id);
      let totalCells = 0;
      for (const s of wbSheets) {
        totalCells += Object.keys(s.cells || {}).length;
      }
      return {
        id: wb.id,
        name: wb.name,
        sheetCount: wbSheets.length,
        cellCount: totalCells,
      };
    });

    const manifest: BackupManifest = {
      version: this.BACKUP_FORMAT_VERSION,
      appVersion: this.APP_VERSION,
      createdAt: Date.now(),
      workbookCount: workbooks.length,
      sheetCount: sheets.length,
      workbooksSummary,
    };

    // Add JSON files to archive
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('workbooks.json', JSON.stringify(workbooks, null, 2));
    zip.file('sheets.json', JSON.stringify(sheets, null, 2));

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const timestampStr = new Date().toISOString().slice(0, 10);
    const defaultName =
      workbooks.length === 1 && workbooks[0]
        ? `${workbooks[0].name.replace(/[^a-zA-Z0-9_-]/g, '_')}_backup_${timestampStr}.omni`
        : `OmniSheet_Workspace_Backup_${timestampStr}.omni`;

    let finalName = (customFileName?.trim() || defaultName).replace(/\.(omni|zip)$/i, '');
    finalName += '.omni';

    if (autoDownload) {
      triggerBrowserDownload(zipBlob, finalName);
    }

    Logger.info('BackupService', `Created backup archive "${finalName}" with ${workbooks.length} workbooks and ${sheets.length} sheets`);

    return {
      blob: zipBlob,
      fileName: finalName,
      manifest,
    };
  }

  /**
   * Reads, inspects, and validates a backup archive file without applying it.
   */
  public async inspectBackup(
    file: File | Blob
  ): Promise<BackupArchiveData & { warnings: string[] }> {
    const zip = await JSZip.loadAsync(file);

    // 1. Validate manifest.json
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid OmniSheet backup archive: missing "manifest.json".');
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(await manifestFile.async('string'));
    } catch {
      throw new Error('Corrupted backup archive: "manifest.json" contains invalid JSON.');
    }

    if (!manifest.version) {
      throw new Error('Unsupported backup archive: missing format version.');
    }

    // 2. Validate workbooks.json
    const workbooksFile = zip.file('workbooks.json');
    if (!workbooksFile) {
      throw new Error('Invalid OmniSheet backup archive: missing "workbooks.json".');
    }

    let workbooks: Workbook[];
    try {
      workbooks = JSON.parse(await workbooksFile.async('string'));
    } catch {
      throw new Error('Corrupted backup archive: "workbooks.json" contains invalid JSON.');
    }

    if (!Array.isArray(workbooks)) {
      throw new Error('Malformed backup archive: "workbooks.json" must be an array.');
    }

    // 3. Validate sheets.json
    const sheetsFile = zip.file('sheets.json');
    if (!sheetsFile) {
      throw new Error('Invalid OmniSheet backup archive: missing "sheets.json".');
    }

    let sheets: Sheet[];
    try {
      sheets = JSON.parse(await sheetsFile.async('string'));
    } catch {
      throw new Error('Corrupted backup archive: "sheets.json" contains invalid JSON.');
    }

    if (!Array.isArray(sheets)) {
      throw new Error('Malformed backup archive: "sheets.json" must be an array.');
    }

    const warnings: string[] = [];
    if (manifest.version !== this.BACKUP_FORMAT_VERSION) {
      warnings.push(`Backup format version (${manifest.version}) differs from current version (${this.BACKUP_FORMAT_VERSION}).`);
    }

    return {
      manifest,
      workbooks,
      sheets,
      warnings,
    };
  }

  /**
   * Restores a validated backup archive into IndexedDB.
   */
  public async restoreBackup(
    file: File | Blob,
    mode: 'new' | 'replace' = 'new'
  ): Promise<{ restoredWorkbooks: Workbook[]; restoredSheets: Sheet[] }> {
    const { workbooks, sheets } = await this.inspectBackup(file);

    const restoredWorkbooks: Workbook[] = [];
    const restoredSheets: Sheet[] = [];

    if (mode === 'new') {
      // Generate completely fresh IDs to prevent overwriting existing workbooks
      for (const origWb of workbooks) {
        const newWbId = generateId('wb');
        const origSheets = sheets.filter((s) => s.workbookId === origWb.id);
        const newSheetIds: string[] = [];
        let newActiveSheetId = '';

        for (let idx = 0; idx < origSheets.length; idx++) {
          const origSheet = origSheets[idx];
          if (!origSheet) continue;
          const newSheetId = generateId('sheet');
          newSheetIds.push(newSheetId);
          if (origSheet.id === origWb.activeSheetId || idx === 0) {
            newActiveSheetId = newSheetId;
          }

          restoredSheets.push({
            ...origSheet,
            id: newSheetId,
            workbookId: newWbId,
            name: origSheet.name || `Sheet${idx + 1}`,
            index: idx,
          });
        }

        const newWb: Workbook = {
          ...origWb,
          id: newWbId,
          name: `${origWb.name} (Restored)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastOpenedAt: Date.now(),
          sheetIds: newSheetIds,
          activeSheetId: newActiveSheetId,
          revision: 1,
        };

        restoredWorkbooks.push(newWb);
      }
    } else {
      // Replace mode: Keep existing IDs or update records directly
      for (const origWb of workbooks) {
        const updatedWb: Workbook = {
          ...origWb,
          updatedAt: Date.now(),
          lastOpenedAt: Date.now(),
          revision: (origWb.revision || 1) + 1,
        };
        restoredWorkbooks.push(updatedWb);
      }

      for (const origSheet of sheets) {
        restoredSheets.push({ ...origSheet });
      }
    }

    // Persist all restored workbooks and sheets to IndexedDB
    for (const wb of restoredWorkbooks) {
      await workbookRepository.save(wb);
    }
    await sheetRepository.saveMany(restoredSheets);

    Logger.info('BackupService', `Successfully restored ${restoredWorkbooks.length} workbook(s) in "${mode}" mode`);

    return {
      restoredWorkbooks,
      restoredSheets,
    };
  }
}

export const backupService = new BackupService();
