/**
 * changelog.js — данные ленты для страницы.
 *
 * Сами новости лежат в site/src/data/changelog/*.md: один файл — одна новость.
 * tools/changelog.mjs разбирает их на сборке, а Vite отдаёт готовый массив через
 * `virtual:changelog` — с уже собранным HTML. Markdown-парсер в браузер не едет.
 *
 * Здесь остаются только выборки и ссылки; разметка — в sections/Changelog.jsx.
 */
import entries from 'virtual:changelog';
import {
  CHANGELOG_DIR,
  LIST_PAGE,
  changelogForPath as resolveChangelog,
  changelogHref,
  dateLabel,
} from './changelog-config.js';

export { CHANGELOG_DIR, LIST_PAGE, changelogHref, dateLabel };

/** Все записи, новые сверху: порядок задаёт loadChangelog(). */
export const CHANGELOG = entries;

/** Что рисовать на адресе: список, запись или ничего. */
export const changelogForPath = (pathname) => resolveChangelog(pathname, CHANGELOG);
