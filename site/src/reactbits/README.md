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

Патч применяет `tools/fetch-reactbits.mjs` (массив `PATCHES`) при каждой загрузке. Правки
руками в файлах компонентов следующая загрузка сотрёт — правь `PATCHES`.

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
