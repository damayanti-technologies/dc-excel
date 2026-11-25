import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading DC Excel...',
  className = ''
}) => {
  return (
    <div
      className={`min-h-[300px] flex flex-col items-center justify-center p-8 space-y-4 ${className}`}
    >
      <Loader2 className="w-10 h-10 animate-spin text-accent" />
      {message && <p className="text-sm font-medium text-foreground-muted">{message}</p>}
    </div>
  );
};
