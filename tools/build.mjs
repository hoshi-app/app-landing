/**
 * build.mjs — сборка сайта.
 *
 *   npm run build          # dist/ с предрендеренным HTML
 *   PRERENDER=0 npm run build   # только клиентский бандл, без SSR
 *
 * Шагов два. Сначала Vite собирает клиентский бандл в dist/, затем отдельная
 * SSR-сборка того же приложения рендерится в строку и вставляется внутрь
 * <div id="root">. Так в готовой странице лежит настоящий текст: его видят
 * краулеры, он виден до запуска скриптов, и React при запуске не перерисовывает
 * страницу, а оживляет её (hydrateRoot в main.jsx).
 *
 * Проверки живут отдельно: `npm run verify` смотрит результат без браузера,
 * `npm run shoot` — в браузере.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SSR_DIR = path.join(ROOT, '.ssr');

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gzip = (body) => zlib.gzipSync(body, { level: 9 }).length;

/* Клиентская сборка: site/ -> dist/ ровно так, как описано в vite.config.js. */
await build({ logLevel: 'warn' });

if (process.env.PRERENDER === '0') {
  console.log('build: PRERENDER=0 — статическая разметка не собиралась');
} else {
  await fs.rm(SSR_DIR, { recursive: true, force: true });
  await build({
    logLevel: 'warn',
    publicDir: false,
    build: {
      ssr: 'src/entry-server.jsx',
      outDir: '../.ssr',
      emptyOutDir: true,
      minify: false,
      cssCodeSplit: false,
    },
  });

  const serverEntry = path.join(SSR_DIR, 'entry-server.js');
  const { render } = await import(pathToFileURL(serverEntry).href);
  const markup = render();

  const indexFile = path.join(DIST, 'index.html');
  const html = await fs.readFile(indexFile, 'utf8');
  if (!html.includes('<div id="root"></div>')) {
    throw new Error('build: в dist/index.html нет пустого <div id="root"> — нечего заполнять');
  }
  await fs.writeFile(indexFile, html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`), 'utf8');
  await fs.rm(SSR_DIR, { recursive: true, force: true });

  console.log(`build: predrender ${kb(markup.length)} разметки в dist/index.html`);
}

/* Итог одной строкой на единицу: по этим числам потом сравнивают версии. */
const assets = path.join(DIST, 'assets');
const sizes = { js: 0, css: 0, other: 0 };
const packed = { js: 0, css: 0 };
for (const name of await fs.readdir(assets)) {
  const body = await fs.readFile(path.join(assets, name));
  if (name.endsWith('.js')) {
    sizes.js += body.length;
    packed.js += gzip(body);
  } else if (name.endsWith('.css')) {
    sizes.css += body.length;
    packed.css += gzip(body);
  } else {
    sizes.other += body.length;
  }
}

const html = await fs.readFile(path.join(DIST, 'index.html'));

console.log('build: dist/');
console.log(`  index.html  ${kb(html.length)} (gzip ${kb(gzip(html))})`);
console.log(`  css         ${kb(sizes.css)} (gzip ${kb(packed.css)})`);
console.log(`  js          ${kb(sizes.js)} (gzip ${kb(packed.js)})`);
console.log(`  шрифты и прочее ${kb(sizes.other)}`);
