import { defineConfig } from 'vite';
import { resolve } from 'path';

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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pagamento: resolve(__dirname, 'pagamento.html'),
        'oferta-antecipacao': resolve(__dirname, 'oferta-antecipacao.html'),
        'validacao-seguranca': resolve(__dirname, 'validacao-seguranca.html'),
      }
    }
  }
});
