import { createHashRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SpreadsheetPage } from '@/features/spreadsheet/SpreadsheetPage';
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder';
import { NotFoundPage } from '@/components/common/NotFoundPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: 'recent',
        element: <DashboardPage viewModeOverride="recent" />
      },
      {
        path: 'starred',
        element: <DashboardPage viewModeOverride="starred" />
      },
      {
        path: 'files',
        element: <DashboardPage viewModeOverride="all" />
      },
      {
        path: 'folders',
        element: <DashboardPage viewModeOverride="folders" />
      },
      {
        path: 'folders/:folderId',
        element: <DashboardPage viewModeOverride="folder_detail" />
      },
      {
        path: 'workbook/:workbookId',
        element: <SpreadsheetPage />
      },
      {
        path: 'settings',
        element: <SettingsPlaceholder />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);
