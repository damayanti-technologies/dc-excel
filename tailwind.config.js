/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // App & Surfaces
        background: 'var(--bg-app)',
        'background-secondary': 'var(--bg-surface-secondary)',
        'background-elevated': 'var(--bg-surface-elevated)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          secondary: 'var(--bg-surface-secondary)',
          tertiary: 'var(--bg-surface-tertiary)',
          elevated: 'var(--bg-surface-elevated)',
          hover: 'var(--bg-surface-hover)',
          active: 'var(--bg-surface-active)'
        },

        // Text & Typography
        foreground: 'var(--text-primary)',
        'foreground-muted': 'var(--text-muted)',
        'foreground-subtle': 'var(--text-subtle)',
        'foreground-secondary': 'var(--text-secondary)',
        'foreground-inverse': 'var(--text-inverse)',

        // Brand & Navy
        brand: {
          DEFAULT: 'var(--brand-navy)',
          light: 'var(--brand-navy-light)'
        },

        // Professional Blue Accent
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          muted: 'var(--accent-muted)',
          border: 'var(--accent-border)'
        },

        // Borders
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)'
        },

        // Semantic Signals
        status: {
          success: 'var(--success-text)',
          'success-bg': 'var(--success-bg)',
          'success-border': 'var(--success-border)',
          warning: 'var(--warning-text)',
          'warning-bg': 'var(--warning-bg)',
          'warning-border': 'var(--warning-border)',
          error: 'var(--error-text)',
          'error-bg': 'var(--error-bg)',
          'error-border': 'var(--error-border)',
          info: 'var(--info-text)',
          'info-bg': 'var(--info-bg)',
          'info-border': 'var(--info-border)'
        },

        // Spreadsheet Grid
        grid: {
          bg: 'var(--grid-bg)',
          border: 'var(--grid-border)',
          'header-bg': 'var(--grid-header-bg)',
          'header-hover': 'var(--grid-header-hover)',
          'header-active': 'var(--grid-header-active)',
          'header-text': 'var(--grid-header-text)',
          'selection-border': 'var(--grid-selection-border)',
          'selection-bg': 'var(--grid-selection-bg)'
        }
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace']
      },
      transitionDuration: {
        fast: '150ms',
        normal: '250ms'
      }
    }
  },
  plugins: []
};
