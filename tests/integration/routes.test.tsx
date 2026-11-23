import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPlaceholder } from '@/features/dashboard/DashboardPlaceholder';
import { SpreadsheetEditorPlaceholder } from '@/features/spreadsheet/SpreadsheetEditorPlaceholder';
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder';
import { NotFoundPage } from '@/components/common/NotFoundPage';

const testRoutes = [
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
];

describe('Route Navigation Integration', () => {
  it('renders Dashboard workspace shell at root "/"', async () => {
    const memoryRouter = createMemoryRouter(testRoutes, {
      initialEntries: ['/'],
      future: { v7_relativeSplatPath: true }
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByText('Stage 2 Design System')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search workbooks...')).toBeInTheDocument();
      expect(screen.getByText('No Workbooks Found')).toBeInTheDocument();
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
