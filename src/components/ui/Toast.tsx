import React from 'react';
import { useToastStore, ToastItem } from '@/stores/toast-store';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastNotification key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastNotificationProps {
  toast: ToastItem;
  onDismiss: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
  };

  const borderColors = {
    success: 'border-emerald-200 dark:border-emerald-800/60',
    error: 'border-red-200 dark:border-red-800/60',
    warning: 'border-amber-200 dark:border-amber-800/60',
    info: 'border-blue-200 dark:border-blue-800/60'
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto w-full p-3.5 bg-surface-elevated border rounded-xl shadow-lg flex items-start gap-3 transition-all',
        'animate-in fade-in slide-in-from-bottom-3 duration-200',
        borderColors[toast.type]
      )}
    >
      <div className="pt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 space-y-0.5 min-w-0">
        <div className="text-xs font-semibold text-foreground truncate">{toast.title}</div>
        {toast.description && (
          <div className="text-[11px] text-foreground-muted leading-relaxed line-clamp-2">
            {toast.description}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
