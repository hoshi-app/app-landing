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
import { CHANGELOG, CHANGELOG_DIR, FEED_LIMIT, LIST_PAGE, changelogForPath } from '../site/src/data/changelog.js';
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

function webpSize(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const type = buffer.toString('ascii', 12, 16);
  if (type === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (type === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (type === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

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
  CHANGELOG.every((entry) => Array.isArray(entry.body) && entry.body.length > 0),
  'у каждой записи есть текст',
);
check(
  CHANGELOG.every((entry) => !entry.until || entry.until >= entry.date),
  'until не раньше даты записи',
);
check(
  CHANGELOG.every((entry) => !entry.cta || /^https:\/\//.test(entry.cta.url)),
  'кнопки записей ведут на https',
);
check(
  CHANGELOG.every(
    (entry) =>
      !entry.cover ||
      (Boolean(entry.cover.src) && Boolean(entry.cover.alt) && entry.cover.width > 0 && entry.cover.height > 0),
  ),
  'у обложек есть src, alt и размеры',
);
check(
  CHANGELOG.every(
    (entry) =>
      !entry.logo ||
      (Boolean(entry.logo.src) && Boolean(entry.logo.alt) && entry.logo.width > 0 && entry.logo.height > 0),
  ),
  'у круглых знаков есть src, alt и размеры',
);
check(
  CHANGELOG.every(
    (entry) =>
      !entry.channel ||
      (/^https:\/\//.test(entry.channel.url) && Boolean(entry.channel.label) && Boolean(entry.channel.handle)),
  ),
  'у карточек каналов есть подпись, адрес и https-ссылка',
);
check(
  changelogForPath('/faq/changelog/')?.list === true &&
    changelogForPath('/faq/changelog')?.list === true &&
    changelogForPath('/app-landing/faq/changelog/')?.list === true &&
    changelogForPath(`/faq/changelog/${logSlugs[0]}`)?.slug === logSlugs[0] &&
    changelogForPath(`/faq/changelog/${logSlugs[0]}/`)?.slug === logSlugs[0] &&
    changelogForPath('/faq/changelog/nope') === null &&
    changelogForPath('/faq/docs/terms') === null &&
    changelogForPath('/') === null,
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
  CHANGELOG.every((entry) => !entry.logo || files.has(entry.logo.src)),
  'круглые знаки записей собраны в dist',
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
const entryOk = (entry, page) =>
  /id="root">\s*<\w/.test(page) &&
  (page.match(/<h1[\s>]/g) ?? []).length === 1 &&
  page.includes(`<title>${entry.title} — hoshi</title>`) &&
  page.includes('class="doc__back log__back"') &&
  page.indexOf('doc__back') > page.indexOf('<main') &&
  page.indexOf('log__back') < page.indexOf('<h1') &&
  page.includes('href="../../faq/changelog/"') &&
  !page.includes('href="../"') &&
  page.includes('="../../assets/') &&
  (!entry.cover || page.includes(`src="../../${entry.cover.src}"`)) &&
  (!entry.logo || page.includes(`src="../../${entry.logo.src}"`)) &&
  (!entry.channel || page.includes(`href="${entry.channel.url}"`));
check(
  CHANGELOG.every((entry, index) => entryOk(entry, entryPages[index])),
  `страницы записей предрендерены (${entryPages.filter((page, index) => entryOk(CHANGELOG[index], page)).length}/${CHANGELOG.length})`,
);
check(
  CHANGELOG.every((entry) => entryPages[logSlugs.indexOf(entry.slug)]?.includes(entry.summary)),
  'лид записи есть в её HTML',
);

let feed = null;
try {
  feed = JSON.parse(await readDist(`${CHANGELOG_DIR}/feed.json`));
} catch {
  feed = null;
}
check(Boolean(feed), 'фид ленты парсится как JSON');
if (feed) {
  check(/^[0-9a-f]{12}$/.test(String(feed.version)), 'version фида — 12 hex-символов');
  check(/^https:\/\//.test(String(feed.site)), 'site фида — абсолютный https');
  check(feed.listUrl === `${feed.site}/${CHANGELOG_DIR}/`, 'listUrl указывает на /faq/changelog/');
  check(
    Array.isArray(feed.entries) && feed.entries.length === Math.min(FEED_LIMIT, CHANGELOG.length),
    `в фиде ${feed.entries?.length ?? 0} записей (ожидалось ${Math.min(FEED_LIMIT, CHANGELOG.length)})`,
  );
  check(
    (feed.entries ?? []).every(
      (entry) => entry.url === `${feed.site}/${CHANGELOG_DIR}/${entry.slug}`,
    ),
    'url записей в фиде абсолютные и совпадают со slug',
  );
  check(
    (feed.entries ?? []).every((entry) => entry.title && entry.summary && entry.tag && entry.date),
    'у записей в фиде есть дата, тег, заголовок и лид',
  );
  check(
    (feed.promo?.slug ?? null) === (CHANGELOG.find((entry) => entry.promo === true)?.slug ?? null),
    'promo в фиде — самая свежая запись с promo',
  );
  check(
    (feed.entries ?? []).every(
      (entry) =>
        !entry.cover ||
        (files.has(entry.cover.url.slice(`${feed.site}/`.length)) &&
          Boolean(entry.cover.alt) &&
          entry.cover.width > 0 &&
          entry.cover.height > 0),
    ),
    'обложки в фиде указывают на существующие файлы',
  );
  for (const entry of feed.entries ?? []) {
    const cover = entry.cover;
    if (!cover || !cover.url.endsWith('.webp')) continue;
    const rel = cover.url.slice(`${feed.site}/`.length);
    const actual = webpSize(await fs.readFile(path.join(DIST, rel)));
    check(
      Boolean(actual) && actual.width === cover.width && actual.height === cover.height,
      `обложка ${rel} совпадает по размерам`,
    );
  }
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
