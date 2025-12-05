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
        iof: resolve(__dirname, 'iof.html'),
        pagamento: resolve(__dirname, 'pagamento.html'),
        'oferta-antecipacao': resolve(__dirname, 'oferta-antecipacao.html'),
        'validacao-seguranca': resolve(__dirname, 'validacao-seguranca.html'),
        'pagamento-upsell1': resolve(__dirname, 'pagamento-upsell1.html'),
        'pagamento-upsell2': resolve(__dirname, 'pagamento-upsell2.html'),
        'pagamento-upsell3': resolve(__dirname, 'pagamento-upsell3.html'),
        'confirmacao': resolve(__dirname, 'confirmacao.html'),
      }
    }
  }
});
