import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

describe('Application Startup & Shell Components', () => {
  it('renders LoadingSpinner with customized message', () => {
    render(<LoadingSpinner message="Starting local engine..." />);
    expect(screen.getByText('Starting local engine...')).toBeInTheDocument();
  });

  it('renders ErrorBoundary fallback when a child throws', () => {
    const ProblemChild = () => {
      throw new Error('Test crash in component');
    };

    const originalError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    console.error = originalError;

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test crash in component/)).toBeInTheDocument();
  });

  it('renders Header with DC Excel logo, status pills, and theme control', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText('DC Excel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select color theme/i })).toBeInTheDocument();
    expect(screen.getByTitle('Application Settings')).toBeInTheDocument();
  });

  it('renders Sidebar with navigation sections and labels', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('WORKSPACE')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('My Workbooks')).toBeInTheDocument();
    expect(screen.getByText('HUBS & LABS')).toBeInTheDocument();
    expect(screen.getByText('Tools Hub')).toBeInTheDocument();
    expect(screen.getByText('Formula Center')).toBeInTheDocument();
    expect(screen.getByText('DC Academy')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
