import type { Config } from 'tailwindcss';

// Design tokens: one accent blue, navy ink, neutral greys, amber for caution only.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        md: '1.5rem',
        xl: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    fontFamily: {
      sans: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '18px' }],
      base: ['14px', { lineHeight: '20px' }],
      md: ['15px', { lineHeight: '22px' }],
      lg: ['16px', { lineHeight: '24px' }],
      xl: ['18px', { lineHeight: '26px' }],
      '2xl': ['22px', { lineHeight: '28px' }],
      '3xl': ['28px', { lineHeight: '34px' }],
    },
    extend: {
      colors: {
        page: '#F6F7F9',
        surface: '#FFFFFF',
        line: '#E5E7EB',
        ink: {
          DEFAULT: '#0F1F3D',
          secondary: '#5B6473',
          muted: '#94A3B8',
        },
        accent: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
          soft: '#EFF4FF',
        },
        caution: {
          DEFAULT: '#B45309',
          soft: '#FFFBEB',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
      boxShadow: {
        hover: '0 4px 12px rgba(15, 31, 61, 0.08)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

export default config;
