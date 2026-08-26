import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Build used by `npm run build:single` — one bundle, relative asset paths, no
 * code splitting, so the output can be inlined into a single HTML file.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
