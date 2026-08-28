import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#FBF8F3',
          soft: '#F6F1E8',
        },
        cream: '#F1E9DA',
        beige: {
          DEFAULT: '#E9DFCC',
          dark: '#D9CBAE',
        },
        champagne: {
          50: '#FBF6EC',
          100: '#F3E7CC',
          200: '#E8D3A4',
          300: '#DCBE7C',
          400: '#CDA75B',
          DEFAULT: '#C6A664',
          500: '#C6A664',
          600: '#AD8A4B',
          700: '#8C6E3B',
          800: '#6B542D',
        },
        charcoal: {
          DEFAULT: '#241F1C',
          soft: '#463F39',
          muted: '#6B625A',
        },
        blush: '#EFE0DD',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Jost"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.28em',
      },
      boxShadow: {
        card: '0 2px 24px 0 rgba(36, 31, 28, 0.06)',
        lift: '0 18px 40px -12px rgba(36, 31, 28, 0.18)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fadeIn: 'fadeIn 0.8s ease forwards',
        shimmer: 'shimmer 2.2s linear infinite',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
