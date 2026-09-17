import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Avenir Next"',
          'Avenir',
          '"Trebuchet MS"',
          'sans-serif'
        ],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      colors: {
        // Neutral scale used throughout the shell (sidebar, borders, body
        // text) — deliberately cooler/darker than default slate to read
        // as a technical/security product rather than a generic app.
        ink: {
          25: '#fafafb',
          50: '#f6f8fc',
          100: '#eceef2',
          200: '#dde1e7',
          300: '#c2c8d2',
          400: '#8f97a6',
          500: '#666f80',
          600: '#4b5262',
          700: '#363c4a',
          800: '#22262f',
          900: '#14161b',
          950: '#101828'
        },
        // Primary brand accent — used only for primary actions, links,
        // and the verified/confirmed state's accent touches.
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          300: '#8aabf5',
          400: '#5b8def',
          500: '#3b6fe0',
          600: '#2c56c4',
          700: '#23439b'
        },
        // Status colors kept 1:1 with the submission state machine —
        // unchanged mapping, just tuned to the new palette.
        status: {
          uploading: '#8f97a6',
          stored: '#3b6fe0',
          hashed: '#8b5cf6',
          recording: '#d97706',
          confirmed: '#0f9d63',
          failed: '#dc2626'
        }
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(10 11 14 / 0.04), 0 1px 1px 0 rgb(10 11 14 / 0.02)',
        popover: '0 4px 16px -2px rgb(10 11 14 / 0.12), 0 2px 6px -2px rgb(10 11 14 / 0.06)',
        lift: '0 14px 30px -18px rgb(23 65 145 / 0.32)'
      },
      keyframes: {
        'fade-slide-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-slide-in': 'fade-slide-in 0.35s ease-out both'
      }
    }
  },
  plugins: []
};

export default config;
