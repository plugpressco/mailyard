/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0D9488',
          hover: '#0F766E',
          light: '#F0FDFA',
          dark: '#0F766E',
          mint: '#CCFBF1',
          muted: '#0D948814',
        },
        warm: {
          50: '#F8F6F1',
          100: '#F3F0EA',
          200: '#E3DED6',
          300: '#D5D1CC',
          400: '#ADA69B',
          500: '#7C766D',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1A1815',
        },
        surface: {
          DEFAULT: '#FEFCF9',
          alt: '#F3F0EA',
          hover: '#EDEAE3',
        },
        success: {
          light: '#ECFDF5',
          DEFAULT: '#16A34A',
        },
        warning: {
          light: '#FEF9EC',
          DEFAULT: '#CA8A04',
        },
        danger: {
          light: '#FEF2F2',
          DEFAULT: '#DC2626',
        },
      },
      fontFamily: {
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
