/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Interactive accent — trust blue. Links, focus rings, selected/active
        // states. Primary actions use slate-900 (ink-900) for structure.
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          dark: '#1E40AF',
          light: '#EFF6FF',
          soft: '#BFDBFE',
          muted: '#2563EB14',
        },
        // Slate neutral scale — cool, professional. 900 is the near-black
        // foreground used for text and primary buttons.
        ink: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F8FAFC',
          hover: '#F1F5F9',
        },
        success: {
          light: '#F0FDF4',
          DEFAULT: '#16A34A',
        },
        warning: {
          light: '#FFFBEB',
          DEFAULT: '#F59E0B',
        },
        danger: {
          light: '#FEF2F2',
          DEFAULT: '#DC2626',
        },
      },
      fontFamily: {
        // Match the WP admin system font stack — no bundled fonts.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen-Sans',
          'Ubuntu',
          'Cantarell',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.6' }],
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
