import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/routes';
import { AppProviders } from '@/app/providers/AppProviders';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
};

export default App;
