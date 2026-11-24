# OmniSheet — Deployment Guide

This guide describes how to build, test, and deploy OmniSheet to modern static hosting platforms and progressive web app environments.

---

## 1. Local Build & Preview

Before deploying, ensure all quality gates pass:

```bash
# 1. Verify strict TypeScript compilation
npm run typecheck

# 2. Run ESLint checks
npm run lint

# 3. Run full Vitest test suite (74 test suites, 478 tests)
npm run test

# 4. Generate production build with PWA service worker precaching
npm run build

# 5. Preview the production build locally
npm run preview
```

The production assets will be output to the `dist/` directory:
- `dist/index.html`: Optimized HTML entry point
- `dist/assets/`: Minified JavaScript bundles and CSS style sheets
- `dist/manifest.webmanifest`: PWA application manifest
- `dist/sw.js`: Workbox-powered offline service worker
- `dist/registerSW.js`: PWA registration script

---

## 2. Platform Deployment Instructions

OmniSheet is a 100% client-side, local-first Single Page Application (SPA). It requires static hosting with single-page application fallback routing (redirecting all non-file route requests to `/index.html`).

### Option A: Netlify (Recommended)

OmniSheet includes native support for Netlify SPA routing via `public/_redirects`:

```
/*    /index.html   200
```

#### Steps to Deploy on Netlify:
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. In the Netlify Dashboard, select **Add new site** > **Import an existing project**.
3. Configure build settings:
   - **Base directory:** (root of repository)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Deploy the site.
5. All routes (`/`, `/workbook/:id`, `/templates`, `/trash`, `/settings`) will automatically route through `index.html`.

### Option B: GitHub Pages

For GitHub Pages, configure base path and SPA 404 fallback:

1. **Base URL Configuration (`vite.config.ts`):**
   If deploying to `https://<username>.github.io/<repo>/`, set the base path:
   ```ts
   // vite.config.ts
   export default defineConfig({
     base: '/<repo>/',
     // ...
   });
   ```
   For a custom domain (e.g. `https://omnisheet.app`), keep `base: '/'`.

2. **SPA Routing Fallback:**
   Copy `dist/index.html` to `dist/404.html` during the build step:
   ```json
   "scripts": {
     "build:gh-pages": "npm run build && cp dist/index.html dist/404.html"
   }
   ```

3. **Deploy via GitHub Actions:**
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ master ]
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency:
     group: "pages"
     cancel-in-progress: true
   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm ci
         - run: npm run build
         - run: cp dist/index.html dist/404.html
         - uses: actions/upload-pages-artifact@v3
           with:
             path: 'dist'
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

### Option C: Cloudflare Pages / Vercel / AWS S3 + CloudFront

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Single Page App Routing:**
  - For Cloudflare Pages: Handled automatically.
  - For Vercel: Add `vercel.json` with rewrite:
    ```json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    ```
  - For AWS S3: Set Error Document to `index.html`.

---

## 3. PWA & Offline Service Worker Configuration

OmniSheet uses `vite-plugin-pwa` with Workbox for complete offline operation:
- Cache Strategy: Network-first for dynamic navigation, Cache-first for immutable hashed static assets (`/assets/*.js`, `/assets/*.css`).
- Maximum precached asset size: 6 MiB (accommodating `exceljs` and `echarts`).
- Data Persistence Guarantee: User workbooks and worksheets are stored in client-side **IndexedDB**, completely independent of the browser's HTTP cache. Updating the service worker or clearing website cookies does not erase IndexedDB data.

---

## 4. Backing Up Local Workbook Data

Because OmniSheet is strictly local-first and stores data on the client device:
1. Users should periodically create backup archives (`.omni` files) using the built-in **Backup** button in the top header.
2. In the Backup modal, click **Download Complete Backup (.omni)** to save an encrypted/compressed snapshot of all workbooks and revision history.
3. To migrate to another machine or browser, open OmniSheet on the new device, open the Backup modal, and select **Restore from Backup Archive**.
