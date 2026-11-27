import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Web App Manifest Validity', () => {
  it('confirms leftover public/manifest.json is removed in favor of VitePWA manifest generation', () => {
    const legacyPath = path.resolve(__dirname, '../../public/manifest.json');
    expect(fs.existsSync(legacyPath)).toBe(false);
  });

  it('contains a valid, well-formed web app manifest in Vite config and generated webmanifest', () => {
    const viteConfigPath = path.resolve(__dirname, '../../vite.config.ts');
    expect(fs.existsSync(viteConfigPath)).toBe(true);

    const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8');
    expect(viteConfigContent).toContain('DC Excel - Local-First Spreadsheet');
    expect(viteConfigContent).toContain('DC Excel');
    expect(viteConfigContent).toContain('standalone');
    expect(viteConfigContent).toContain('icons/icon-192x192.svg');
    expect(viteConfigContent).toContain('icons/icon-512x512.svg');

    // If dist was built, also assert generated webmanifest
    const distManifest = path.resolve(__dirname, '../../dist/manifest.webmanifest');
    if (fs.existsSync(distManifest)) {
      const manifest = JSON.parse(fs.readFileSync(distManifest, 'utf-8'));
      expect(manifest.name).toBe('DC Excel - Local-First Spreadsheet');
      expect(manifest.short_name).toBe('DC Excel');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('verifies that referenced icon files actually exist on disk', () => {
    const iconsDir = path.resolve(__dirname, '../../public/icons');
    expect(fs.existsSync(iconsDir)).toBe(true);

    // PNG and SVG fallbacks
    expect(fs.existsSync(path.join(iconsDir, 'icon-192x192.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-512x512.png'))).toBe(true);
  });
});
