import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const rootDir = import.meta.dirname;

// Base path GitHub Pages.
// Situs dilayani di root custom domain soyaarief.site, jadi default '/'.
// Kalau suatu saat kembali ke URL project pages
// (fauziferdiansyah.github.io/soya-arief/), set VITE_BASE='/soya-arief/'.
/**
 * Tanpa trailing slash, dev server jatuh ke index.html root sehingga
 * /webadmin menampilkan halaman undangan. Plugin ini mengarahkannya
 * ke /webadmin/ supaya sama seperti perilaku hosting statis.
 */
function redirectDirectoryUrls(base) {
  const targets = ['webadmin'];

  return {
    name: 'redirect-directory-urls',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];

        for (const dir of targets) {
          if (url === `${base}${dir}` || url === `/${dir}`) {
            res.writeHead(301, { Location: `${base}${dir}/` });
            res.end();
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE ?? '/';

  return {
    base,
    plugins: [redirectDirectoryUrls(base)],
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
