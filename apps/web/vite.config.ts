import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * The app is served from the root in development and from the repository
 * subpath on GitHub Pages, so the base is a build-time setting. Vite rewrites
 * every asset URL in index.html and in the bundle from it.
 */
const base = process.env.BASE_PATH ?? '/';

/**
 * Where the built app should look for the API. A static deployment sets this to
 * "off" and the app then runs entirely in the browser. It is substituted here
 * rather than relying on Vite's env-file loading, so that passing it on the
 * command line in CI is enough.
 */
const apiBase = process.env.VITE_API_BASE ?? '/api';

export default defineConfig({
  base,
  define: {
    // Vite owns the import.meta.env namespace, so the API base is injected as
    // its own build-time constant instead.
    __API_BASE__: JSON.stringify(apiBase),
  },
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@budova/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://localhost:8787', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1500 },
});
