/**
 * verify.mjs — проверка собранной страницы без браузера.
 *
 *   npm run build && npm run verify
 *
 * Смотрит то, что глазами не проверишь: заполнена ли статическая разметка,
 * ведут ли якоря на существующие id, совпадают ли заявленные размеры картинок
 * с настоящими, лежат ли рядом AVIF/WebP, на месте ли мета и og.jpg, и не
 * распух ли бандл. Возвращает ненулевой код, если что-то не так.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { LEGAL_PAGES, DOCS_DIR } from '../site/src/data/legal.js';
import {
  loadChangelog,
  CHANGELOG_DIR,
  LIST_PAGE,
  MD_DIR,
  changelogForPath,
} from './changelog.mjs';
import { imageSize, webpSize } from './image-size.mjs';
import { NOT_FOUND } from '../site/src/data/notFound.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');

const BUDGET = {
  html: 24 * 1024, // gzip; статика предрендера
  css: 20 * 1024, // gzip
  js: 300 * 1024, // gzip
  dom: 1800,
};

const fail = [];
const note = [];
const check = (ok, message) => (ok ? note.push(`  ok   ${message}`) : fail.push(message));

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gzip = (body) => zlib.gzipSync(body, { level: 9 }).length;

/* Новости читаются тем же парсером, что и сборка: проверяем исходники, а не
   их копию в бандле. Битый .md роняет verify с понятным сообщением. */
let changelog;
try {
  changelog = await loadChangelog();
} catch (error) {
  console.error(`verify: ${error.message}`);
  process.exit(1);
}
const CHANGELOG = changelog.entries;

/* ------------------------------------------------------------------ файлы */

let html;
try {
  html = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
} catch {
  console.error('verify: нет dist/index.html — сначала npm run build');
  process.exit(1);
}

const files = new Set();
async function walk(dir, prefix = '') {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
    else files.add(rel);
  }
}
await walk(DIST);

const attr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return match ? match[1] : undefined;
};

/* ------------------------------------------------------------- prerender */

check(/id="root">\s*<\w/.test(html), 'index.html содержит разметку до запуска скриптов');
check(html.includes('смотрится'), 'заголовок героя есть в статическом HTML');
for (const heading of ['>Каталог<', '>Вопросы<']) {
  check(html.includes(heading), `в HTML есть заголовок ${heading.slice(1, -1)}`);
}
for (const question of [
  'Сколько это стоит?',
  'Нужен ли аккаунт?',
  'Откуда берётся видео?',
  'Можно ли смотреть без сети?',
  'На чём работает?',
  'Когда появится в магазинах?',
]) {
  check(html.includes(question), `пункт FAQ «${question}» в HTML`);
}
check(html.includes('тайтлов в каталоге'), 'цифры каталога в статическом HTML');
check(!/<canvas/i.test(html), 'canvas-фоны монтируются только на клиенте');

/* -------------------------------------------------------------- каркас */

check(/<html lang="ru"/.test(html), 'язык страницы — ru');
check((html.match(/<h1[\s>]/g) ?? []).length === 1, 'ровно один <h1>');
check(/<main[\s>]/.test(html), 'есть <main>');
check(/<header[\s>]/.test(html), 'есть <header>');
check(/<footer[\s>]/.test(html), 'есть <footer>');
check(/<meta name="viewport"/.test(html), 'есть viewport');
check(/<meta name="theme-color"/.test(html), 'есть theme-color');
check(/<title>[^<]{10,}<\/title>/.test(html), 'есть <title>');
check(/<meta[^>]*name="description"[^>]*content="[^"]{60,}"/s.test(html), 'есть осмысленное description');
check(/<script type="module"/.test(html), 'модуль подключён как type=module');
check(/href="\.\/llms\.txt"/.test(html), 'есть ссылка на llms.txt');

/* --------------------------------------------------------------- якоря */

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
check(new Set(ids).size === ids.length, 'идентификаторы не повторяются');
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
const broken = anchors.filter((href) => !ids.includes(href));
check(broken.length === 0, `все внутренние ссылки ведут на существующие id (${anchors.length})`);
for (const href of broken) fail.push(`  ссылка #${href} не находит цель`);

/* -------------------------------------------------------------- картинки */

const imgTags = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
check(imgTags.length > 0 && imgTags.length <= 90, `картинок ${imgTags.length} (бюджет 90)`);

const checked = new Set();
for (const tag of imgTags) {
  const src = attr(tag, 'src');
  const alt = attr(tag, 'alt');
  const width = attr(tag, 'width');
  const height = attr(tag, 'height');

  if (!src) {
    fail.push(`<img> без src: ${tag.slice(0, 80)}`);
    continue;
  }
  if (alt === undefined) fail.push(`<img> без alt: ${src}`);
  if (!width || !height) fail.push(`<img> без width/height: ${src}`);

  const rel = src.replace(/^\.\//, '');
  if (!files.has(rel)) {
    fail.push(`нет файла ${rel}`);
    continue;
  }

  // размеры в разметке обязаны совпадать с настоящими — иначе страница дёргается
  if (rel.endsWith('.webp') && width && height && !checked.has(rel)) {
    checked.add(rel);
    const actual = webpSize(await fs.readFile(path.join(DIST, rel)));
    if (!actual) fail.push(`не читаются размеры ${rel}`);
    else if (actual.width !== Number(width) || actual.height !== Number(height)) {
      fail.push(`${rel}: в разметке ${width}×${height}, в файле ${actual.width}×${actual.height}`);
    }
  }
}

const pictures = (html.match(/<picture[ >]/gi) ?? []).length;
/* React отдаёт атрибут как srcSet: в HTML имена регистронезависимы, но
   регулярка должна это учитывать. */
const avifSources = (html.match(/srcset="\.\/[^"]+\.avif"/gi) ?? []).length;
check(pictures > 0 && pictures === avifSources, `у всех <picture> есть AVIF-источник (${pictures}/${avifSources})`);

for (const pair of ['screens/title', 'screens/home']) {
  check(files.has(`${pair}.avif`) && files.has(`${pair}.webp`), `пара ${pair} — AVIF + WebP`);
}

check((html.match(/fetchpriority="high"/gi) ?? []).length === 1, 'приоритетная картинка ровно одна');

/* ---------------------------------------------------------------- вес */

const htmlSize = gzip(Buffer.from(html));
check(htmlSize <= BUDGET.html, `html ${kb(htmlSize)} (бюджет ${kb(BUDGET.html)})`);

let cssBytes = 0;
let cssPacked = 0;
let cssText = '';
let jsBytes = 0;
let jsPacked = 0;
for (const name of await fs.readdir(ASSETS)) {
  const body = await fs.readFile(path.join(ASSETS, name));
  if (name.endsWith('.css')) {
    cssBytes += body.length;
    cssPacked += gzip(body);
    cssText += body.toString('utf8');
  } else if (name.endsWith('.js')) {
    jsBytes += body.length;
    jsPacked += gzip(body);
  }
}
check(cssPacked <= BUDGET.css, `css ${kb(cssPacked)} (бюджет ${kb(BUDGET.css)})`);
check(jsPacked <= BUDGET.js, `js ${kb(jsPacked)} gzip (бюджет ${kb(BUDGET.js)})`);
note.push(`  ·    css ${kb(cssBytes)} / js ${kb(jsBytes)} в исходнике`);

/* ------------------------------------------------------------- мета/OG */

check(/property="og:image" content="\.\/og\.jpg"/.test(html), 'og:image указывает на JPEG');
check(files.has('og.jpg'), 'og.jpg собран');
if (files.has('og.jpg')) {
  const og = await fs.readFile(path.join(DIST, 'og.jpg'));
  check(og[0] === 0xff && og[1] === 0xd8, 'og.jpg — настоящий JPEG');
  note.push(`  ·    og.jpg ${kb(og.length)}`);
}

for (const rel of ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'robots.txt', 'llms.txt', 'logo.svg']) {
  check(files.has(rel), `на месте ${rel}`);
}

const fonts = [...files].filter((name) => name.endsWith('.woff2'));
check(fonts.length >= 2, `шрифт самохостится (${fonts.length} woff2)`);
check(fonts.some((name) => name.includes('cyrillic')), 'в наборе есть кириллица');

/* ------------------------------------------------------- документы */

const DOC_SLUGS = LEGAL_PAGES.map((doc) => doc.slug);
const docPages = [];
for (const slug of DOC_SLUGS) {
  try {
    docPages.push(await fs.readFile(path.join(DIST, DOCS_DIR, `${slug}.html`), 'utf8'));
  } catch {
    docPages.push('');
  }
}
const docOk = (page) =>
  /id="root">\s*<\w/.test(page) &&
  (page.match(/<h1[\s>]/g) ?? []).length === 1 &&
  /<main[^>]*class="doc"/.test(page) &&
  page.includes('id="doc-contacts"') &&
  page.includes('Связанные документы');
check(
  DOC_SLUGS.every((slug, index) => docOk(docPages[index])),
  `страницы документов предрендерены (${docPages.filter(docOk).length}/${DOC_SLUGS.length})`,
);
check(
  DOC_SLUGS.every((slug) => html.includes(`href="./${DOCS_DIR}/${slug}"`)),
  'футер ссылается на каждый документ',
);
check(
  docPages.every((page) => page.includes('="../../assets/')),
  'документы берут бандл через ../../',
);
check(
  DOC_SLUGS.every((slug) => !files.has(`${slug}.html`)),
  'старых корневых адресов документов нет',
);
check(!docPages.some((page) => page.includes('смотрится просто')), 'документы не несут заголовок героя');

/* ------------------------------------------------------ лента обновлений */

const logSlugs = CHANGELOG.map((entry) => entry.slug);
check(logSlugs.length > 0, 'в ленте есть записи');
check(new Set(logSlugs).size === logSlugs.length, 'slug записей не повторяются');
check(logSlugs.every((slug) => /^[a-z0-9-]+$/.test(slug)), 'slug записей — латиница, цифры и дефис');
check(
  new Set(CHANGELOG.map((entry) => `${entry.date} ${entry.title}`)).size === CHANGELOG.length,
  'нет двух новостей с одной датой и заголовком',
);
check(
  CHANGELOG.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date)),
  'даты записей в формате YYYY-MM-DD',
);
check(
  CHANGELOG.every((entry, index) => index === 0 || CHANGELOG[index - 1].date >= entry.date),
  'записи отсортированы от новых к старым',
);
check(
  CHANGELOG.every((entry) => entry.title && entry.summary && entry.tag),
  'у каждой записи есть заголовок, лид и тег',
);
check(
  CHANGELOG.every((entry) => (entry.blocks.length === 0) === (entry.html.trim() === '')),
  'тело необязательно: html и блоки появляются вместе',
);
check(
  CHANGELOG.every((entry) =>
    entry.blocks.every((block) =>
      block.type === 'img' ? block.width > 0 && block.height > 0 && Boolean(block.alt) : true,
    ),
  ),
  'у картинок тела есть размеры и alt',
);
check(
  CHANGELOG.every(
    (entry) =>
      Array.isArray(entry.buttons) &&
      entry.buttons.every(
        (button) =>
          Boolean(button.label) &&
          ((typeof button.href === 'string' && /^https:\/\//.test(button.href)) ||
            typeof button.app === 'string' && button.app.startsWith('/')),
      ),
  ),
  'кнопки записей: https-ссылка или путь приложения',
);
check(
  CHANGELOG.every(
    (entry) => Array.isArray(entry.platforms) && entry.platforms.every((item) => item === 'ios' || item === 'android'),
  ),
  'platform — только ios/android',
);
check(
  CHANGELOG.every(
    (entry) =>
      entry.appVersion === null ||
      /^(\d+\.\d+\.\d+|\d+\.\d+\.\d+\+|-\d+\.\d+\.\d+|\d+\.\d+\.\d+-\d+\.\d+\.\d+)$/.test(entry.appVersion),
  ),
  'app-version — 1.2.9, 1.2.9+, -1.2.9 или 1.2.9-1.3.4',
);
check(CHANGELOG.every((entry) => typeof entry.close === 'boolean'), 'close — true или false');
check(
  CHANGELOG.every(
    (entry) =>
      !entry.img ||
      (Boolean(entry.img.src) && Boolean(entry.img.alt) && entry.img.width > 0 && entry.img.height > 0),
  ),
  'у картинок записей есть src, alt и размеры',
);
check(
  changelogForPath('/faq/changelog/', CHANGELOG)?.list === true &&
    changelogForPath('/faq/changelog', CHANGELOG)?.list === true &&
    changelogForPath('/app-landing/faq/changelog/', CHANGELOG)?.list === true &&
    changelogForPath(`/faq/changelog/${logSlugs[0]}`, CHANGELOG)?.slug === logSlugs[0] &&
    changelogForPath(`/faq/changelog/${logSlugs[0]}/`, CHANGELOG)?.slug === logSlugs[0] &&
    changelogForPath('/faq/changelog/nope', CHANGELOG) === null &&
    changelogForPath('/faq/docs/terms', CHANGELOG) === null &&
    changelogForPath('/', CHANGELOG) === null,
  'адреса ленты разбираются как список, запись или не наше',
);

const readDist = async (rel) => {
  try {
    return await fs.readFile(path.join(DIST, rel), 'utf8');
  } catch {
    return '';
  }
};

check(files.has(`${CHANGELOG_DIR}/index.html`), 'есть список /faq/changelog/');
check(
  logSlugs.every((slug) => files.has(`${CHANGELOG_DIR}/${slug}.html`)),
  'у каждой записи свой HTML',
);
check(files.has(`${CHANGELOG_DIR}/feed.json`), 'есть фид /faq/changelog/feed.json');
check(
  CHANGELOG.every((entry) => files.has(`${CHANGELOG_DIR}/${entry.slug}/export.md`)),
  'у каждой записи есть <slug>/export.md',
);
check(
  CHANGELOG.every((entry) => !entry.img || files.has(entry.img.src)),
  'картинки записей собраны в dist',
);

const listHtml = await readDist(`${CHANGELOG_DIR}/index.html`);
check(/id="root">\s*<\w/.test(listHtml), 'список ленты предрендерен');
check((listHtml.match(/<h1[\s>]/g) ?? []).length === 1, 'в списке ленты один <h1>');
check(listHtml.includes(LIST_PAGE.title), `в списке ленты заголовок «${LIST_PAGE.title}»`);
check(
  logSlugs.every((slug) => listHtml.includes(`href="./${slug}"`)),
  'список ссылается на каждую запись',
);
check(listHtml.includes('="../../assets/'), 'список ленты берёт бандл через ../../');
check(
  listHtml.includes('class="doc__back log__back"') && listHtml.indexOf('doc__back') > listHtml.indexOf('<main'),
  'в списке ленты ссылка «На главную» стоит над контентом',
);

const entryPages = await Promise.all(
  CHANGELOG.map((entry) => readDist(`${CHANGELOG_DIR}/${entry.slug}.html`)),
);
/** Какие кнопки записи видит сайт: app:/… открываются только в приложении. */
const siteButtons = (entry) => entry.buttons.filter((button) => button.href);

const entryOk = (entry, page) => {
  const buttons = siteButtons(entry);
  const bodyImages = entry.blocks.filter((block) => block.type === 'img');
  return (
    /id="root">\s*<\w/.test(page) &&
    (page.match(/<h1[\s>]/g) ?? []).length === 1 &&
    page.includes(`<title>${entry.title} — hoshi</title>`) &&
    page.includes('class="doc__back log__back"') &&
    page.indexOf('doc__back') > page.indexOf('<main') &&
    page.indexOf('log__back') < page.indexOf('<h1') &&
    page.includes('href="../../faq/changelog/"') &&
    !page.includes('href="../"') &&
    page.includes('="../../assets/') &&
    /* Тело: либо его нет вовсе, либо оно стоит в .log__body. */
    (entry.html.trim()
      ? page.includes('class="doc__section log__body"') && page.includes(entry.html.trim())
      : !page.includes('class="doc__section log__body"')) &&
    (!entry.img || page.includes(`src="../../${entry.img.src}"`)) &&
    /* Кнопки: только https, первая заливкой, остальные контуром. */
    (buttons.length === 0
      ? !page.includes('class="log__ctas"')
      : buttons.every((button) => page.includes(`href="${button.href}"`)) &&
        (page.match(/class="button"/g) ?? []).length >= 1 &&
        (page.match(/class="button button--ghost"/g) ?? []).length === buttons.length - 1) &&
    /* Кнопки приложения и схема не должны попадать на страницу. */
    !page.includes('app:/') &&
    /* Картинки тела: от корня, с размерами, файл лежит в dist. */
    bodyImages.every(
      (image) =>
        page.includes(`src="../../${image.src}"`) &&
        page.includes(`width="${image.width}" height="${image.height}"`) &&
        files.has(image.src),
    )
  );
};
check(
  CHANGELOG.every((entry, index) => entryOk(entry, entryPages[index])),
  `страницы записей предрендерены (${entryPages.filter((page, index) => entryOk(CHANGELOG[index], page)).length}/${CHANGELOG.length})`,
);
check(
  CHANGELOG.every((entry) => entryPages[logSlugs.indexOf(entry.slug)]?.includes(entry.summary)),
  'лид записи есть в её HTML',
);

const exportCopies = await Promise.all(
  CHANGELOG.map(async (entry) => {
    try {
      const [source, exported] = await Promise.all([
        fs.readFile(path.join(MD_DIR, entry.source), 'utf8'),
        fs.readFile(path.join(DIST, CHANGELOG_DIR, entry.slug, 'export.md'), 'utf8'),
      ]);
      return source === exported;
    } catch {
      return false;
    }
  }),
);
check(exportCopies.every(Boolean), 'export.md — побайтная копия исходного .md');

/* Размеры картинки читаются из файла на сборке — сверяем с тем, что попало
   в разметку: по ним страница держит место и не дёргается. */
for (const entry of CHANGELOG) {
  if (!entry.img) continue;
  const actual = imageSize(await fs.readFile(path.join(DIST, entry.img.src)), entry.img.src);
  check(
    Boolean(actual) && actual.width === entry.img.width && actual.height === entry.img.height,
    `картинка ${entry.img.src} совпадает по размерам`,
  );
}

let feed = null;
try {
  feed = JSON.parse(await readDist(`${CHANGELOG_DIR}/feed.json`));
} catch {
  feed = null;
}
check(Boolean(feed), 'фид ленты парсится как JSON');

/** В фиде только маршрут: контент приложение берёт из <slug>/export.json. */
const ROUTER_KEYS = ['slug', 'date', 'tag', 'title', 'summary', 'url', 'content'];
const OPTIONAL_KEYS = new Set(['platforms', 'appVersion']);
const feedKeysOk = (entry) => {
  const keys = Object.keys(entry);
  return ROUTER_KEYS.every((key) => key in entry) && keys.every((key) => ROUTER_KEYS.includes(key) || OPTIONAL_KEYS.has(key));
};

const exportJson = await Promise.all(
  CHANGELOG.map(async (entry) => {
    try {
      return JSON.parse(await readDist(`${CHANGELOG_DIR}/${entry.slug}/export.json`));
    } catch {
      return null;
    }
  }),
);
check(
  exportJson.every((content) => content && content.v === 1),
  'export.json есть у каждой записи и имеет v: 1',
);
check(
  exportJson.every(
    (content) =>
      Array.isArray(content.blocks) &&
      content.blocks.every((block) =>
        block.type === 'img'
          ? /^https:\/\/.+/.test(block.src) && block.width > 0 && block.height > 0 && Boolean(block.alt)
          : true,
      ),
  ),
  'картинки тела в export.json абсолютные, с размерами и alt',
);
check(
  exportJson.every((content, index) => {
    const entry = CHANGELOG[index];
    return (
      content.close === entry.close &&
      Boolean(content.note === entry.note) &&
      JSON.stringify(content.buttons) === JSON.stringify(entry.buttons) &&
      content.blocks.length === entry.blocks.length &&
      (content.img === null) === (entry.img === null)
    );
  }),
  'export.json повторяет шапку, кнопки и блоки записи',
);

if (feed) {
  check(/^[0-9a-f]{12}$/.test(String(feed.version)), 'version фида — 12 hex-символов');
  check(/^https:\/\//.test(String(feed.site)), 'site фида — абсолютный https');
  check(feed.listUrl === `${feed.site}/${CHANGELOG_DIR}/`, 'listUrl указывает на /faq/changelog/');
  check(
    Array.isArray(feed.entries) && feed.entries.length === CHANGELOG.length,
    `в фиде ${feed.entries?.length ?? 0} записей (ожидалось ${CHANGELOG.length})`,
  );
  check(
    (feed.entries ?? []).every(feedKeysOk),
    'в фиде только маршрут: slug, date, tag, title, summary, url, content (+platforms/appVersion)',
  );
  check(
    (feed.entries ?? []).every(
      (entry) =>
        entry.url === `${feed.site}/${CHANGELOG_DIR}/${entry.slug}` &&
        entry.content === `${feed.site}/${CHANGELOG_DIR}/${entry.slug}/export.json` &&
        files.has(`${CHANGELOG_DIR}/${entry.slug}/export.json`),
    ),
    'url и content записей абсолютные и указывают на собранные файлы',
  );
  check(
    (feed.entries ?? []).every((entry) => entry.title && entry.summary && entry.tag && entry.date),
    'у записей в фиде есть дата, тег, заголовок и лид',
  );
  check(
    (feed.entries ?? []).every((entry) => {
      const source = CHANGELOG.find((item) => item.slug === entry.slug);
      return (
        JSON.stringify(entry.platforms ?? []) === JSON.stringify(source?.platforms ?? []) &&
        (entry.appVersion ?? null) === (source?.appVersion ?? null)
      );
    }),
    'platforms/appVersion в фиде совпадают с новостью',
  );
  const expectedActual = CHANGELOG.filter((entry) => entry.actual)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug))
    .map((entry) => entry.slug);
  check(
    Array.isArray(feed.actual) &&
      feed.actual.map((entry) => entry.slug).join(',') === expectedActual.join(','),
    'actual — актуальные записи, от старых к новым',
  );
  check((feed.actual ?? []).every(feedKeysOk), 'в actual только поля-маршруты');
  check(
    (feed.entries ?? []).every((entry) => !('md' in entry) && !('body' in entry) && !('promo' in entry)),
    'в фиде нет md/body/promo: контент — в export.json',
  );
  check(!/<[a-z][^>]*>/i.test(JSON.stringify(feed)), 'в фиде нет HTML');
}
check(html.includes('href="./faq/changelog/"'), 'футер лендинга ссылается на ленту');

/* -------------------------------------------------------------------- 404 */

check(files.has('404.html'), 'есть 404.html');
const notFoundHtml = await readDist('404.html');
check(/id="root">\s*<\w/.test(notFoundHtml), '404 предрендерена');
check((notFoundHtml.match(/<h1[\s>]/g) ?? []).length === 1, 'на 404 один <h1>');
check(notFoundHtml.includes(`<title>${NOT_FOUND.title} — hoshi</title>`), 'у 404 свой <title>');
check(notFoundHtml.includes('data-page="404"'), '404 помечена для клиента');
check(/<meta\s+name="robots"[^>]*content="noindex"/.test(notFoundHtml), '404 закрыта от индексации');
check(
  notFoundHtml.includes('href="/"') && notFoundHtml.includes('href="/faq/changelog/"'),
  '404 ведёт на главную и в ленту',
);
check(notFoundHtml.includes('href="/assets/'), '404 берёт бандл от корня');
check(!/="(\.\.\/|\.\/)/.test(notFoundHtml), '404 не использует относительные пути');

/* ---------------------------------------------------------- доступность */

check(/<a class="skip" href="#main"/.test(html), 'есть skip-link');
check(/<details[^>]*name="faq"/.test(html), 'FAQ на нативном <details name>');
check((html.match(/name="faq"/g) ?? []).length === 6, 'шесть пунктов FAQ в одной группе');
check((html.match(/<summary/g) ?? []).length === 6, 'у шести вопросов есть <summary>');
check(/prefers-reduced-motion/.test(cssText), 'в CSS есть режим prefers-reduced-motion');

/* ---------------------------------------------------------------- итог */

let total = 0;
for (const rel of files) total += (await fs.stat(path.join(DIST, rel))).size;

console.log('verify: dist/');
for (const line of note) console.log(line);
console.log(`  ·    всего в сборке ${files.size} файлов, ${kb(total)}`);

if (fail.length) {
  console.error(`\nverify: провалено ${fail.length}`);
  for (const message of fail) console.error(`  - ${message}`);
  process.exit(1);
}
console.log('\nverify: всё в порядке');
