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
  {
    file: 'Backgrounds/LightRays/LightRays.jsx',
    why: 'свет дрейфует медленно, а каждый кадр заново взводит backdrop-фильтр вуали шапки — 30 кадров в секунду вместо частоты монитора',
    edits: [
      {
        from: [
          '    let lost = false;',
          '',
          '    let resizePending = false;',
        ].join('\n'),
        to: [
          '    let lost = false;',
          '    /* Лучи дрейфуют медленно: 30 кадров в секунду на глаз не отличить от 60,',
          '       а каждый нарисованный кадр заново взводит backdrop-фильтр вуали шапки —',
          '       она лежит прямо над светом. */',
          '    const FRAME_MS = 1000 / 30;',
          '    let nextAllowed = 0;',
          '',
          '    let resizePending = false;',
        ].join('\n'),
      },
      {
        from: [
          '    const frame = now => {',
          '      raf = 0;',
          '      if (resizePending) {',
        ].join('\n'),
        to: [
          '    const frame = now => {',
          '      raf = 0;',
          '      if (now < nextAllowed) {',
          '        if (visible && pageVisible) raf = requestAnimationFrame(frame);',
          '        return;',
          '      }',
          '      nextAllowed = now + FRAME_MS;',
          '      if (resizePending) {',
        ].join('\n'),
      },
    ],
  },
  {
    file: 'Animations/Noise/Noise.jsx',
    why: 'пустой пылевой холст очищался каждый тик, а зерно дёргало кадр через background-position вместо композитного сдвига',
    edits: [
      {
        from: [
          '    const root = rootRef.current;',
          '    const grain = grainRef.current;',
          '    const canvas = dustRef.current;',
          "    const ctx = canvas?.getContext('2d');",
          '    if (!root || !grain || !canvas || !ctx) return undefined;',
        ].join('\n'),
        to: [
          '    const root = rootRef.current;',
          '    const grain = grainRef.current;',
          '    /* Пыль и царапины не рисуются — значит, и холста нет: полнокадровый',
          '       clearRect каждый тик всё равно помечает слой грязным и гонит пустую',
          '       текстуру на композитор, даже когда рисовать нечего. */',
          '    const canvas = dustRef.current;',
          "    const ctx = canvas?.getContext('2d') ?? null;",
          '    if (!root || !grain) return undefined;',
        ].join('\n'),
      },
      {
        from: [
          '    const paintDust = (s, step) => {',
          '      const dpr = Math.min(window.devicePixelRatio || 1, 2);',
          '      ctx.setTransform(1, 0, 0, 1, 0, 0);',
          '      ctx.clearRect(0, 0, canvas.width, canvas.height);',
          '      if (s.dust <= 0 && s.scratches <= 0 && scratchList.length === 0) return;',
        ].join('\n'),
        to: [
          '    const paintDust = (s, step) => {',
          '      if (!ctx || !canvas) return;',
          '      if (s.dust <= 0 && s.scratches <= 0 && scratchList.length === 0) return;',
          '      const dpr = Math.min(window.devicePixelRatio || 1, 2);',
          '      ctx.setTransform(1, 0, 0, 1, 0, 0);',
          '      ctx.clearRect(0, 0, canvas.width, canvas.height);',
        ].join('\n'),
      },
      {
        from: [
          '      width = Math.max(1, root.clientWidth);',
          '      height = Math.max(1, root.clientHeight);',
          '      canvas.width = Math.round(width * dpr);',
          '      canvas.height = Math.round(height * dpr);',
          '      paintDust(settingsRef.current, 0);',
        ].join('\n'),
        to: [
          '      width = Math.max(1, root.clientWidth);',
          '      height = Math.max(1, root.clientHeight);',
          '      if (canvas) {',
          '        canvas.width = Math.round(width * dpr);',
          '        canvas.height = Math.round(height * dpr);',
          '      }',
          '      paintDust(settingsRef.current, 0);',
        ].join('\n'),
      },
      {
        from: [
          '        const span = TILE * s.size;',
          '        grain.style.backgroundPosition = `${(Math.random() * span).toFixed(1)}px ${(Math.random() * span).toFixed(1)}px`;',
        ].join('\n'),
        to: [
          '        const span = TILE * s.size;',
          '        /* Сдвиг зерна — трансформом, а не background-position: тайл повторяется,',
          '           поэтому сдвиг на величину тайла даёт ту же картинку, но слой при этом',
          '           не перерисовывается на всю высоту героя, а только двигается. */',
          '        grain.style.transform = `translate3d(${(Math.random() * span).toFixed(1)}px, ${(Math.random() * span).toFixed(1)}px, 0px)`;',
        ].join('\n'),
      },
      {
        from: '      <canvas ref={dustRef} className="noise__dust" />',
        to: [
          '      {(settings.dust > 0 || settings.scratches > 0) && (',
          '        <canvas ref={dustRef} className="noise__dust" />',
          '      )}',
        ].join('\n'),
      },
    ],
  },
  {
    file: 'TextAnimations/CurvedLoop/CurvedLoop.jsx',
    why: 'лента идёт 42 px/с, а SVG-текст перекладывался по всей ширине 60 раз в секунду',
    edits: [
      {
        from: [
          '    let frame = 0;',
          '    let last = 0;',
          '    let visible = true;',
          '',
          '    const tick = now => {',
          '      frame = 0;',
          '      if (!visible) return;',
          '      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;',
        ].join('\n'),
        to: [
          '    let frame = 0;',
          '    let last = 0;',
          '    let visible = true;',
          '    /* Лента идёт 42 px/с, то есть меньше пикселя за кадр: перекладывать',
          '       SVG-текст по всей ширине 60 раз в секунду ради этого не нужно. */',
          '    const FRAME_MS = 1000 / 30;',
          '    let nextAllowed = 0;',
          '',
          '    const tick = now => {',
          '      frame = 0;',
          '      if (!visible) return;',
          '      if (now < nextAllowed) {',
          '        frame = requestAnimationFrame(tick);',
          '        return;',
          '      }',
          '      nextAllowed = now + FRAME_MS;',
          '      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;',
        ].join('\n'),
      },
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
