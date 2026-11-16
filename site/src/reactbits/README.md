# reactbits — компоненты страницы

Здесь лежат копии компонентов [React Bits](https://github.com/DavidHDev/react-bits)
(© David Haz, MIT — см. `LICENSE.md`). React Bits не подключают как библиотеку: компоненты
копируют в проект и правят под себя.

- Источник: `https://github.com/DavidHDev/react-bits`, коммит — в `SOURCE.json` (`pin`)
  и в `PIN` в `tools/fetch-reactbits.mjs`.
- Вариант: **JS + собственный CSS** (`src/content/…`). Tailwind- и TypeScript-варианты
  не используются: в проекте обычный CSS и JSX.
- Состав и патчи перечислены в `SOURCE.json` (`components.<Категория/Имя>.patched`).

## Патчи

**`TextAnimations/BlurText/BlurText.jsx`** — добавлен проброс тега: `as: Tag = 'p'`, а
корневой `<p>` заменён на `<Tag>`. Нужно, чтобы заголовок героя был настоящим `<h1>`
(см. `site/src/sections/Hero.jsx`). По умолчанию поведение прежнее — параграф.

**`Backgrounds/LightRays/LightRays.jsx`** — потолок 30 кадров в секунду (`FRAME_MS`,
`nextAllowed`). Свет дрейфует медленно, на глаз 30 и 60 не отличаются, но каждый
нарисованный кадр взводит `backdrop-filter` вуали шапки, которая лежит прямо над светом.

**`Animations/Noise/Noise.jsx`** — холст пыли монтируется только при `dust > 0` или
`scratches > 0` (при нулях он всё равно очищался каждый тик и гонял пустую текстуру на
композитор); `paintDust` и `resize` больше не падают без холста; сдвиг зерна идёт
`transform: translate3d(…)` вместо `background-position`, поэтому слой не перерисовывается
на всю высоту героя. Размер тайла (256 px) и его переполнение на кадр компенсируются в
`site/src/styles/sections.css` (`.hero__grain .noise__grain`).

`TextAnimations/CurvedLoop` не патчится: бегущая дуга должна идти на нативной частоте
монитора. Лента проходит 42 px/с, и при потолке 30 кадров в секунду на 120-герцовом экране
сдвиг случается раз в четыре обновления — это читается как рывки.

Патчи применяет `tools/fetch-reactbits.mjs` (массив `PATCHES`) при каждой загрузке.
Правки руками в файлах компонентов следующая загрузка сотрёт — правь `PATCHES`.
Проверено обратным прогоном `npm run bits`: файлы воспроизводятся байт в байт.

## Чего здесь нет

Компоненты, которые забракованы при сборке страницы, здесь не лежат:

- **MagicBento** — по исходнику это готовый демо-дашборд без `children`, свой контент в
  него не подставить;
- **PillNav**, **StaggeredMenu** — конфликтовали с выбранным `GooeyNav`;
- **EchoText**, **FuzzyText**, **RotatingText** — конкурировали с `BlurText` в заголовке;
- **GradientText** — надзаголовок стал служебной моно-подписью, градиентный текст ушёл;
- **BorderGlow** — жил только в блоке «Плеер», а блок со страницы убран;
- **BellToggle** — заменён прямой кнопкой Telegram; вместе с ним ушли зависимости
  `@hugeicons/react` и `@hugeicons/core-free-icons`;
- **DriftWall**, **MorphSlider** — проиграли `LogoLoop` (MorphSlider ещё тянет `ogl`);
- **DitherVeil**, **HalftoneReveal** — дублировали роль `PixelSwap` (`DitherVeil` тянет `ogl`);
- **AnimatedList** — список с выбором и стрелками, для статичных карточек ложная семантика;
- canvas-фоны (Galaxy, Particles, Prism, GradientWaves, GradientASCII, FloatingLines) —
  странице хватает `LightRays` с зерном;
- остальные микро-компоненты — без сценария на странице.

Вернуть любой из них — добавить строку в `COMPONENTS` и, при необходимости, патч в
`PATCHES`, затем `npm run bits`.
