/**
 * shoot-landing.mjs — снимает собранный лендинг на разных ширинах.
 *
 *   node tools/shoot-landing.mjs        → .shots/*.webp
 *
 * Поднимает dist на 127.0.0.1:4174 и проходит по контрольным точкам:
 * 320 / 390 / 768 / 1024 / 1440 / 1920, плюс прогон с prefers-reduced-motion.
 * Заодно проверяет, что нигде нет горизонтальной прокрутки.
 */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const DIST = path.resolve('dist');
const OUT = path.resolve('.shots');
const PORT = 4174;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

// контрольные точки: [подпись, селектор]
const STOPS = [
  ['hero', '#top'],
  ['marquee', 'section[aria-label="Что можно смотреть"]'],
  ['inside', '#inside'],
  ['player', '#player'],
  ['start', '#start'],
  ['faq', '#faq'],
  ['download', '#download'],
  ['footer', 'footer'],
];

function serve() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, ORIGIN);
    const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' }).end(body);
    } catch {
      const html = await fs.readFile(path.join(DIST, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] }).end(html);
    }
  });
  return new Promise((r) => server.listen(PORT, '127.0.0.1', () => r(server)));
}

async function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  const dirs = (await fs.readdir(root)).filter((d) => d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) {
    for (const sub of ['chrome-win64', 'chrome-win']) {
      const exe = path.join(root, d, sub, 'chrome.exe');
      try {
        await fs.access(exe);
        return exe;
      } catch {}
    }
  }
  throw new Error('Не найден Chromium в ms-playwright — задайте CHROME_PATH');
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({ executablePath: await findChrome() });
  const report = { overflow: [], consoleErrors: [], shots: [] };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      locale: 'ru-RU',
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') report.consoleErrors.push(`${vp.name}: ${m.text().slice(0, 160)}`);
    });

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    // заставка живёт ~1.5 с — ловим её отдельным кадром на большом экране
    if (vp.name === '1440') {
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, '1440-splash.webp'), type: 'webp', quality: 88 });
      report.shots.push('1440-splash');
    }
    await page.waitForTimeout(2600); // сплэш + входные анимации

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      docHeight: document.body.scrollHeight,
    }));

    // Настоящая проверка — может ли страница уехать вбок. Элементы, вылезающие за
    // край внутри overflow-hidden (пятна фона, наклонённые ленты), безвредны.
    const scrolledX = await page.evaluate(() => {
      const y = window.scrollY;
      window.scrollTo(9999, y);
      const x = window.scrollX;
      window.scrollTo(0, y);
      return x;
    });
    if (scrolledX > 0) {
      const culprits = await page.evaluate(() => {
        const vw = window.innerWidth;
        const clipped = (el) => {
          for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
            const o = getComputedStyle(p);
            if (/hidden|clip|auto|scroll/.test(o.overflowX)) return true;
          }
          return false;
        };
        const out = [];
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right <= vw + 1 && r.left >= -1) continue;
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') continue;
          if (clipped(el)) continue;
          out.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 80),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }
        return out.slice(0, 6);
      });
      report.overflow.push(
        `${vp.name}: страница уезжает вбок на ${scrolledX}px (scrollWidth=${metrics.scrollWidth}) :: ${JSON.stringify(culprits)}`,
      );
    }

    for (const [label, sel] of STOPS) {
      const el = page.locator(sel);
      if ((await el.count()) === 0) continue;
      // Высокие секции scrollIntoViewIfNeeded центрирует, и кадр попадает в середину
      // анимации. Поэтому всегда ставим верх секции к верху окна.
      await page.evaluate((s) => {
        const node = document.querySelector(s);
        if (!node) return;
        const top = node.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, Math.max(0, top - 76));
      }, sel);
      await page.waitForTimeout(1500);
      const file = path.join(OUT, `${vp.name}-${label}.webp`);
      await page.screenshot({ path: file, type: 'webp', quality: 88 });
      report.shots.push(`${vp.name}-${label}`);

      // у секции плеера два такта: второй ловим отдельно, докрутив внутрь
      if (label === 'player') {
        await page.evaluate((s) => {
          const node = document.querySelector(s);
          if (!node) return;
          const top = node.getBoundingClientRect().top + window.scrollY;
          // внутри секции: её «липкий» участок = высота секции минус высота окна
          const range = Math.max(0, node.offsetHeight - window.innerHeight);
          window.scrollTo(0, top + range * 0.92);
        }, sel);
        await page.waitForTimeout(1700);
        const second = path.join(OUT, `${vp.name}-player-skip.webp`);
        await page.screenshot({ path: second, type: 'webp', quality: 88 });
        report.shots.push(`${vp.name}-player-skip`);
      }
    }

    if (vp.name === '1440') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, '1440-full.webp'), type: 'webp', quality: 80, fullPage: true });
      report.shots.push('1440-full');
    }

    await ctx.close();
  }

  // прогон с уменьшенным движением: контент обязан быть виден, движения нет
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    locale: 'ru-RU',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(ORIGIN, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, 'reduced-hero.webp'), type: 'webp', quality: 88 });
  await page.locator('#inside').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'reduced-inside.webp'), type: 'webp', quality: 88 });
  report.shots.push('reduced-hero', 'reduced-inside');
  await ctx.close();

  await browser.close();
  server.close();

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error('SHOOT FAILED:', e);
  process.exit(1);
});
