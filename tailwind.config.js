/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@plugpress/ui/tailwind-preset')],
  content: [
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mailyard brand blue (matches @plugpress/ui/tokens/accents/mailyard.css).
        // Literal hexes so Tailwind alpha modifiers (bg-brand/[0.08]) work.
        //
        // DEFAULT is 3.22:1 on white — SURFACES only (marks, dots, focus rings,
        // underlines: the 3:1 bar). For TEXT use `brand-text` (#1372B0, 5.17:1);
        // `text-brand` on a link silently fails WCAG AA.
        brand: {
          DEFAULT: '#2395E7',
          hover: '#1F83CB',
          text: '#1372B0',
          dark: '#0E5181',
          light: '#E3F2FC',
          soft: '#96CCF3',
          muted: '#2395E714',
        },
        // Geist-style pure neutral ramp (design-system neutrals; the semantic
        // tokens --pp-* map onto this same family). Replaces the old slate ink.
        ink: {
          50:  '#FAFAFA',
          100: '#F5F5F5',
          200: '#EAEAEA',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#FAFAFA',
          hover: '#F5F5F5',
        },
        success: {
          light: '#F0FDF4',
          DEFAULT: '#16A34A',
        },
        warning: {
          light: '#FFFBEB',
          DEFAULT: '#B45309',
        },
        danger: {
          light: '#FEF2F2',
          DEFAULT: '#DC2626',
        },
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
