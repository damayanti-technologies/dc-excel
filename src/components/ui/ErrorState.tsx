import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export interface ErrorStateProps {
  title?: string;
  message: string;
  error?: Error | unknown;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message,
  error,
  onRetry,
  className
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const errorDetails = error instanceof Error ? error.stack || error.message : String(error);

  return (
    <div
      className={cn(
        'w-full max-w-lg mx-auto p-6 rounded-2xl bg-surface border border-red-200 dark:border-red-900/60 shadow-xs space-y-4 text-center',
        className
      )}
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold text-foreground">{title}</h4>
        <p className="text-xs text-foreground-muted leading-relaxed">{message}</p>
      </div>

      {Boolean(error) && (
        <div className="text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1 mx-auto"
          >
            <span>{showDetails ? 'Hide technical details' : 'Show technical details'}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showDetails && (
            <pre className="mt-2 p-3 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-36">
              {errorDetails}
            </pre>
          )}
        </div>
      )}

      {onRetry && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
