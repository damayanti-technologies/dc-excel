import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallAppModal } from '@/components/modals/InstallAppModal';

describe('InstallAppModal Component', () => {
  it('renders modal with Windows Setup installer and PWA options', () => {
    const handleClose = vi.fn();
    render(<InstallAppModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByText('Install DC Excel')).toBeInTheDocument();
    expect(screen.getByText('Windows Setup Installer (.exe)')).toBeInTheDocument();
    expect(screen.getByText('Download Windows Setup (.exe)')).toBeInTheDocument();
    expect(screen.getByText('Setup-v1.0.0.exe')).toBeInTheDocument();
    expect(screen.getByText('Progressive Web App (PWA)')).toBeInTheDocument();
    expect(screen.getByText(/100% Offline Capability/i)).toBeInTheDocument();
  });

  it('triggers download and displays post-download setup guidance on button click', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const handleClose = vi.fn();
    render(<InstallAppModal isOpen={true} onClose={handleClose} />);

    const downloadBtn = screen.getByRole('button', { name: /download windows setup \(\.exe\)/i });
    fireEvent.click(downloadBtn);

    expect(screen.getByText(/Setup File Downloaded — Next Steps/i)).toBeInTheDocument();
    expect(screen.getByText(/DC-Excel-Setup-v1.0.0.exe/i)).toBeInTheDocument();
    clickSpy.mockRestore();
  });
});
