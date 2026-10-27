/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  safelist: ['bg-clip-video', 'bg-clip-image', 'bg-clip-text', 'bg-clip-audio'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080b',
          900: '#0d0f14',
          850: '#12151c',
          800: '#171b24',
          700: '#1f2430',
          600: '#2a3040',
          500: '#3b4356',
          400: '#5b6478',
          300: '#8b94a7',
          200: '#b7bfd0',
          100: '#e3e7ef',
        },
        accent: {
          400: '#7aa2ff',
          500: '#5b86ff',
          600: '#3f6cf2',
        },
        clip: {
          video: '#3b6ea8',
          image: '#7a5aa8',
          text: '#b07d2f',
          audio: '#2f8f6b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
