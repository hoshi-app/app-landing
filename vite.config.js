import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadChangelog } from './tools/changelog.mjs';

/**
 * Страница целиком лежит в site/: index.html — точка входа, src/ — исходники,
 * public/ — статика (скрины, постеры, иконки, og.jpg, robots, llms).
 *
 * base: './' — пути относительные, поэтому сборка работает и из подпапки
 * вида user.github.io/app-landing/ без правок.
 */

/**
 * Новости — отдельные .md в site/src/data/changelog/. Vite не умеет читать их
 * как данные, поэтому модуль `virtual:changelog` собирается здесь: тот же
 * парсер, что и в tools/build.mjs, отдаёт браузеру и SSR уже разобранные записи
 * с готовым HTML. Markdown-парсер в бандл не попадает.
 *
 * В dev каталог новостей под наблюдением: правка .md перезагружает страницу.
 */
function changelogData() {
  const id = 'virtual:changelog';
  const resolvedId = '\0' + id;

  return {
    name: 'hoshi-changelog',
    resolveId(source) {
      return source === id ? resolvedId : null;
    },
    async load(moduleId) {
      if (moduleId !== resolvedId) return null;
      const { entries, files } = await loadChangelog();
      for (const file of files) this.addWatchFile(file);
      return `export default ${JSON.stringify(entries)};`;
    },
    handleHotUpdate(ctx) {
      if (!/[\\/]site[\\/]src[\\/]data[\\/]changelog[\\/][^\\/]+\.md$/.test(ctx.file)) return;
      const module = ctx.server.moduleGraph.getModuleById(resolvedId);
      if (module) ctx.server.moduleGraph.invalidateModule(module);
      ctx.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  root: 'site',
  base: './',
  publicDir: 'public',
  plugins: [changelogData(), react()],
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
