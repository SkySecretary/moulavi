/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/landing/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          950: '#022c22', 900: '#034d34', 800: '#065f46',
          700: '#047857', 600: '#059669', 500: '#10b981',
          400: '#34d399', 200: '#a7f3d0', 100: '#d1fae5', 50: '#ecfdf5'
        },
        slate: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a'
        },
        gold: {
          500: '#b8892e', 400: '#d4a843', 300: '#e8c76a', 200: '#f5e4a8', 100: '#fef3c7'
        }
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    }
  },
  plugins: [],
};
