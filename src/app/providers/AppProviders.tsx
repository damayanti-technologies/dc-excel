import React, { useEffect, useState, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';
import { getDatabase } from '@/storage/indexeddb/database';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Logger } from '@/utils/logger';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const loadPreferences = useUIPreferencesStore((state) => state.loadPreferences);

  useEffect(() => {
    async function initializeApplication() {
      try {
        Logger.info('AppProviders', 'Initializing IndexedDB and loading user preferences...');
        await getDatabase();
        await loadPreferences();
        setIsInitialized(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        Logger.error('AppProviders', 'Application initialization failed', err);
        setInitError(msg);
      }
    }

    void initializeApplication();
  }, [loadPreferences]);

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-background-elevated border border-border p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-lg font-bold text-red-600">Storage Initialization Failed</h2>
          <p className="text-sm text-foreground-muted">
            DC Excel was unable to open the local IndexedDB database. Please verify that your
            browser supports IndexedDB and does not block storage in private/incognito mode.
          </p>
          <div className="text-xs font-mono bg-background-secondary p-2 rounded text-red-500">
            {initError}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-accent text-white rounded font-medium text-sm hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner message="Initializing DC Excel local engine..." />
      </div>
    );
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};
