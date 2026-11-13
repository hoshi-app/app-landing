/**
 * fetch-reactbits.mjs — кладёт компоненты react-bits в site/src/reactbits.
 *
 *   npm run bits
 *
 * React Bits (https://github.com/DavidHDev/react-bits, MIT) — не библиотека,
 * а набор компонентов, которые копируют в проект. Здесь лежат их JS-варианты
 * с собственным CSS: наш проект тоже на обычном CSS, поэтому Tailwind-версии
 * не нужны.
 *
 * Источник фиксирован коммитом (PIN): обновили пин — получили свежие компоненты.
 * Скрипт идемпотентен: перезапуск перезаписывает файлы и заново применяет
 * патчи из PATCHES. Свои правки вноси в PATCHES, а не только в файл, иначе
 * следующая загрузка их сотрёт.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'src', 'reactbits');

/** Коммит react-bits, с которого берутся компоненты. */
const PIN = '4e0d091d3b1ea8b7aadef33716a8d99d164ae4ce';
const RAW = `https://raw.githubusercontent.com/DavidHDev/react-bits/${PIN}`;

/** Категория из репозитория → компоненты, которые реально нужны странице. */
const COMPONENTS = {
  TextAnimations: ['BlurText', 'ScrollFloat', 'CurvedLoop'],
  Components: ['GooeyNav', 'Counter'],
  Animations: ['LogoLoop', 'AnimatedContent', 'PixelSwap', 'Noise', 'GradualBlur'],
  Backgrounds: ['LightRays'],
};

/**
 * Правки вендоренных файлов. У каждой — причина и проверка: если строки нет
 * или она не одна, сборка падает, а не молча собирает не то.
 */
const PATCHES = [
  {
    file: 'TextAnimations/BlurText/BlurText.jsx',
    why: 'у компонента жёстко зашит <p>, а он нужен как настоящий <h1>',
    edits: [
      {
        from: '  focusOnHover = false\n}) => {',
        to: "  focusOnHover = false,\n  as: Tag = 'p'\n}) => {",
      },
      { from: '      <p\n', to: '      <Tag\n' },
      { from: '      </p>', to: '      </Tag>' },
    ],
  },
];

const fail = (message) => {
  console.error(`bits: ${message}`);
  process.exit(1);
};

async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'hoshi-landing' } });
  if (response.status === 404) return null;
  if (!response.ok) fail(`${response.status} на ${url}`);
  return response.text();
}

async function put(rel, body) {
  const file = path.join(OUT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body, 'utf8');
  return body.length;
}

function applyPatch(source, patch) {
  let text = source;
  for (const { from, to } of patch.edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) fail(`патч для ${patch.file}: ожидалась одна «${from.trim()}», найдено ${count}`);
    text = text.replace(from, to);
  }
  return text;
}

const manifest = { pin: PIN, repo: 'https://github.com/DavidHDev/react-bits', components: {} };
let files = 0;
let bytes = 0;

for (const [category, names] of Object.entries(COMPONENTS)) {
  for (const name of names) {
    const dir = `${category}/${name}`;
    const jsx = await get(`${RAW}/src/content/${dir}/${name}.jsx`);
    if (!jsx) fail(`нет ${dir}/${name}.jsx в коммите ${PIN.slice(0, 7)}`);

    const patch = PATCHES.find((item) => item.file === `${dir}/${name}.jsx`);
    const body = patch ? applyPatch(jsx, patch) : jsx;
    bytes += await put(`${dir}/${name}.jsx`, body);

    const css = await get(`${RAW}/src/content/${dir}/${name}.css`);
    if (css) bytes += await put(`${dir}/${name}.css`, css);

    manifest.components[dir] = patch ? { patched: patch.why } : {};
    files += css ? 2 : 1;
    console.log(`  ${body.length.toString().padStart(7)} B  ${dir}/${name}.jsx${css ? ' + .css' : ''}`);
  }
}

const license = await get(`${RAW}/LICENSE.md`);
if (license) {
  bytes += await put('LICENSE.md', license);
  files += 1;
}

await put('SOURCE.json', `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`bits: react-bits @ ${PIN.slice(0, 7)}, ${files} файлов, ${(bytes / 1024).toFixed(1)} KB -> site/src/reactbits/`);
