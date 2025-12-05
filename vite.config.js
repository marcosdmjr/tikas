import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'images',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
