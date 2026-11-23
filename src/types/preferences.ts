export type ThemeMode = 'light' | 'dark' | 'system';

export interface DefaultWorkbookSettings {
  defaultRowCount: number;
  defaultColumnCount: number;
  defaultSheetName: string;
  defaultColWidth: number;
  defaultRowHeight: number;
}

export interface ApplicationPreferences {
  autoSaveIntervalMs: number;
  showGridLinesDefault: boolean;
  showFormulaBarDefault: boolean;
  showHeadersDefault: boolean;
  maxUndoSteps: number;
  numberLocale: string;
}

export interface UserPreferences {
  id: 'current_user_preferences';
  theme: ThemeMode;
  language: string;
  defaultWorkbookSettings: DefaultWorkbookSettings;
  applicationPreferences: ApplicationPreferences;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  id: 'current_user_preferences',
  theme: 'system',
  language: 'en',
  defaultWorkbookSettings: {
    defaultRowCount: 1000,
    defaultColumnCount: 26,
    defaultSheetName: 'Sheet1',
    defaultColWidth: 100,
    defaultRowHeight: 24
  },
  applicationPreferences: {
    autoSaveIntervalMs: 3000,
    showGridLinesDefault: true,
    showFormulaBarDefault: true,
    showHeadersDefault: true,
    maxUndoSteps: 100,
    numberLocale: 'en-US'
  }
};
