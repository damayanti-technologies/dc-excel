import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Web App Manifest Validity', () => {
  it('contains a valid, well-formed web app manifest', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    // Assert essential PWA fields
    expect(manifest.name).toBe('DC Excel - Local-First Spreadsheet');
    expect(manifest.short_name).toBe('DC Excel');
    expect(['/', '/excel/', '/dc-excel/']).toContain(manifest.start_url);
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toBeDefined();

    // Icons check
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const icon192 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '192x192');
    const icon512 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '512x512');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
  });

  it('verifies that referenced icon files actually exist on disk', () => {
    const iconsDir = path.resolve(__dirname, '../../public/icons');
    expect(fs.existsSync(iconsDir)).toBe(true);

    // PNG and SVG fallbacks
    expect(fs.existsSync(path.join(iconsDir, 'icon-192x192.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-512x512.png'))).toBe(true);
  });
});
