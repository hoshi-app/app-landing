/**
 * shoot.mjs — снимает страницу и меряет её в настоящем браузере.
 *
 *   npm run build && npm run shoot
 *
 * Проходит четыре ширины, снимает ключевые секции, считает LCP/CLS, вес
 * первой загрузки, число анимаций в покое и цену прокрутки при 4× замедлении
 * CPU. Дополнительно проверяет то, чего не видно в статике: ошибки консоли
 * (в том числе расхождения гидратации), движение ленты постеров, переключение
 * экрана в телефоне и режим «меньше движения». Если бюджеты нарушены — падает
 * с ненулевым кодом.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from './chrome.mjs';
import { start } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.shots');
const PORT = 4178;

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

/** Секции: для 390 и 1440 снимаются все, для остальных — первый экран. */
const STOPS = [
  ['hero', '#top'],
  ['ribbon', '.ribbon'],
  ['catalog', '#catalog'],
  ['faq', '#faq'],
  ['footer', 'footer'],
];

const BUDGET = {
  lcp: 2500,
  transfer: 1600 * 1024,
  dom: 1800,
  // WebGL-луч, две бегущие ленты и ScrollTrigger — это кадры, а не макет:
  // при 4× замедлении CPU держим p95 в пределах двух кадров 30 fps.
  p95: 70,
  maxFrame: 160,
  longtask: 300,
  // Покой на первом экране: сколько страница просит кадров, сколько площади
  // канвасов заливает и сколько стеклянных слоёв держит. Это то, что видно
  // в диспетчере задач как загрузку GPU, — бюджеты держат её низкой.
  //
  // rafPerSecond считает запросы, а не работу: тикер gsap, цикл зерна и сам
  // свет просыпаются на каждом кадре монитора, даже когда кадр пропускается по
  // потолку fps. Поэтому потолок здесь — только ловушка на разгон цикла
  // (бесконечное «измерение → setState → рендер» даёт тысячи в секунду);
  // реальная цена кадра — в canvasMpxPerSecond.
  rafPerSecond: 900,
  canvasMpxPerSecond: 60,
  backdropSurfaces: 4,
};

const failures = [];
const report = { viewports: {}, reducedMotion: null };

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const fail = (message) => failures.push(message);

/** Сбор CLS/LCP/FCP/longtask с первого байта страницы. */
function perfInit() {
  window.__perf = {
    cls: 0,
    lcp: 0,
    fcp: 0,
    longtasks: [],
    shifts: [],
    lcpElement: null,
    raf: 0,
    canvasPx: 0,
  };

  /* Счётчики стоимости покоя: rAF-циклы и заливка канвасов. document.getAnimations()
     их не видит — WebGL-свет и зерно живут на requestAnimationFrame. */
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    window.__perf.raf += 1;
    return raf(callback);
  };
  const countPaint = (proto, names) => {
    if (!proto) return;
    for (const name of names) {
      const original = proto[name];
      if (typeof original !== 'function') continue;
      proto[name] = function count(...args) {
        if (this.canvas) window.__perf.canvasPx += this.canvas.width * this.canvas.height;
        return original.apply(this, args);
      };
    }
  };
  countPaint(CanvasRenderingContext2D.prototype, ['clearRect', 'fillRect', 'drawImage']);
  countPaint(WebGLRenderingContext.prototype, ['drawArrays', 'drawElements']);
  countPaint(WebGL2RenderingContext.prototype, ['drawArrays', 'drawElements']);
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__perf.cls += entry.value;
      window.__perf.shifts.push({
        value: Number(entry.value.toFixed(4)),
        time: Math.round(entry.startTime),
        sources: (entry.sources ?? []).map((source) => ({
          tag: source.node?.tagName,
          cls: String(source.node?.className ?? '').slice(0, 60),
        })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.lcp = entry.startTime;
      window.__perf.lcpElement = {
        tag: entry.element?.tagName,
        cls: String(entry.element?.className ?? '').slice(0, 60),
      };
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') window.__perf.fcp = entry.startTime;
    }
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__perf.longtasks.push(Math.round(entry.duration));
  }).observe({ type: 'longtask', buffered: true });
}

const jump = (top) => window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  // гидратация + вход героя по слову: снимаем уже устоявшуюся страницу
  await page.waitForTimeout(4200);
}

async function metrics(page) {
  return page.evaluate(() => {
    const resource = performance.getEntriesByType('resource');
    const nav = performance.getEntriesByType('navigation')[0];
    const transfer =
      resource.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) + (nav?.transferSize ?? 0);
    const animations = document.getAnimations();
    const infinite = animations.filter((animation) => {
      const timing = animation.effect?.getTiming?.();
      return timing?.iterations === Infinity && animation.playState === 'running';
    });
    return {
      perf: { ...window.__perf },
      transfer,
      requests: resource.length + 1,
      dom: document.querySelectorAll('*').length,
      imgs: document.images.length,
      canvases: document.querySelectorAll('canvas').length,
      animations: animations.length,
      infiniteRunning: infinite.length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      height: document.documentElement.scrollHeight,
    };
  });
}

/**
 * Стоимость покоя на первом экране: сколько раз страница просит кадр, сколько
 * площади канвасов заливает, сколько держит backdrop-слоёв и не осталось ли в
 * герое постоянных filter/will-change. Это прокси загрузки GPU: в headless
 * Chromium WebGL считает SwiftShader, поэтому проценты берутся в живом браузере,
 * а здесь держатся причины этих процентов.
 */
async function costProbe(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);

  return page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const before = { raf: window.__perf.raf, px: window.__perf.canvasPx };
    await wait(2000);
    const after = { raf: window.__perf.raf, px: window.__perf.canvasPx };

    const backdropSurfaces = [...document.querySelectorAll('*')].filter((element) => {
      const style = getComputedStyle(element);
      const filter = style.backdropFilter || style.webkitBackdropFilter;
      return Boolean(filter) && filter !== 'none';
    }).length;

    const heroFilterSpans = [...document.querySelectorAll('.hero__title span, .hero__lead span')].filter(
      (element) => {
        const style = getComputedStyle(element);
        const filtered = Boolean(style.filter) && style.filter !== 'none' && style.filter !== 'blur(0px)';
        const hinted = Boolean(style.willChange) && style.willChange !== 'auto';
        return filtered || hinted;
      },
    ).length;

    return {
      rafPerSecond: Math.round((after.raf - before.raf) / 2),
      canvasMpxPerSecond: Number((((after.px - before.px) / 2) / 1e6).toFixed(1)),
      backdropSurfaces,
      heroFilterSpans,
    };
  });
}

async function scrollCost(page, client) {
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);

  const result = await page.evaluate(async () => {
    const longtasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longtasks.push(Math.round(entry.duration));
    });
    observer.observe({ type: 'longtask' });

    const deltas = [];
    const total = document.documentElement.scrollHeight - innerHeight;
    let y = 0;
    let last = performance.now();
    await new Promise((resolve) => {
      const step = () => {
        const now = performance.now();
        deltas.push(now - last);
        last = now;
        y += 24;
        window.scrollTo({ top: Math.min(total, y), behavior: 'instant' });
        if (y < total) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    observer.disconnect();

    const sorted = deltas.slice(2).sort((a, b) => a - b);
    const q = (p) => Math.round(sorted[Math.floor(sorted.length * p)] ?? 0);
    return {
      frames: sorted.length,
      p50: q(0.5),
      p95: q(0.95),
      max: Math.round(sorted.at(-1) ?? 0),
      longtasks,
    };
  });

  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return result;
}

/** Функциональные проверки: лента едет, навбар реагирует сразу, экран переключается. */
async function interactions(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const jump = (top) => window.scrollTo({ top, behavior: 'instant' });
    /* На широком экране подсветку показывает гоу-виджет, на телефоне — обычные
       ссылки в шапке (aria-current). Берём тот, что реально виден. */
    const activeItem = () => {
      const plain = [...document.querySelectorAll('.head__plain a')].find(
        (node) => node.offsetParent && node.getAttribute('aria-current') === 'true',
      );
      if (plain) return plain.textContent.trim();
      return document.querySelector('.gooey-nav__item[data-active]')?.textContent?.trim() ?? null;
    };

    // 1. лента живёт только пока в кадре — сначала доводим её до экрана
    const catalog = document.querySelector('#catalog');
    jump(catalog ? catalog.offsetTop + 120 : 0);
    await wait(500);
    const track = document.querySelector('#catalog .logoloop__track');
    const readTrack = () => (track ? getComputedStyle(track).transform : null);
    const before = readTrack();
    await wait(700);
    const after = readTrack();

    // 2. клик по навигации: подсветка должна уехать сразу, а не после прокрутки
    jump(0);
    await wait(400);
    const pillBefore = activeItem();
    const link = document.querySelector('.head__nav a[href="#faq"]');
    link?.click();
    await wait(220);
    const pillAfter = activeItem();
    const movedEarly = window.scrollY > 40;
    await wait(1000);

    // 3. телефон в герое: тап переключает экран на «главную»
    jump(0);
    await wait(400);
    const swap = document.querySelector('.device__swap');
    const pressedBefore = swap?.getAttribute('aria-pressed') ?? null;
    swap?.click();
    await wait(1800);
    const pressedAfter = swap?.getAttribute('aria-pressed') ?? null;

    return {
      marquee: { before, after, moved: before !== after },
      nav: { found: Boolean(link), pillBefore, pillAfter, movedEarly, pillMoved: pillBefore !== pillAfter },
      swap: { found: Boolean(swap), pressedBefore, pressedAfter, toggled: pressedBefore !== pressedAfter },
    };
  });
}

async function shoot(viewport, browser, url) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'ru-RU',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text().slice(0, 240));
  });
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 240)));
  page.on('requestfailed', (request) => errors.push(`failed: ${request.url()}`));
  await page.addInitScript(perfInit);

  await goto(page, url);
  const m = await metrics(page);
  m.errors = errors;
  m.cost = await costProbe(page);
  m.scroll = await scrollCost(page, await context.newCDPSession(page));

  const width = viewport.name;
  const all = width === '390' || width === '1440';
  const stops = all ? STOPS : [['hero', '#top']];

  for (const [name, selector] of stops) {
    const top = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      if (!node) return null;
      return node.getBoundingClientRect().top + window.scrollY - 64;
    }, selector);
    if (top === null) {
      fail(`${width}: не найдена секция ${selector}`);
      continue;
    }
    await page.evaluate(jump, top);
    // ждём, пока отработает наблюдатель разделов и капля навигации встанет
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${width}-${name}.webp`), type: 'webp', quality: 86 });
  }

  m.interactions = await interactions(page);

  if (all) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${width}-full.webp`), type: 'webp', quality: 78, fullPage: true });
  }

  report.viewports[width] = m;
  await context.close();
}

async function reducedMotion(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'ru-RU',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await goto(page, url);
  // вход героя в этом режиме всё равно проигрывается (только без blur/сдвига)
  await page.waitForTimeout(4200);

  const snapshot = () =>
    page.evaluate(() => {
      const title = document.querySelector('.hero__title');
      const lead = document.querySelector('.hero__lead');
      const words = lead ? [...lead.querySelectorAll('span')].filter((span) => span.style.opacity) : [];
      return {
        titleOpacity: title ? getComputedStyle(title).opacity : null,
        leadWords: words.length,
        leadVisible: words.every((span) => getComputedStyle(span).opacity === '1'),
        // анимации на ScrollTimeline не «идут» сами: их двигает прокрутка,
        // поэтому в покое считаем только те, что на времени документа
        running: document
          .getAnimations()
          .filter((item) => item.playState === 'running' && item.timeline === document.timeline).length,
        infinite: document
          .getAnimations()
          .filter(
            (item) =>
              item.playState === 'running' &&
              item.timeline === document.timeline &&
              item.effect?.getTiming?.().iterations === Infinity,
          ).length,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        canvases: document.querySelectorAll('canvas').length,
        heroRays: Boolean(document.querySelector('.hero .light-rays')),
      };
    });

  const state = await snapshot();
  await page.waitForTimeout(2200);
  state.settled = await snapshot();

  await page.screenshot({ path: path.join(OUT, 'reduced-hero.webp'), type: 'webp', quality: 86 });
  report.reducedMotion = state;
  await context.close();
}

/** Загрузка при 4× CPU: цифра, с которой можно сравнивать прошлую версию. */
async function throttledLoad(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'ru-RU',
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(perfInit);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const perf = await page.evaluate(() => window.__perf);
  await context.close();
  return { fcp: Math.round(perf.fcp), lcp: Math.round(perf.lcp) };
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  const { server, url } = await start('dist', PORT);
  const browser = await chromium.launch({ executablePath: await findChrome() });

  try {
    for (const viewport of VIEWPORTS) {
      await shoot(viewport, browser, url);
      const m = report.viewports[viewport.name];
      if (m.overflow > 0) fail(`${viewport.name}: страница шире окна на ${m.overflow}px`);
      if (m.perf.cls > 0.02) fail(`${viewport.name}: CLS ${m.perf.cls.toFixed(3)}`);
      if (m.perf.lcp > BUDGET.lcp) fail(`${viewport.name}: LCP ${Math.round(m.perf.lcp)} мс`);
      if (m.transfer > BUDGET.transfer) fail(`${viewport.name}: передано ${kb(m.transfer)}`);
      if (m.dom > BUDGET.dom) fail(`${viewport.name}: DOM ${m.dom} элементов`);
      if (m.errors.length) fail(`${viewport.name}: ${m.errors.length} ошибок — ${m.errors[0]}`);
      if (!m.interactions.marquee.moved) fail(`${viewport.name}: лента постеров стоит на месте`);
      if (!m.interactions.nav.pillMoved) fail(`${viewport.name}: навбар не переключился по клику`);
      if (!m.interactions.nav.movedEarly) fail(`${viewport.name}: прокрутка не началась сразу после клика`);
      if (!m.interactions.swap.toggled) fail(`${viewport.name}: экран в телефоне не переключается`);
      if (m.cost.rafPerSecond > BUDGET.rafPerSecond) {
        fail(`${viewport.name}: ${m.cost.rafPerSecond} кадров/с в покое`);
      }
      if (m.cost.canvasMpxPerSecond > BUDGET.canvasMpxPerSecond) {
        fail(`${viewport.name}: ${m.cost.canvasMpxPerSecond} Мп канвасов в секунду`);
      }
      if (m.cost.backdropSurfaces > BUDGET.backdropSurfaces) {
        fail(`${viewport.name}: ${m.cost.backdropSurfaces} backdrop-слоёв`);
      }
      if (m.cost.heroFilterSpans > 0) {
        fail(`${viewport.name}: ${m.cost.heroFilterSpans} span в герое с filter/will-change`);
      }
    }

    await reducedMotion(browser, url);
    const still = report.reducedMotion;
    if (still.infinite > 0 || still.settled.infinite > 0) {
      fail(`reduced-motion: ${Math.max(still.infinite, still.settled.infinite)} бесконечных анимаций`);
    }
    if (still.settled.running > 0) fail(`reduced-motion: ${still.settled.running} анимаций не успокоились`);
    if (still.titleOpacity !== '1') fail(`reduced-motion: заголовок прозрачен (${still.titleOpacity})`);
    if (!still.settled.leadVisible) fail('reduced-motion: текст лида не виден');
    if (still.heroRays) fail('reduced-motion: лучи фона всё равно смонтированы');

    report.throttled = await throttledLoad(browser, url);
    if (report.throttled.lcp > 2800) fail(`LCP при 4× CPU ${report.throttled.lcp} мс`);

    const wide = report.viewports['1440'];
    const narrow = report.viewports['390'];
    for (const m of [wide, narrow]) {
      if (m.scroll.p95 > BUDGET.p95) fail(`прокрутка: p95 ${m.scroll.p95} мс при 4× CPU`);
      if (m.scroll.max > BUDGET.maxFrame) fail(`прокрутка: худший кадр ${m.scroll.max} мс`);
      const bad = m.scroll.longtasks.filter((duration) => duration > BUDGET.longtask);
      if (bad.length) fail(`прокрутка: longtask ${Math.max(...bad)} мс`);
    }

    await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

    console.log('shoot: замеры');
    for (const [name, m] of Object.entries(report.viewports)) {
      console.log(
        `  ${name.padEnd(5)} LCP ${String(Math.round(m.perf.lcp)).padStart(4)} мс · ` +
          `CLS ${m.perf.cls.toFixed(2)} · ${kb(m.transfer)} · ${m.requests} запр. · ` +
          `DOM ${m.dom} · canvas ${m.canvases} · анимаций в покое ${m.infiniteRunning}`,
      );
    }
    console.log(
      `  прокрутка @4x: 1440 p95 ${wide.scroll.p95} мс, 390 p95 ${narrow.scroll.p95} мс, ` +
        `longtask ${wide.scroll.longtasks.length + narrow.scroll.longtasks.length}`,
    );
    for (const [name, m] of Object.entries(report.viewports)) {
      console.log(
        `  покой ${name.padEnd(5)} ${String(m.cost.rafPerSecond).padStart(3)} кадров/с · ` +
          `${m.cost.canvasMpxPerSecond} Мп канвасов/с · backdrop ${m.cost.backdropSurfaces} · ` +
          `span с filter ${m.cost.heroFilterSpans}`,
      );
    }
    console.log(`  лента: ${wide.interactions.marquee.moved ? 'едет' : 'стоит'}, экран: ${wide.interactions.swap.toggled ? 'переключается' : 'нет'}`);
    console.log(`  загрузка @4x CPU: FCP ${report.throttled.fcp} мс, LCP ${report.throttled.lcp} мс`);
    console.log(`  reduced-motion: ${JSON.stringify(still)}`);
    console.log(`  кадры: .shots/ (${(await fs.readdir(OUT)).length} файлов)`);
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    console.error(`\nshoot: провалено ${failures.length}`);
    for (const message of failures) console.error(`  - ${message}`);
    process.exit(1);
  }
  console.log('\nshoot: бюджеты в порядке');
}

main().catch((error) => {
  console.error('SHOOT FAILED:', error);
  process.exit(1);
});
