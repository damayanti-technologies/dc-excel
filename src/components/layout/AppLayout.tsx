import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { Database, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '@/app/config/constants';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground transition-colors">
      {/* Top Application Header */}
      <Header />

      {/* Main Workspace: Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-background relative focus:outline-none">
          <Outlet />
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Bottom Application Status Bar */}
      <footer className="h-7 border-t border-border bg-surface-secondary px-3 text-[11px] text-foreground-muted flex items-center justify-between transition-colors shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-foreground-secondary">
            <Database className="w-3 h-3 text-accent" />
            <span>Local IndexedDB Ready</span>
          </span>
          <span className="hidden sm:inline border-l border-border pl-3 flex items-center gap-1 text-foreground-subtle">
            <ShieldCheck className="w-3 h-3" />
            <span>Zero Remote Telemetry • 100% Client-Side</span>
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-foreground-subtle">
          <span>{APP_CONFIG.name} v{APP_CONFIG.version}</span>
          <span className="hidden md:inline">• Stage 2 Design System</span>
        </div>
      </footer>
    </div>
  );
};
