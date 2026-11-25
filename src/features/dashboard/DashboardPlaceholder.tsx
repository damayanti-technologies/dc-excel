import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Layers,
  Bell,
  MessageSquare,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { toast } from '@/stores/toast-store';
import { APP_CONFIG } from '@/app/config/constants';

export const DashboardPlaceholder: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [testToggle, setTestToggle] = useState(true);

  const handleTestToast = (type: 'success' | 'info' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        toast.success('Action Completed', 'DC Excel verified local storage state.');
        break;
      case 'info':
        toast.info('Workspace Update', 'Stage 2 Design System is fully active.');
        break;
      case 'warning':
        toast.warning('Offline Storage Notice', 'Running without internet connection.');
        break;
      case 'error':
        toast.error('Simulation Notice', 'Test error notification successfully dispatched.');
        break;
    }
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Workspace Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Workbooks
            </h1>
            <Badge variant="accent" size="sm">
              Stage 2 Design System
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Local-first workspace stored entirely on your device via IndexedDB.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search workbooks..."
            className="w-full sm:w-64"
          />
          <Link to="/workbook/demo-workbook-1">
            <Button variant="accent" size="md" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
              Open Workbook
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Workspace Content Area: Empty State */}
      <div className="py-6">
        <EmptyState
          icon={<FileSpreadsheet className="w-7 h-7 text-accent" />}
          title="No Workbooks Found"
          description={
            searchQuery
              ? `No workbooks matching "${searchQuery}". Clear your search or launch the spreadsheet editor shell.`
              : 'Your local workspace is currently empty. Open the spreadsheet editor shell to test the Stage 2 interface.'
          }
          action={
            <Link to="/workbook/demo-workbook-1">
              <Button
                variant="accent"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Launch Workbook Shell
              </Button>
            </Link>
          }
          secondaryAction={
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestToast('info')}
            >
              Test Notification
            </Button>
          }
        />
      </div>

      {/* Interactive Stage 2 Component & Design System Verification Panel */}
      <div className="rounded-2xl border border-border bg-surface-elevated p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Design System Component Verification</span>
            </h2>
            <p className="text-xs text-foreground-muted">
              Interactive testing suite for Stage 2 buttons, modals, toasts, toggles, and tokens.
            </p>
          </div>
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Tokens Active</span>
          </Badge>
        </div>

        {/* Buttons and Modals Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-2.5">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              <span>Dialog Components</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full justify-center"
              >
                Open Demo Modal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                className="w-full justify-center"
              >
                Confirm Dialog
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-2.5">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-accent" />
              <span>Toast Notification Suite</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleTestToast('success')}
                className="text-emerald-600 dark:text-emerald-400"
              >
                Success
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleTestToast('info')}
                className="text-teal-600 dark:text-teal-400"
              >
                Info
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleTestToast('warning')}
                className="text-amber-600 dark:text-amber-400"
              >
                Warning
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleTestToast('error')}
                className="text-red-600 dark:text-red-400"
              >
                Error
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-2.5">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>Toggle & Badges</span>
            </div>
            <div className="space-y-2">
              <Toggle
                label="Interactive State"
                checked={testToggle}
                onChange={setTestToggle}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="accent" size="sm">Primary</Badge>
                <Badge variant="success" size="sm">Ready</Badge>
                <Badge variant="neutral" size="sm">Local</Badge>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border space-y-2.5">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Theme & Identity</span>
            </div>
            <div className="text-[11px] text-foreground-muted space-y-1">
              <div>Palette: Obsidian & Precision Emerald</div>
              <div>Typography: Inter System UI</div>
              <div>Storage: 100% Client-Side</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Modal Dialog */}
      <Modal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        title="Stage 2 Design System Dialog"
        description="Demonstrates accessible focus trapping, escape key dismissal, and backdrop blur."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDemoModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                setIsDemoModalOpen(false);
                toast.success('Action Confirmed', 'Dialog action executed successfully.');
              }}
            >
              Confirm Action
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-foreground-secondary leading-relaxed">
            This modal complies with W3C dialog accessibility specifications. You can press the
            <kbd className="px-1.5 py-0.5 mx-1 rounded bg-surface-secondary border border-border font-mono text-[11px]">
              Escape
            </kbd>
            key or click the backdrop to close it.
          </p>
          <div className="p-3 rounded-lg bg-surface-secondary border border-border text-xs text-foreground-muted font-mono">
            {APP_CONFIG.name} — Architecture Version {APP_CONFIG.version}
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          toast.info('Confirmed', 'Confirmation dialog dismissed.');
        }}
        title="Confirm Stage 2 Verification"
        message="Are you ready to verify the Stage 2 interface components?"
        confirmLabel="Verify"
      />
    </div>
  );
};
