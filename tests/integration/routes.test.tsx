import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SpreadsheetEditorPlaceholder } from '@/features/spreadsheet/SpreadsheetEditorPlaceholder';
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder';
import { NotFoundPage } from '@/components/common/NotFoundPage';
import { clearAllStores } from '@/storage/indexeddb/database';

const testRoutes = [
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
];

describe('Route Navigation Integration', () => {
  beforeEach(async () => {
    await clearAllStores();
  });

  it('renders Dashboard workspace shell at root "/"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to OmniSheet')).toBeInTheDocument();
      expect(screen.getByText('Create New Workbook')).toBeInTheDocument();
      expect(screen.getByText('Blank Workbook')).toBeInTheDocument();
      expect(screen.getByText('Recent Workbooks')).toBeInTheDocument();
      expect(screen.getByText('My Folders')).toBeInTheDocument();
    });
  });

  it('renders Recent Workbooks view at "/recent"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/recent'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Recent Workbooks' })).toBeInTheDocument();
      expect(screen.getByText('No Recent Workbooks')).toBeInTheDocument();
    });
  });

  it('renders Starred Workbooks view at "/starred"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/starred'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Starred Workbooks' })).toBeInTheDocument();
      expect(screen.getByText('No Starred Workbooks')).toBeInTheDocument();
    });
  });

  it('renders My Workbooks view at "/files"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/files'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'My Workbooks' })).toBeInTheDocument();
    });
  });

  it('renders Folders view at "/folders"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/folders'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'My Folders' })).toBeInTheDocument();
      expect(screen.getByText('No Folders Created')).toBeInTheDocument();
    });
  });

  it('renders Spreadsheet Editor shell at "/workbook/:workbookId"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/workbook/wb-unit-test'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getAllByText(/wb-unit-test/)[0]).toBeInTheDocument();
      expect(screen.getByText('Spreadsheet Shell Prepared')).toBeInTheDocument();
      expect(screen.getByText('Active Cell')).toBeInTheDocument();
      expect(screen.getByLabelText('Formula Bar')).toBeInTheDocument();
    });
  });

  it('renders Settings shell at "/settings"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/settings'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByText('Theme Mode')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Storage & Diagnostics')).toBeInTheDocument();
    });
  });

  it('renders NotFoundPage on unknown route', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/completely-unknown-route'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
      expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
    });
  });
});
