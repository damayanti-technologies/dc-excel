import { createHashRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SpreadsheetPage } from '@/features/spreadsheet/SpreadsheetPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ToolsPage } from '@/features/tools/ToolsPage';
import { FormulaCenterPage } from '@/features/formulas/FormulaCenterPage';
import { DataCenterPage } from '@/features/data-tools/DataCenterPage';
import { AcademyPage } from '@/features/academy/AcademyPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';
import { ShortcutsPage } from '@/features/shortcuts/ShortcutsPage';
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
        path: 'tools',
        element: <ToolsPage />
      },
      {
        path: 'formulas',
        element: <FormulaCenterPage />
      },
      {
        path: 'data-tools',
        element: <DataCenterPage />
      },
      {
        path: 'academy',
        element: <AcademyPage />
      },
      {
        path: 'templates',
        element: <TemplatesPage />
      },
      {
        path: 'shortcuts',
        element: <ShortcutsPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);
