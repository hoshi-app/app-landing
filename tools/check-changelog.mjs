/**
 * check-changelog.mjs — проверка формата новости без сборки сайта.
 *
 * Запуск: `npm test` (node tools/check-changelog.mjs). Тесты идут по одному
 * файлу-источнику: parseEntry — чистая функция, диск нужен только картинкам,
 * поэтому фикстуры берут реальные файлы из site/public.
 */
import assert from 'node:assert/strict';
import { parseEntry } from './changelog.mjs';
import { imageSize } from './image-size.mjs';

let fails = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    fails += 1;
    console.error(`FAIL ${name}\n     ${error.message.split('\n')[0]}`);
  }
}

/** Минимальная шапка; fields добавляются после Лида, тело — после закрывающих «---». */
const md = ({ fields = [], body = '' } = {}) =>
  ['---', 'title: Тест', 'date: 2026-11-17', 'tag: Обновление', 'summary: Лид', ...fields, '---', body].join('\n');

/** Ожидаем падение сборки с конкретным текстом. */
async function rejects(name, source, pattern) {
  await test(name, async () => {
    await assert.rejects(() => parseEntry(source, 'test.md'), pattern);
  });
}

/* ------------------------------------------------------------ минимальная */

await test('минимальная статья: только шапка, без тела', async () => {
  const entry = await parseEntry(md(), 'minimal.md');
  assert.equal(entry.slug, 'minimal');
  assert.equal(entry.html, '');
  assert.deepEqual(entry.blocks, []);
  assert.deepEqual(entry.buttons, []);
  assert.deepEqual(entry.platforms, []);
  assert.equal(entry.appVersion, null);
  assert.equal(entry.close, true);
  assert.equal(entry.img, null);
  assert.equal(entry.note, null);
  assert.equal(entry.actual, true);
});

/* -------------------------------------------------------------- кнопки */

await test('кнопки: https и app, порядок сохраняется', async () => {
  const entry = await parseEntry(
    md({
      fields: [
        'button: Что нового | https://hoshi.tv/faq/changelog/',
        'button: Мой список | app:/watchlist',
        'button: Релиз | app:/release/42',
      ],
    }),
    'buttons.md',
  );
  assert.deepEqual(entry.buttons, [
    { label: 'Что нового', href: 'https://hoshi.tv/faq/changelog/' },
    { label: 'Мой список', app: '/watchlist' },
    { label: 'Релиз', app: '/release/42' },
  ]);
});

await rejects('button без разделителя', md({ fields: ['button: Просто текст'] }), /ожидалось/);
await rejects('button с двумя разделителями', md({ fields: ['button: A | https://hoshi.tv | B'] }), /ожидалось/);
await rejects('button с пустой подписью', md({ fields: ['button:  | https://hoshi.tv'] }), /пустая подпись/);
await rejects(
  'button с длинной подписью',
  md({ fields: [`button: ${'я'.repeat(49)} | https://hoshi.tv`] }),
  /длиннее 48/,
);
await rejects('button http', md({ fields: ['button: Открыть | http://hoshi.tv'] }), /https:\/\//);
await rejects('button с неизвестным app-путём', md({ fields: ['button: Открыть | app:/nope'] }), /неизвестный раздел/);
await rejects('button с внешней схемой', md({ fields: ['button: Открыть | javascript:alert(1)'] }), /адрес — https/);

/* -------------------------------------------------------- платформа/версия */

await test('platform: ios', async () => {
  assert.deepEqual((await parseEntry(md({ fields: ['platform: ios'] }), 'p.md')).platforms, ['ios']);
});

await test('platform: оба → без ограничения', async () => {
  assert.deepEqual((await parseEntry(md({ fields: ['platform: ios, android'] }), 'p.md')).platforms, []);
});

await test('platform: дубликаты схлопываются', async () => {
  assert.deepEqual((await parseEntry(md({ fields: ['platform: ios, ios'] }), 'p.md')).platforms, ['ios']);
});

await rejects('platform: опечатка', md({ fields: ['platform: iOS'] }), /допустимо только ios и android/);
await rejects('platform: пусто', md({ fields: ['platform: ,'] }), /пусто/);

await test('app-version: все формы', async () => {
  for (const value of ['1.2.9', '1.2.9+', '-1.2.9', '1.2.9-1.3.4']) {
    const entry = await parseEntry(md({ fields: [`app-version: ${value}`] }), 'v.md');
    assert.equal(entry.appVersion, value);
  }
});

await rejects('app-version: два сегмента', md({ fields: ['app-version: 1.2'] }), /app-version/);
await rejects('app-version: перевёрнутый диапазон', md({ fields: ['app-version: 1.3.0-1.2.0'] }), /больше конца/);
await rejects('app-version: мусор', md({ fields: ['app-version: latest'] }), /app-version/);

/* -------------------------------------------------------------- close/actual */

await test('close: false', async () => {
  assert.equal((await parseEntry(md({ fields: ['close: false'] }), 'c.md')).close, false);
  assert.equal((await parseEntry(md({ fields: ['close: true'] }), 'c.md')).close, true);
});

await rejects('close: мусор', md({ fields: ['close: нет'] }), /close/);
await rejects('actual: мусор', md({ fields: ['actual: 1'] }), /actual/);

/* ------------------------------------------------------------ тело: HTML */

await test('тело: разметка в HTML и блоках', async () => {
  const entry = await parseEntry(
    md({
      body: [
        'Абзац с **жирным** и *курсивом*, `кодом`, ~~зачёркнутым~~ и [ссылкой](https://hoshi.tv/x).',
        '',
        '## Заголовок',
        '',
        '### Подзаголовок',
        '',
        '- пункт один',
        '- пункт **два**',
        '',
        '1. раз',
        '2. два',
        '',
        '> цитата',
        '',
        '---',
        '',
        '![фото](posters/52991.webp)',
      ].join('\n'),
    }),
    'body.md',
  );

  for (const tag of ['<strong>', '<em>', '<code>', '<del>', '<a href="https://hoshi.tv/x"', '<h2>', '<h3>', '<ul>', '<ol>', '<blockquote>', '<hr>', '<img ']) {
    assert.ok(entry.html.includes(tag), `в HTML нет ${tag}`);
  }
  assert.ok(entry.html.includes('target="_blank" rel="noopener noreferrer"'), 'ссылка открывается в новой вкладке');
  assert.ok(entry.html.includes('src="../../posters/52991.webp"'), 'картинка тела идёт от корня сайта');
  assert.ok(entry.html.includes('width="240" height="339"'), 'у картинки тела есть размеры');

  assert.deepEqual(entry.blocks.map((block) => block.type), ['p', 'h', 'h', 'ul', 'ol', 'quote', 'hr', 'img']);
  assert.deepEqual(entry.blocks[0].runs[1], { text: 'жирным', bold: true });
  assert.deepEqual(entry.blocks[4].items[1], [{ text: 'два' }]);
  assert.equal(entry.blocks[7].width, 240);
  assert.equal(entry.blocks[7].alt, 'фото');
});

await test('тело: экранирование \\*', async () => {
  const entry = await parseEntry(md({ body: 'Звёздочка \\* не курсив.' }), 'escape.md');
  assert.deepEqual(entry.blocks, [{ type: 'p', runs: [{ text: 'Звёздочка * не курсив.' }] }]);
});

await rejects('тело: H1', md({ body: '# Заголовок' }), /только ## или ###/);
await rejects('тело: H4', md({ body: '#### Заголовок' }), /только ## или ###/);
await rejects('тело: таблица', md({ body: '| a | b |\n|---|---|\n| 1 | 2 |' }), /table/);
await rejects('тело: сырой HTML', md({ body: '<div>привет</div>' }), /html/);
await rejects('тело: блок кода', md({ body: '```\ncode\n```' }), /code/);
await rejects('тело: картинка внутри текста', md({ body: 'Текст ![фото](posters/52991.webp) рядом' }), /отдельным абзацем/);
await rejects('тело: картинка без alt', md({ body: '![](posters/52991.webp)' }), /alt/);
await rejects('тело: вложенный список', md({ body: '- пункт\n  - вложенный' }), /вложенные списки/);
await rejects('тело: чекбокс', md({ body: '- [ ] пункт' }), /чекбоксы/);
await rejects('тело: два абзаца в пункте', md({ body: '- пункт\n\n  второй абзац' }), /один абзац/);
await rejects('тело: цитата из двух абзацев', md({ body: '> один\n>\n> два' }), /один абзац/);
await rejects('тело: http-ссылка', md({ body: '[ссылка](http://hoshi.tv)' }), /только https/);
await rejects('тело: картинки нет в site/public', md({ body: '![фото](nope.png)' }), /нет файла/);
await rejects('тело: не картинка', md({ body: '![фото](robots.txt)' }), /svg, png, jpg, webp и gif/);

/* ------------------------------------------------------- шапка и картинки */

await test('img: герой с размерами и alt', async () => {
  const entry = await parseEntry(
    md({ fields: ['img: changelog/splash-update.svg', 'img-alt: Сплэш'] }),
    'hero.md',
  );
  assert.deepEqual(entry.img, { src: 'changelog/splash-update.svg', width: 1024, height: 1024, alt: 'Сплэш' });
});

await rejects('img без alt', md({ fields: ['img: changelog/splash-update.svg'] }), /img-alt/);
await rejects('img-alt без img', md({ fields: ['img-alt: Сплэш'] }), /без «img»/);

/* ---------------------------------------------------------------- шапка */

await rejects('неизвестное поле', md({ fields: ['cta-label: Старое'] }), /неизвестное поле/);
await rejects('дубль поля', md({ fields: ['tag: Второй'] }), /задано дважды/);
await rejects('нет обязательного поля', ['---', 'title: Т', '---', ''].join('\n'), /обязательного поля/);
await rejects('кривая дата', ['---', 'title: Т', 'date: 2026-13-40', 'tag: Н', 'summary: Л', '---', ''].join('\n'), /date/);
await rejects('нет front-matter', 'просто текст', /front-matter/);

/* ------------------------------------------------------------- image-size */

await test('image-size: GIF (анимированный заголовок)', () => {
  const gif = Buffer.alloc(10);
  gif.write('GIF89a', 0, 'ascii');
  gif.writeUInt16LE(320, 6);
  gif.writeUInt16LE(240, 8);
  assert.deepEqual(imageSize(gif, 'x.gif'), { width: 320, height: 240 });
  assert.equal(imageSize(Buffer.alloc(4), 'x.gif'), null);
});

if (fails) {
  console.error(`\ncheck-changelog: провалено ${fails}`);
  process.exitCode = 1;
} else {
  console.log('\ncheck-changelog: всё в порядке');
}
