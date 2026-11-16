/**
 * changelog.mjs — единственное место, где новости читаются с диска.
 *
 *   site/src/data/changelog/<slug>.md   один файл — одна новость
 *   tools/changelog.mjs                 парсер и сборка данных из этих файлов
 *
 * Файл начинается с front-matter (плоский YAML: «ключ: значение»), дальше —
 * необязательный markdown. Из одного файла получаются страница на сайте, её
 * побайтная копия `<slug>/export.md` (для людей), структурированный
 * `<slug>/export.json` (его рисует приложение) и строка в feed.json.
 *
 * Парсер markdown здесь один на всю систему: marked на сборке. Приложение
 * получает уже готовые блоки и разметку не разбирает — так сайт и сплэш не
 * могут разъехаться в форматировании.
 *
 * Правила намеренно строгие: неизвестное поле, дубликат, кривая дата, ссылка
 * или неподдерживаемая разметка роняют сборку. Опечатка в новости не должна
 * тихо превращаться в пустой сплэш.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { imageSize } from './image-size.mjs';
import {
  CHANGELOG_DIR,
  LIST_PAGE,
  changelogForPath,
  changelogHref,
  dateLabel,
} from '../site/src/data/changelog-config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Каталог с новостями: один .md — одна запись. */
export const MD_DIR = path.join(ROOT, 'site/src/data/changelog');

/** Статика сайта: картинки новостей подключаются путём от её корня. */
const PUBLIC_DIR = path.join(ROOT, 'site/public');

/* Общие правила отдаём наружу: сборка и проверки импортируют их отсюда. */
export { CHANGELOG_DIR, LIST_PAGE, changelogForPath, changelogHref, dateLabel };

/** Поля front-matter. Неизвестное поле — ошибка: опечатка не должна проходить молча. */
const KEYS = new Set([
  'title',
  'date',
  'tag',
  'summary',
  'img',
  'img-alt',
  'button',
  'platform',
  'app-version',
  'close',
  'note',
  'actual',
]);

/** Поля, которые можно писать несколько раз: каждое значение — ещё одна запись. */
const REPEATABLE = new Set(['button']);

const REQUIRED = ['title', 'date', 'tag', 'summary'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const HTTPS_RE = /^https:\/\//;
const IMAGE_PATH_RE = /^[a-z0-9][a-z0-9._/-]*$/i;
const IMAGE_EXT_RE = /\.(svg|png|jpe?g|webp|gif)$/i;
const APP_PREFIX = 'app:/';
const MAX_BUTTON_LABEL = 48;

/* Пути, которые приложение умеет открывать (см. linking в App.tsx). Список
   продублирован только для валидации: сама навигация в приложении идёт по
   тому же конфигу, отдельной таблицы путей у него нет. */
const APP_PATHS = [
  /^release\/\d+$/,
  /^watch\/\d+(?:\/\d+)?$/,
  /^character\/\d+$/,
  /^person\/\d+$/,
  /^search(?:\/[^/\s]+)?$/,
  /^(?:watchlist|profile|settings|downloads)$/,
];

const fail = (file, message) => {
  throw new Error(`changelog: ${file}: ${message}`);
};

/** Разрезает файл на front-matter и тело. Тело необязательно: хватает шапки. */
function parseFrontMatter(source, file) {
  const text = source.replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) fail(file, 'первая строка должна быть «---» (front-matter)');

  const close = text.indexOf('\n---\n', 4);
  if (close < 0) fail(file, 'front-matter не закрыт строкой «---»');

  const head = text.slice(4, close);
  const body = text.slice(close + 5).trim();

  const data = {};
  for (const [index, line] of head.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^([a-z][a-z0-9-]*):(.*)$/);
    if (!match) fail(file, `строка ${index + 2}: ожидалось «ключ: значение»`);

    const [, key, raw] = match;
    if (!KEYS.has(key)) fail(file, `неизвестное поле «${key}» — опечатка?`);
    const value = raw.trim().replace(/^"(.*)"$/s, '$1');

    if (REPEATABLE.has(key)) {
      (data[key] ??= []).push(value);
    } else {
      if (key in data) fail(file, `поле «${key}» задано дважды`);
      data[key] = value;
    }
  }

  return { data, body };
}

/* -------------------------------------------------------------- страница */

const escHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Картинка новости: путь от корня site/public; размеры читаются из файла. */
async function readImage(src, file) {
  if (!IMAGE_PATH_RE.test(src) || src.includes('..') || src.startsWith('/')) {
    fail(file, `картинка «${src}» — путь от корня site/public, без «..» и схемы`);
  }
  if (!IMAGE_EXT_RE.test(src)) {
    fail(file, `картинка «${src}»: поддерживаются svg, png, jpg, webp и gif`);
  }

  let buffer;
  try {
    buffer = await fs.readFile(path.join(PUBLIC_DIR, src));
  } catch {
    fail(file, `нет файла site/public/${src}`);
  }
  const size = imageSize(buffer, src);
  if (!size) fail(file, `не читаются размеры site/public/${src}`);

  return { src, width: size.width, height: size.height };
}

/** Картинка-герой: путь и alt — только вместе. */
async function heroImage(data, file) {
  const src = data.img;
  const alt = data['img-alt'];

  if (!src) {
    if (alt !== undefined) fail(file, '«img-alt» задан без «img»');
    return null;
  }
  if (!alt) fail(file, '«img-alt» обязателен вместе с «img»');
  return { ...(await readImage(src, file)), alt };
}

/* --------------------------------------------------------------- блоки */

/** Инлайн-токены → раны: текст с флагами стиля и ссылкой. */
function buildRuns(tokens, file) {
  const runs = [];
  const push = (run) => {
    const last = runs[runs.length - 1];
    if (
      last &&
      last.text &&
      run.text &&
      !!last.bold === !!run.bold &&
      !!last.italic === !!run.italic &&
      !!last.code === !!run.code &&
      !!last.strike === !!run.strike &&
      (last.href ?? null) === (run.href ?? null)
    ) {
      last.text += run.text;
      return;
    }
    runs.push(run);
  };

  const add = (list, style) => {
    for (const run of list) push({ ...run, ...style });
  };

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.tokens?.length) add(buildRuns(token.tokens, file), {});
        else if (token.text) push({ text: token.text });
        break;
      case 'escape':
        push({ text: token.text });
        break;
      case 'strong':
        add(buildRuns(token.tokens, file), { bold: true });
        break;
      case 'em':
        add(buildRuns(token.tokens, file), { italic: true });
        break;
      case 'del':
        add(buildRuns(token.tokens, file), { strike: true });
        break;
      case 'codespan':
        push({ text: token.text, code: true });
        break;
      case 'link': {
        if (!HTTPS_RE.test(String(token.href))) {
          fail(file, `ссылка «${token.raw}» — только https://`);
        }
        add(buildRuns(token.tokens, file), { href: token.href });
        break;
      }
      case 'br':
        fail(file, 'перенос строки внутри абзаца — разделите текст на два абзаца');
        break;
      case 'image':
        fail(file, `картинка «${token.raw}» — только отдельным абзацем, без текста рядом`);
        break;
      case 'html':
        fail(file, `HTML «${token.raw.slice(0, 40)}» — в новости нельзя`);
        break;
      default:
        fail(file, `«${token.type}» во вложенной разметке — не поддерживается`);
    }
  }
  return runs;
}

/** Параграф, состоящий только из картинки: аттрибуты и alt. */
function onlyImage(token) {
  const parts = token.tokens.filter((item) => item.type !== 'space');
  return parts.length === 1 && parts[0].type === 'image' ? parts[0] : null;
}

const BLOCK_HINT = 'поддерживаются абзацы, ##/###, списки, цитата, --- и картинки';

/** Блоки тела: та же структура, что видит приложение. */
function buildBlocks(tokens, file) {
  const blocks = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break;
      case 'hr':
        blocks.push({ type: 'hr' });
        break;
      case 'heading':
        if (token.depth !== 2 && token.depth !== 3) {
          fail(file, `заголовок «${token.raw.slice(0, 40)}» — только ## или ###`);
        }
        blocks.push({ type: 'h', level: token.depth, runs: buildRuns(token.tokens, file) });
        break;
      case 'paragraph': {
        const image = onlyImage(token);
        if (image) {
          const alt = (image.text ?? '').trim();
          if (!alt) fail(file, 'у картинки тела должен быть alt: ![alt](path)');
          blocks.push({ type: 'img', src: image.href, alt });
          break;
        }
        blocks.push({ type: 'p', runs: buildRuns(token.tokens, file) });
        break;
      }
      case 'list': {
        const items = token.items.map((item) => {
          if (item.task) fail(file, 'чекбоксы в списке — в новости нельзя');
          if (item.tokens.some((child) => child.type === 'list')) {
            fail(file, 'вложенные списки не поддерживаются — сделайте отдельный список');
          }
          const parts = item.tokens.filter((child) => child.type !== 'space');
          if (parts.length > 1) {
            fail(file, 'пункт списка — один абзац; для двух абзацев сделайте отдельный список');
          }
          const child = parts[0];
          if (!child) return [];
          if (child.type === 'paragraph') return buildRuns(child.tokens, file);
          if (child.type === 'text') return buildRuns(child.tokens ?? [child], file);
          fail(file, `«${child.type}» внутри пункта списка — не поддерживается`);
        });
        blocks.push({ type: token.ordered ? 'ol' : 'ul', items });
        break;
      }
      case 'blockquote': {
        const parts = token.tokens.filter((item) => item.type !== 'space');
        if (parts.length !== 1 || parts[0].type !== 'paragraph') {
          fail(file, 'цитата — один абзац; несколько абзацев оформите отдельными цитатами');
        }
        blocks.push({ type: 'quote', runs: buildRuns(parts[0].tokens, file) });
        break;
      }
      default:
        fail(file, `«${token.type}» в тексте — ${BLOCK_HINT}`);
    }
  }
  return blocks;
}

/** HTML тела: marked + свои image/link. Размеры картинок уже известны. */
function renderHtml(tokens, imageMap, file) {
  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    renderer: {
      image(token) {
        const image = imageMap.get(token.href);
        if (!image) fail(file, `картинка «${token.href}» не разобрана`);
        return (
          `<img src="../../${escHtml(image.src)}" width="${image.width}" height="${image.height}"` +
          ` alt="${escHtml(image.alt)}" loading="lazy" decoding="async">`
        );
      },
      link(token) {
        const inner = this.parser.parseInline(token.tokens);
        return `<a href="${escHtml(token.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      },
    },
  });
  return md.parser(tokens);
}

/** Страховка: в HTML не должно появиться ничего, чего не умеет приложение. */
const HTML_TAGS = new Set([
  'p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'strong', 'em', 'code', 'del', 'a', 'img',
]);
function checkHtml(html, file) {
  for (const match of html.matchAll(/<\/?([a-z][a-z0-9]*)/gi)) {
    const tag = match[1].toLowerCase();
    if (!HTML_TAGS.has(tag)) fail(file, `тег <${tag}> в тексте — ${BLOCK_HINT}`);
  }
}

/* ------------------------------------------------------------ front-matter */

/**
 * Кнопки действия: строка «Подпись | адрес» на кнопку, ключ можно повторять.
 * Адрес — https-ссылка или `app:/путь` (раздел приложения). Порядок строк
 * задаёт порядок кнопок: первая видимая — заливка, остальные контур.
 */
function buttons(data, file) {
  return (data.button ?? []).map((line, index) => {
    const where = `button ${index + 1}`;
    const parts = line.split('|');
    if (parts.length !== 2) fail(file, `${where}: ожидалось «Подпись | https://…» или «Подпись | app:/…»`);

    const label = parts[0].trim();
    const value = parts[1].trim();
    if (!label) fail(file, `${where}: пустая подпись`);
    if (label.length > MAX_BUTTON_LABEL) {
      fail(file, `${where}: подпись длиннее ${MAX_BUTTON_LABEL} символов`);
    }

    if (HTTPS_RE.test(value)) return { label, href: value };

    if (value.startsWith(APP_PREFIX)) {
      const appPath = value.slice(APP_PREFIX.length).replace(/^\/+/, '');
      if (!APP_PATHS.some((re) => re.test(appPath))) {
        fail(file, `${where}: «${appPath}» — неизвестный раздел приложения`);
      }
      return { label, app: `/${appPath}` };
    }

    fail(file, `${where}: адрес — https://… или app:/…, получено «${value}»`);
  });
}

/** Платформа: `ios`, `android` или оба; без поля — везде. */
function platforms(data, file) {
  const raw = data.platform;
  if (raw === undefined) return [];
  const list = raw.split(',').map((item) => item.trim()).filter(Boolean);
  if (!list.length) fail(file, 'platform: пусто — перечислите ios и/или android');

  const out = [];
  for (const item of list) {
    if (item !== 'ios' && item !== 'android') {
      fail(file, `platform: «${item}» — допустимо только ios и android`);
    }
    if (!out.includes(item)) out.push(item);
  }
  return out.length === 2 ? [] : out;
}

/** Версия: только числа в трёх сегментах, диапазоны включительные. */
const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}

function appVersion(data, file) {
  const raw = data['app-version'];
  if (raw === undefined) return null;
  const value = raw.trim();

  if (VERSION_RE.test(value)) return value;
  if (/^\d+\.\d+\.\d+\+$/.test(value)) return value;
  if (/^-\d+\.\d+\.\d+$/.test(value)) return value;

  if (value.includes('-')) {
    const [from, to, ...rest] = value.split('-');
    if (!rest.length && VERSION_RE.test(from) && VERSION_RE.test(to)) {
      if (compareVersions(from, to) > 0) {
        fail(file, `app-version: ${value} — начало диапазона больше конца`);
      }
      return value;
    }
  }

  fail(file, `app-version: «${value}» — ожидалось 1.2.9, 1.2.9+, -1.2.9 или 1.2.9-1.3.4`);
}

/** close: false убирает нижнюю кнопку «Закрыть» (крестик остаётся). */
function closeFlag(data, file) {
  const value = data.close;
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(file, '«close» — true или false');
}

/** actual по умолчанию true: каждая новость достойна сплэша, пока её не сняли. */
function actual(data, file) {
  const value = data.actual;
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(file, '«actual» — true или false');
}

function isoDate(value, file) {
  if (!DATE_RE.test(value)) fail(file, 'date — YYYY-MM-DD');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(file, `date: ${value} — несуществующая дата`);
  }
  return value;
}

/* ---------------------------------------------------------------- запись */

/** Один файл → одна запись. slug берётся из имени файла, отдельного поля нет. */
export async function parseEntry(source, filename) {
  const slug = path.basename(filename, '.md');
  if (!SLUG_RE.test(slug)) {
    fail(filename, `имя файла — это slug: только латиница, цифры и дефис (${slug})`);
  }

  const { data, body } = parseFrontMatter(source, filename);
  for (const key of REQUIRED) {
    if (!data[key]) fail(filename, `нет обязательного поля «${key}»`);
  }

  let html = '';
  let blocks = [];
  if (body) {
    const md = new Marked({ gfm: true, breaks: false });
    const tokens = md.lexer(body);
    blocks = buildBlocks(tokens, filename);

    const imageMap = new Map();
    for (const block of blocks) {
      if (block.type !== 'img') continue;
      Object.assign(block, await readImage(block.src, filename));
      imageMap.set(block.src, block);
    }

    html = renderHtml(tokens, imageMap, filename);
    checkHtml(html, filename);
  }

  const range = appVersion(data, filename);

  return {
    slug,
    source: filename,
    date: isoDate(data.date, filename),
    tag: data.tag,
    title: data.title,
    summary: data.summary,
    /* HTML собирается заранее: браузеру не нужен markdown-парсер, а сервер и
       клиент получают одну и ту же строку — гидратация не расходится. */
    html,
    /* Блоки — то же тело для приложения: export.json, без повторного разбора. */
    blocks,
    img: await heroImage(data, filename),
    buttons: buttons(data, filename),
    platforms: platforms(data, filename),
    appVersion: range,
    close: closeFlag(data, filename),
    note: data.note || null,
    actual: actual(data, filename),
  };
}

/**
 * Читает каталог новостей. Возвращает записи от новых к старым и пути файлов
 * (по ним Vite watches за изменениями, а сборка копирует export.md).
 */
export async function loadChangelog() {
  let names;
  try {
    names = await fs.readdir(MD_DIR);
  } catch {
    throw new Error(`changelog: нет каталога ${path.relative(ROOT, MD_DIR)}`);
  }

  const files = names.filter((name) => name.endsWith('.md')).sort();
  if (!files.length) throw new Error(`changelog: в ${path.relative(ROOT, MD_DIR)} нет ни одного .md`);

  const entries = [];
  const seen = new Set();
  for (const name of files) {
    const entry = await parseEntry(await fs.readFile(path.join(MD_DIR, name), 'utf8'), name);
    if (seen.has(entry.slug)) fail(name, `slug «${entry.slug}» уже занят другим файлом`);
    seen.add(entry.slug);
    entries.push(entry);
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return { entries, files: files.map((name) => path.join(MD_DIR, name)) };
}
