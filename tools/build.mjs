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
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { LEGAL_PAGES, DOCS_DIR } from '../site/src/data/legal.js';
import { loadChangelog, CHANGELOG_DIR, LIST_PAGE, MD_DIR } from './changelog.mjs';
import { NOT_FOUND } from '../site/src/data/notFound.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SSR_DIR = path.join(ROOT, '.ssr');

/* Канонический адрес сайта — только для абсолютных ссылок в фиде: приложение
   получает готовые URL картинок и записей, а не склеивает их само. */
const SITE = (process.env.SITE_URL ?? 'https://hoshi.tv').replace(/\/+$/, '');

/* Новости — .md-файлы: читаем их до сборки, чтобы битый front-matter упал
   раньше, чем Vite потратит время на бандл. */
const { entries: CHANGELOG } = await loadChangelog();

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gzip = (body) => zlib.gzipSync(body, { level: 9 }).length;
const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* Windows-песочница DSH оставляет на дереве проекта метку «низкий уровень
   целостности». esbuild.exe из node_modules запускается с ней же и уже не имеет
   права удалить свой временный файл в %TEMP% — сборка падает с `Access is denied`
   в vite:esbuild-transpile, успев стереть dist/. Свой temp лежит в проекте: он под
   той же меткой, поэтому удаление проходит, а .tmp/ уже в .gitignore. */
if (process.platform === 'win32') {
  const TMP = path.join(ROOT, '.tmp');
  await fs.mkdir(TMP, { recursive: true });
  process.env.TMP = TMP;
  process.env.TEMP = TMP;
}

/* Клиентская сборка: site/ -> dist/ ровно так, как описано в vite.config.js. */
await build({ logLevel: 'warn' });

/* GitHub Pages отдаёт ветку pages целиком, поэтому два служебных файла должны
   ехать в самой сборке: CNAME держит домен (без него Pages снимает hoshi.tv),
   .nojekyll выключает Jekyll — он не нужен статике и только переписывает URL. */
await fs.writeFile(path.join(DIST, 'CNAME'), 'hoshi.tv\n', 'utf8');
await fs.writeFile(path.join(DIST, '.nojekyll'), '', 'utf8');

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
  const { render, render404 } = await import(pathToFileURL(serverEntry).href);

  const indexFile = path.join(DIST, 'index.html');
  const template = await fs.readFile(indexFile, 'utf8');
  if (!template.includes('<div id="root"></div>')) {
    throw new Error('build: в dist/index.html нет пустого <div id="root"> — нечего заполнять');
  }

  const fill = (page, markup) =>
    page.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

  /* Шаблон собран с base: './', то есть под корень сайта. Вложенной странице
     эти href/src нужно переписать под её глубину, а 404 — под корень «/»:
     её адрес заранее неизвестен. */
  const rebase = (page, base) =>
    page
      /* кадр приложения вложенным страницам не нужен — предзагрузка только мешает */
      .replace(/\s*<link rel="preload" as="image" href="\.\/screens\/title\.avif"[^>]*>/, '')
      .replace(/\s(href|src)="\.\//g, ` $1="${base}`)
      .replace(/(<meta\s+property="og:image"[^>]*content=")\.\//s, `$1${base}`);

  /* Юридические документы: своя разметка и свой <head> на каждый адрес.
     Файлы лежат как dist/faq/docs/<slug>.html — так GitHub Pages отдаёт
     /faq/docs/terms, а ссылки в текстах и футере указывают на него без
     расширения. Страница документа на два уровня глубже корня, поэтому
     относительные href/src из шаблона (assets, fonts, иконки, og) получают
     префикс «../../»: иначе они просили бы /faq/docs/assets/…. */
  const docHead = (page, doc) =>
    rebase(page, '../../')
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(doc.title)} — hoshi</title>`)
      .replace(/(<meta\s+name="description"[^>]*content=")[^"]*/s, `$1${esc(doc.description)}`)
      .replace(/(<meta\s+property="og:title"[^>]*content=")[^"]*/s, `$1${esc(doc.title)} — hoshi`)
      .replace(/(<meta\s+property="og:description"[^>]*content=")[^"]*/s, `$1${esc(doc.description)}`);

  for (const doc of LEGAL_PAGES) {
    const page = docHead(template, doc);
    await fs.mkdir(path.join(DIST, DOCS_DIR), { recursive: true });
    await fs.writeFile(
      path.join(DIST, DOCS_DIR, `${doc.slug}.html`),
      fill(page, render(`/${DOCS_DIR}/${doc.slug}`)),
      'utf8',
    );
  }

  /* Лента обновлений: /faq/changelog/ со списком и /faq/changelog/<slug> с
     каждой записью. Страницы лежат на той же глубине, что документы, поэтому
     docHead с «../../» подходит им без правок. */
  const logDir = path.join(DIST, CHANGELOG_DIR);
  await fs.mkdir(logDir, { recursive: true });

  const logPages = [
    { url: `/${CHANGELOG_DIR}/`, file: 'index.html', head: LIST_PAGE },
    ...CHANGELOG.map((entry) => ({
      url: `/${CHANGELOG_DIR}/${entry.slug}`,
      file: `${entry.slug}.html`,
      head: { title: entry.title, description: entry.summary },
      entry,
    })),
  ];

  for (const logPage of logPages) {
    let page = docHead(template, logPage.head);
    if (logPage.entry?.cover) {
      const { cover } = logPage.entry;
      const type = cover.src.endsWith('.webp')
        ? 'image/webp'
        : cover.src.endsWith('.png')
          ? 'image/png'
          : 'image/jpeg';
      page = page
        .replace(/(<meta\s+property="og:image"[^>]*content=")[^"]*/, `$1../../${cover.src}`)
        .replace(/(<meta\s+property="og:image:type"[^>]*content=")[^"]*/, `$1${type}`)
        .replace(/(<meta\s+property="og:image:width"[^>]*content=")[^"]*/, `$1${cover.width}`)
        .replace(/(<meta\s+property="og:image:height"[^>]*content=")[^"]*/, `$1${cover.height}`);
    }
    await fs.writeFile(path.join(logDir, logPage.file), fill(page, render(logPage.url)), 'utf8');

    /* Копия исходника рядом со страницей: /faq/changelog/<slug>/export.md.
       Это тот же файл, что лежит в site/src/data/changelog: приложение рисует
       новость по нему, а не по HTML-странице. */
    if (logPage.entry) {
      const exportDir = path.join(logDir, logPage.entry.slug);
      await fs.mkdir(exportDir, { recursive: true });
      await fs.copyFile(
        path.join(MD_DIR, logPage.entry.source),
        path.join(exportDir, 'export.md'),
      );
    }
  }

  /* feed.json — маршрутизатор, а не копия страницы. В записи только то, что
     нужно списку новостей и чтобы найти саму новость: заголовок, лид, адрес
     страницы и адрес export.md с полным текстом.

     entries — все новости, новые сверху (основной список).
     actual  — только актуальные, от старых к новым: приложение берёт последнюю
               запись как свежий сплэш, а порядок остаётся историей показа.

     `version` — хэш содержимого: приложение кэширует его и показывает новость
     один раз, а меняется он только при правке ленты (даты сборки в хэше нет,
     поэтому повторная сборка даёт тот же файл). */
  const routerItem = (entry) => ({
    slug: entry.slug,
    date: entry.date,
    tag: entry.tag,
    title: entry.title,
    summary: entry.summary,
    url: `${SITE}/${CHANGELOG_DIR}/${entry.slug}`,
    md: `${SITE}/${CHANGELOG_DIR}/${entry.slug}/export.md`,
  });

  const actual = CHANGELOG.filter((entry) => entry.actual)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug))
    .map(routerItem);

  const logBody = {
    site: SITE,
    listUrl: `${SITE}/${CHANGELOG_DIR}/`,
    entries: CHANGELOG.map(routerItem),
    actual,
  };
  const feed = {
    version: createHash('sha1').update(JSON.stringify(logBody)).digest('hex').slice(0, 12),
    ...logBody,
  };
  const feedJson = `${JSON.stringify(feed, null, 2)}\n`;
  await fs.writeFile(path.join(logDir, 'feed.json'), feedJson, 'utf8');

  /* 404 отдаётся на любой несуществующий адрес (GitHub Pages берёт этот файл
     автоматически), поэтому её адрес заранее неизвестен: все пути в ней — от
     корня «/», иначе на глубине вроде /faq/ стили просились бы из /faq/assets.
     data-page="404" — метка для main.jsx: по URL эту страницу не узнать. */
  const notFoundHead = rebase(template, '/')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(NOT_FOUND.title)} — hoshi</title>`)
    .replace(/(<meta\s+name="description"[^>]*content=")[^"]*/s, `$1${esc(NOT_FOUND.text)}`)
    .replace(/(<meta\s+property="og:title"[^>]*content=")[^"]*/s, `$1${esc(NOT_FOUND.title)} — hoshi`)
    .replace(/(<meta\s+property="og:description"[^>]*content=")[^"]*/s, `$1${esc(NOT_FOUND.text)}`)
    .replace(/<html lang="ru"/, '<html lang="ru" data-page="404"')
    .replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>');
  const notFoundPage = fill(notFoundHead, render404());
  await fs.writeFile(path.join(DIST, '404.html'), notFoundPage, 'utf8');

  const markup = render('/');
  await fs.writeFile(indexFile, fill(template, markup), 'utf8');
  await fs.rm(SSR_DIR, { recursive: true, force: true });

  console.log(`build: predrender ${kb(markup.length)} разметки в dist/index.html`);
  console.log(`build: страниц документов ${LEGAL_PAGES.length}`);
  console.log(
    `build: лента — ${CHANGELOG.length} записей, ${logPages.length} страниц, фид ${kb(Buffer.byteLength(feedJson))}, 404 ${kb(Buffer.byteLength(notFoundPage))}`,
  );
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
