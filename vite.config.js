import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Страница целиком лежит в site/: index.html — точка входа, src/ — исходники,
 * public/ — статика (скрины, постеры, иконки, og.jpg, robots, llms).
 *
 * base: './' — пути относительные, поэтому сборка работает и из подпапки
 * вида user.github.io/app-landing/ без правок.
 */
export default defineConfig({
  root: 'site',
  base: './',
  publicDir: 'public',
  plugins: [react()],
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: {
      // редакторы пишут атомарно через временные каталоги; на Windows их
      // нельзя держать под наблюдением — watcher падает с EBUSY
      ignored: ['**/.*.tmpdir/**', '**/.*.tmp', '**/.git/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
  },
});
