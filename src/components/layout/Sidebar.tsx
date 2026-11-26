import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Clock,
  Star,
  FileSpreadsheet,
  Folder,
  LayoutTemplate,
  Settings,
  Calculator,
  FunctionSquare,
  Sparkles,
  GraduationCap,
  Keyboard,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Tooltip } from '@/components/ui/Tooltip';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  badge?: string;
  isComingSoon?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const isMobileMenuOpen = useAppStore((state) => state.isMobileMenuOpen);
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen);

  const navigationSections: NavSection[] = [
    {
      title: 'WORKSPACE',
      items: [
        {
          id: 'home',
          label: 'Home',
          path: '/',
          icon: <LayoutGrid className="w-4 h-4 shrink-0" />
        },
        {
          id: 'recent',
          label: 'Recent',
          path: '/recent',
          icon: <Clock className="w-4 h-4 shrink-0" />
        },
        {
          id: 'starred',
          label: 'Starred',
          path: '/starred',
          icon: <Star className="w-4 h-4 shrink-0" />
        },
        {
          id: 'my-workbooks',
          label: 'My Workbooks',
          path: '/files',
          icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />
        },
        {
          id: 'folders',
          label: 'Folders',
          path: '/folders',
          icon: <Folder className="w-4 h-4 shrink-0" />
        }
      ]
    },
    {
      title: 'HUBS & LABS',
      items: [
        {
          id: 'tools',
          label: 'Tools Hub',
          path: '/tools',
          icon: <Calculator className="w-4 h-4 shrink-0" />
        },
        {
          id: 'formulas',
          label: 'Formula Center',
          path: '/formulas',
          icon: <FunctionSquare className="w-4 h-4 shrink-0" />
        },
        {
          id: 'data-tools',
          label: 'Data Center',
          path: '/data-tools',
          icon: <Sparkles className="w-4 h-4 shrink-0" />
        },
        {
          id: 'academy',
          label: 'DC Academy',
          path: '/academy',
          icon: <GraduationCap className="w-4 h-4 shrink-0" />
        },
        {
          id: 'templates',
          label: 'Templates',
          path: '/templates',
          icon: <LayoutTemplate className="w-4 h-4 shrink-0" />
        },
        {
          id: 'shortcuts',
          label: 'Shortcuts',
          path: '/shortcuts',
          icon: <Keyboard className="w-4 h-4 shrink-0" />
        }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          path: '/settings',
          icon: <Settings className="w-4 h-4 shrink-0" />
        }
      ]
    }
  ];

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="flex-1 py-3 px-2 space-y-5 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {(!isSidebarOpen && !isMobile) ? (
              <div className="h-2" />
            ) : (
              <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-foreground-subtle">
                {section.title}
              </div>
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isNav = Boolean(item.path);
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : item.path && location.pathname.startsWith(item.path);

                const itemContent = (
                  <div
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-accent/10 text-accent font-semibold dark:bg-accent/20'
                        : item.isComingSoon
                          ? 'text-foreground-subtle hover:bg-surface-hover cursor-not-allowed'
                          : 'text-foreground-secondary hover:text-foreground hover:bg-surface-hover',
                      (!isSidebarOpen && !isMobile) && 'justify-center px-0 w-9 h-9 mx-auto'
                    )}
                  >
                    {item.icon}
                    {(isSidebarOpen || isMobile) && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {(isSidebarOpen || isMobile) && item.isComingSoon && (
                      <Badge variant="neutral" size="sm" className="text-[9px] px-1.5 py-0">
                        Soon
                      </Badge>
                    )}
                  </div>
                );

                if (!isSidebarOpen && !isMobile) {
                  return (
                    <Tooltip
                      key={item.id}
                      position="right"
                      content={
                        item.isComingSoon ? `${item.label} (Coming Soon)` : item.label
                      }
                    >
                      {isNav && item.path ? (
                        <NavLink to={item.path} className="block">
                          {itemContent}
                        </NavLink>
                      ) : (
                        <div title={item.label}>{itemContent}</div>
                      )}
                    </Tooltip>
                  );
                }

                if (isNav && item.path) {
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => isMobile && setMobileMenuOpen(false)}
                      className="block"
                    >
                      {itemContent}
                    </NavLink>
                  );
                }

                return (
                  <div key={item.id} title={item.isComingSoon ? 'Coming in future stages' : undefined}>
                    {itemContent}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Collapse / Expand Toggle Button for Desktop */}
      {!isMobile && (
        <div className="p-2 border-t border-border flex items-center justify-end">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="w-full flex items-center justify-center p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-secondary transition-colors text-xs gap-2"
          >
            {isSidebarOpen ? (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="truncate">Collapse Menu</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          'hidden md:flex flex-col border-r border-border bg-surface-secondary transition-all duration-normal shrink-0 z-10',
          isSidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs animate-in fade-in"
          />

          {/* Drawer Sheet */}
          <div className="relative w-64 max-w-[80vw] h-full bg-surface-elevated border-r border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-border px-4 flex items-center justify-between">
              <span className="font-bold text-sm tracking-tight text-foreground">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-1 rounded-md text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavContent(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
