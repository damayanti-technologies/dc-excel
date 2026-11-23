import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPlaceholder } from '@/features/dashboard/DashboardPlaceholder';
import { SpreadsheetEditorPlaceholder } from '@/features/spreadsheet/SpreadsheetEditorPlaceholder';
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder';
import { NotFoundPage } from '@/components/common/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <DashboardPlaceholder />
      },
      {
        path: 'workbook/:workbookId',
        element: <SpreadsheetEditorPlaceholder />
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
