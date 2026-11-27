import React, { useState } from 'react';
import {
  Download,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  FileCode,
  ExternalLink,
  Cpu,
  Globe
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from '@/stores/toast-store';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, triggerInstall } = usePWAInstall();
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownloadSetup = () => {
    setDownloadStarted(true);
    toast.success('Starting download: DC-Excel-Setup-v1.0.0.exe');

    // Trigger direct file download
    const link = document.createElement('a');
    link.href = '/DC-Excel-Setup-v1.0.0.exe';
    link.download = 'DC-Excel-Setup-v1.0.0.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePWAInstall = async () => {
    if (isInstallable) {
      const accepted = await triggerInstall();
      if (accepted) {
        toast.success('DC Excel installed successfully to your system!');
        onClose();
      }
    } else {
      toast.info('To install via browser: Click your browser menu (⋮ or ⋯) and select "Install DC Excel"');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      className="p-0 overflow-hidden"
    >
      {/* Custom Modal Header */}
      <div className="bg-gradient-to-b from-surface-elevated to-surface-secondary border-b border-border p-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-accent text-zinc-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
              DC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Install DC Excel
                </h2>
                <Badge variant="success" size="sm">
                  Official Setup
                </Badge>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Damayanti Crest • Create. Calculate. Analyse.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Body */}
      <div className="p-6 space-y-5">
        {/* Primary Option: Windows Setup File (.exe) */}
        <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-5 relative overflow-hidden transition-all hover:border-accent/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-accent text-zinc-950">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-base">
                    Windows Setup Installer (.exe)
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-accent text-zinc-950 tracking-wider">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Full desktop installer with Desktop shortcut, Start menu integration & offline launcher.
                </p>
              </div>
            </div>
          </div>

          {/* Specs Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3.5 text-xs text-foreground-subtle font-mono bg-surface/60 p-2.5 rounded-lg border border-border">
            <div className="flex items-center gap-1.5 truncate">
              <FileCode className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Setup-v1.0.0.exe</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <HardDrive className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Windows 10 / 11</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Cpu className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>x64 Architecture</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Verified Setup</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            <Button
              variant="accent"
              size="lg"
              className="font-bold flex-1 shadow-sm active:scale-98"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadSetup}
            >
              Download Windows Setup (.exe)
            </Button>
          </div>

          {/* Post-Download Instructions Banner */}
          {downloadStarted && (
            <div className="mt-4 p-3.5 rounded-lg bg-surface border border-accent/30 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="font-semibold text-accent flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Setup File Downloaded — Next Steps:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-foreground-muted pl-1">
                <li>Locate <span className="font-mono text-foreground font-semibold">DC-Excel-Setup-v1.0.0.exe</span> in your Downloads folder.</li>
                <li>Double-click the setup file and click <span className="text-foreground font-semibold">"Install Now"</span>.</li>
                <li>Launch DC Excel anytime directly from your Desktop or Start Menu!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Secondary Option: Browser PWA 1-Click Install */}
        <div className="rounded-xl border border-border bg-surface-secondary/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-surface-secondary transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-elevated text-foreground border border-border shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm">
                Progressive Web App (PWA)
              </h4>
              <p className="text-xs text-foreground-muted">
                Run directly in Chrome or Edge window mode without a traditional installer.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handlePWAInstall()}
            className="shrink-0"
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            {isInstallable ? '1-Click Install' : 'Browser App Setup'}
          </Button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="pt-2 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>100% Offline Capability (IndexedDB database)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Zero mandatory accounts, cloud tracking, or logins</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Full formula engine with dynamic array spilling</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Financial, Scientific, Engineering & Statistical labs</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
