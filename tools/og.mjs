/**
 * og.mjs — картинка для соцсетей из готовой страницы.
 *
 *   npm run build && npm run og
 *
 * Снимает первый экран 1200×630 (обычные пропорции OG) собранной страницы и
 * кладёт JPEG в site/public/og.jpg: социальные сети AVIF и WebP не читают,
 * а JPEG — читают все. Снимается dist/, а не site/: у исходников нет ни
 * собранного CSS, ни запущенного React.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from './chrome.mjs';
import { start } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'public', 'og.jpg');
const PORT = 4179;

const { server, url } = await start('dist', PORT);
const browser = await chromium.launch({ executablePath: await findChrome() });

try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'ru-RU',
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('.hero__title');
  // вход героя (BlurText, по слову) и первый кадр лучей: снимаем устоявшуюся страницу
  await page.waitForTimeout(4200);
  // герой выше кадра OG, поэтому слегка уменьшаем масштаб: в кадр попадают
  // заголовок, плашки и большая часть телефона
  await page.evaluate(() => {
    document.documentElement.style.zoom = '0.88';
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 90 });
  const size = (await fs.stat(OUT)).size;
  console.log(`og: 1200×630, ${(size / 1024).toFixed(1)} KB -> site/public/og.jpg`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
