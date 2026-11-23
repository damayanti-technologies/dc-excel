import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-background-secondary border border-border rounded-2xl flex items-center justify-center text-foreground-subtle mb-6 shadow-sm">
        <FileQuestion className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">404 - Page Not Found</h1>
      <p className="text-foreground-muted max-w-md mb-8">
        The spreadsheet route you are looking for does not exist or has been moved.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white hover:bg-accent-hover rounded-lg font-medium text-sm transition-colors shadow-sm"
      >
        <Home className="w-4 h-4" /> Return to Dashboard
      </Link>
    </div>
  );
};
