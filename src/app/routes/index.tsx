import { lazy } from 'react';
import { createHashRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';

const SpreadsheetPage = lazy(() => import('@/features/spreadsheet/SpreadsheetPage').then(m => ({ default: m.SpreadsheetPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ToolsPage = lazy(() => import('@/features/tools/ToolsPage').then(m => ({ default: m.ToolsPage })));
const FormulaCenterPage = lazy(() => import('@/features/formulas/FormulaCenterPage').then(m => ({ default: m.FormulaCenterPage })));
const DataCenterPage = lazy(() => import('@/features/data-tools/DataCenterPage').then(m => ({ default: m.DataCenterPage })));
const AcademyPage = lazy(() => import('@/features/academy/AcademyPage').then(m => ({ default: m.AcademyPage })));
const TemplatesPage = lazy(() => import('@/features/templates/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const ShortcutsPage = lazy(() => import('@/features/shortcuts/ShortcutsPage').then(m => ({ default: m.ShortcutsPage })));

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
