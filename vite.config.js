import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const rootDir = import.meta.dirname;

// Base path GitHub Pages.
// - Tanpa custom domain  : '/soya-arief/'  (default sekarang)
// - Setelah pakai domain : set VITE_BASE='/' di GitHub Variables
export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE ?? '/soya-arief/';

  return {
    base,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      rollupOptions: {
        input: {
          main: resolve(rootDir, 'index.html'),
          webadmin: resolve(rootDir, 'webadmin/index.html'),
        },
      },
    },
    server: {
      port: 5173,
      open: true,
    },
  };
});
