/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FCFAF6',
        cream: '#F6F1E7',
        sand: '#EFE6D6',
        linen: '#E7DCC9',
        champagne: {
          50: '#FBF6EC',
          100: '#F3E9D3',
          200: '#E7D3AC',
          300: '#D9BC83',
          400: '#CBA765',
          500: '#BE9450',
          600: '#A67C3D',
          700: '#856032',
          800: '#5E4425',
          900: '#3B2B18',
        },
        navy: {
          50: '#EEF2F8',
          100: '#D5DEEC',
          200: '#A9BAD5',
          300: '#7089B4',
          400: '#3F5B8C',
          500: '#22406B',
          600: '#16304F',
          700: '#12294B',
          800: '#0E2038',
          900: '#0A1727',
        },
        charcoal: '#2C2823',
        stoneish: '#7B7367',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Jost', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.22em',
        wideish: '0.12em',
      },
      boxShadow: {
        card: '0 18px 40px -28px rgba(18, 41, 75, 0.35)',
        lift: '0 30px 60px -32px rgba(18, 41, 75, 0.45)',
        subtle: '0 1px 0 0 rgba(18, 41, 75, 0.06)',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'image-reveal': {
          '0%': { opacity: '0', transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.8s ease-out both',
        'image-reveal': 'image-reveal 1.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down': 'slide-down 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
