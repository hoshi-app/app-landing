/**
 * changelog.mjs — единственное место, где новости читаются с диска.
 *
 *   site/src/data/changelog/<slug>.md   один файл — одна новость
 *   tools/changelog.mjs                 парсер и сборка данных из этих файлов
 *
 * Файл начинается с front-matter (плоский YAML: «ключ: значение»), дальше —
 * обычный markdown. Из одного файла получаются страница на сайте, её копия
 * `<slug>/export.md` для приложения и строка в feed.json. Разметка страницы
 * живёт отдельно (site/src/sections/Changelog.jsx), здесь только данные.
 *
 * Правила намеренно строгие: неизвестное поле, дубликат, кривая дата или
 * ссылка роняют сборку. Опечатка в новости не должна тихо превращаться в
 * пустую карточку в приложении.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
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

/* Общие правила отдаём наружу: сборка и проверки импортируют их отсюда. */
export { CHANGELOG_DIR, LIST_PAGE, changelogForPath, changelogHref, dateLabel };

/** Поля front-matter. Неизвестное поле — ошибка: опечатка не должна проходить молча. */
const KEYS = new Set([
  'title',
  'date',
  'tag',
  'summary',
  'logo',
  'logo-alt',
  'logo-width',
  'logo-height',
  'cover',
  'cover-alt',
  'cover-width',
  'cover-height',
  'channel-label',
  'channel-handle',
  'channel-url',
  'cta-label',
  'cta-url',
  'note',
  'actual',
]);

const REQUIRED = ['title', 'date', 'tag', 'summary'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const HTTPS_RE = /^https:\/\//;

const fail = (file, message) => {
  throw new Error(`changelog: ${file}: ${message}`);
};

/** Разрезает файл на front-matter и тело. Тело пустым не бывает: новость — это текст. */
function parseFrontMatter(source, file) {
  const text = source.replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) fail(file, 'первая строка должна быть «---» (front-matter)');

  const close = text.indexOf('\n---\n', 4);
  if (close < 0) fail(file, 'front-matter не закрыт строкой «---»');

  const head = text.slice(4, close);
  const body = text.slice(close + 5).trim();
  if (!body) fail(file, 'пустое тело: после front-matter нет текста');

  const data = {};
  for (const [index, line] of head.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^([a-z][a-z0-9-]*):(.*)$/);
    if (!match) fail(file, `строка ${index + 2}: ожидалось «ключ: значение»`);

    const [, key, raw] = match;
    if (!KEYS.has(key)) fail(file, `неизвестное поле «${key}» — опечатка?`);
    if (key in data) fail(file, `поле «${key}» задано дважды`);
    data[key] = raw.trim().replace(/^"(.*)"$/s, '$1');
  }

  return { data, body };
}

/** Целое положительное число из front-matter или null, если поле не задано. */
function dimension(data, key, file) {
  const value = data[key];
  if (value === undefined) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) fail(file, `«${key}» — целое число больше нуля`);
  return number;
}

/** Картинка: src, alt и размеры — либо ничего. Размеры нужны, чтобы страница не дёргалась. */
function image(data, prefix, file) {
  const src = data[prefix];
  const alt = data[`${prefix}-alt`];
  const width = dimension(data, `${prefix}-width`, file);
  const height = dimension(data, `${prefix}-height`, file);

  if (!src) {
    if (alt !== undefined || width !== null || height !== null) {
      fail(file, `«${prefix}-*» заданы без «${prefix}»`);
    }
    return null;
  }

  if (!alt) fail(file, `«${prefix}-alt» обязателен вместе с «${prefix}»`);
  if (!width || !height) {
    fail(file, `«${prefix}-width» и «${prefix}-height» обязательны вместе с «${prefix}»`);
  }
  return { src, width, height, alt };
}

/** Карточка канала: подпись, адрес для чтения и ссылка — все три или ничего. */
function channel(data, file) {
  const label = data['channel-label'];
  const handle = data['channel-handle'];
  const url = data['channel-url'];

  if (!label && !handle && !url) return null;
  if (!label || !handle || !url) {
    fail(file, 'карточка канала требует channel-label, channel-handle и channel-url');
  }
  if (!HTTPS_RE.test(url)) fail(file, 'channel-url должен начинаться с https://');
  return { label, handle, url };
}

/** Кнопка действия: подпись и https-ссылка — обе или ничего. */
function cta(data, file) {
  const label = data['cta-label'];
  const url = data['cta-url'];

  if (!label && !url) return null;
  if (!label || !url) fail(file, 'кнопка требует cta-label и cta-url');
  if (!HTTPS_RE.test(url)) fail(file, 'cta-url должен начинаться с https://');
  return { label, url };
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

/** Один файл → одна запись. slug берётся из имени файла, отдельного поля нет. */
function parseEntry(source, filename) {
  const slug = path.basename(filename, '.md');
  if (!SLUG_RE.test(slug)) {
    fail(filename, `имя файла — это slug: только латиница, цифры и дефис (${slug})`);
  }

  const { data, body } = parseFrontMatter(source, filename);
  for (const key of REQUIRED) {
    if (!data[key]) fail(filename, `нет обязательного поля «${key}»`);
  }

  return {
    slug,
    source: filename,
    date: isoDate(data.date, filename),
    tag: data.tag,
    title: data.title,
    summary: data.summary,
    /* HTML собирается заранее: браузеру не нужен markdown-парсер, а сервер и
       клиент получают одну и ту же строку — гидратация не расходится. */
    html: marked.parse(body, { gfm: true, breaks: false }),
    logo: image(data, 'logo', filename),
    cover: image(data, 'cover', filename),
    channel: channel(data, filename),
    cta: cta(data, filename),
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
    const entry = parseEntry(await fs.readFile(path.join(MD_DIR, name), 'utf8'), name);
    if (seen.has(entry.slug)) fail(name, `slug «${entry.slug}» уже занят другим файлом`);
    seen.add(entry.slug);
    entries.push(entry);
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return { entries, files: files.map((name) => path.join(MD_DIR, name)) };
}
