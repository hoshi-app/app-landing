/**
 * changelog-config.js — общие правила ленты: адрес, заголовок списка, формат даты
 * и разбор пути. Файл лежит в site/, поэтому его безопасно тянуть и в браузер,
 * и в сборку: здесь нет ни node:fs, ни markdown — только данные и чистые функции.
 *
 * Сами новости — отдельные .md в site/src/data/changelog/; их читает
 * tools/changelog.mjs на сборке, а в бандл они попадают уже разобранными.
 */

/** Каталог ленты на сайте: /faq/changelog/. */
export const CHANGELOG_DIR = 'faq/changelog';

/** Заголовок и лид страницы-списка; их же берёт <head> этой страницы. */
export const LIST_PAGE = {
  title: 'Что нового',
  description:
    'Обновления, акции и новости приложения hoshi: что изменилось, что появилось и что будет дальше.',
};

/** Русские месяцы в родительном падеже: Intl на сервере и в браузере может
    разойтись, а гидратация не прощает разной разметки. */
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** '2026-11-16' → '16 ноября 2026'. */
export function dateLabel(iso) {
  const [year, month, day] = String(iso).split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * Ссылка на список или на запись; пустой slug — сам список. Относительная:
 * сборка живёт и в подпапке хостинга.
 */
export const changelogHref = (slug = '', base = './') => `${base}${CHANGELOG_DIR}/${slug}`;

/**
 * Что рисовать на адресе: { list: true } для /faq/changelog[/], сама запись
 * для /faq/changelog/<slug>, null — адрес не наш. Неизвестный slug — тоже null:
 * иначе клиент рисовал бы список поверх отданного лендинга и гидратация
 * расходилась бы с сервером (как у неизвестного документа).
 *
 * Записи передаются аргументом, а не импортируются: этот файл общий для сборки
 * (там записи читаются с диска) и для браузера (там они лежат в бандле).
 */
export function changelogForPath(pathname, entries = []) {
  const match = String(pathname ?? '').match(
    new RegExp(`(?:^|/)${CHANGELOG_DIR}(?:/([^/]+?))?/?$`),
  );
  if (!match) return null;

  const slug = match[1];
  if (!slug || slug === 'index.html') return { list: true };
  return entries.find((entry) => entry.slug === slug) ?? null;
}
