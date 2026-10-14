/**
 * capture-app.mjs — снимает экраны приложения hoshi из уже собранного web-экспорта.
 *
 *   npm run capture        → .capture/*.webp
 *
 * Что делает:
 *   1) поднимает мини-сервер на http://127.0.0.1:4173, отдающий C:\dev\AnimeApp\app\dist
 *      (Metro и сборка не нужны — экспорт уже лежит в dist). Неизвестные пути отдают
 *      index.html, иначе deep-link'и /search, /settings, /release/:id падают в 404;
 *   2) обходит CORS: любой чужой origin переигрывается через route.fetch() из Node, где
 *      CORS не существует, и возвращается браузеру с разрешающими заголовками. Origin и
 *      Referer срезаются — так же, как само приложение делает для CVH-CDN;
 *   3) прячет модалку входа: без аккаунта Shikimori она закрывает весь интерфейс и
 *      возвращается на каждой перезагрузке, поэтому вызывается после каждого перехода;
 *   4) на «Главной» убирает только битую плашку «Сейчас на экранах»: в этой сборке она
 *      рисуется лишь при isDesktop (в коде `isDesktop ? run('blocks') : 'error'`), то есть
 *      на телефоне её содержимого нет в принципе — иначе в кадре остаётся красная строка
 *      ошибки. Остальное на экране — как есть;
 *   5) снимает экраны в .capture/ при 390x844 @2x (780x1688).
 *
 * В C:\dev\AnimeApp ничего не меняется.
 */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const DIST = 'C:\\dev\\AnimeApp\\app\\dist';
const OUT = path.resolve('.capture');
const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** Ищем уже установленный браузер Playwright, чтобы не качать его заново. */
async function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  const dirs = (await fs.readdir(root)).filter((d) => d.startsWith('chromium-')).sort();
  for (const d of dirs.reverse()) {
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

function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, ORIGIN);
    const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' }).end(body);
    } catch {
      // SPA-фолбэк: /search, /settings, /release/:id — маршруты react-navigation на web,
      // файлов под них нет, отдаём тот же index.html
      try {
        const html = await fs.readFile(path.join(DIST, 'index.html'));
        res.writeHead(200, { 'content-type': MIME['.html'] }).end(html);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      }
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const server = await startServer();
  const proxied = new Map();
  const errors = [];
  const log = [];

  const browser = await chromium.launch({ executablePath: await findChrome() });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    // у i.kodikres.com просрочен сертификат — без этого кадры серий не грузятся
    ignoreHTTPSErrors: true,
  });

  // --- обход CORS для всего, что не наш мини-сервер ---
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (url.startsWith(ORIGIN)) return route.continue();

    const origin = req.headers()['origin'] ?? '*';
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': '*',
      'access-control-allow-headers': '*',
      'access-control-expose-headers': '*',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });

    try {
      const headers = { ...req.headers() };
      delete headers.origin; // CVH-CDN отбивает запросы с Origin
      delete headers.referer;
      delete headers.host;
      const response = await route.fetch({ headers });
      const skip = new Set(['content-encoding', 'content-length', 'transfer-encoding']);
      const out = {};
      for (const [k, v] of Object.entries(response.headers())) if (!skip.has(k.toLowerCase())) out[k] = v;
      const host = new URL(url).host;
      proxied.set(host, (proxied.get(host) ?? 0) + 1);
      return route.fulfill({ response, headers: { ...out, ...cors } });
    } catch (e) {
      if (!/context disposed/i.test(e.message)) log.push(`PROXY FAIL ${url} :: ${e.message.slice(0, 90)}`);
      return route.abort().catch(() => {});
    }
  });

  const p = await ctx.newPage();
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });

  /** Прячет модалку входа. Возвращает приняли ли её вообще. */
  const hideAuth = () =>
    p.evaluate(() => {
      const area = (el) => {
        const r = el.getBoundingClientRect();
        return r.width * r.height;
      };
      const nodes = Array.from(document.querySelectorAll('div'))
        .filter((el) => el.textContent?.includes('Войти через Shikimori'))
        .sort((a, b) => area(a) - area(b));
      if (!nodes.length) return false;
      let target = nodes[0];
      for (let el = nodes[0]; el && el !== document.body; el = el.parentElement) {
        target = el;
        const r = el.getBoundingClientRect();
        if (r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95) break;
      }
      target.style.display = 'none';
      return true;
    });

  /** Клик по листовому элементу с точным текстом — по координатам его центра. */
  const clickText = async (needle) => {
    const box = await p.evaluate((needle) => {
      const leaf = Array.from(document.querySelectorAll('div,span')).find(
        (el) => el.children.length === 0 && (el.textContent ?? '').trim() === needle,
      );
      if (!leaf) return null;
      const r = leaf.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, needle);
    if (!box) return false;
    await p.mouse.click(box.x, box.y);
    return true;
  };

  /** Клик правее первого листового элемента, чей текст подходит под регулярку. */
  const clickRightOf = async (re, dx) => {
    const box = await p.evaluate(
      ({ source, flags, dx }) => {
        const rx = new RegExp(source, flags);
        const leaf = Array.from(document.querySelectorAll('div,span')).find(
          (el) => el.children.length === 0 && rx.test((el.textContent ?? '').trim()),
        );
        if (!leaf) return null;
        const r = leaf.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: r.right + dx, y: r.top + r.height / 2 };
      },
      { source: re.source, flags: re.flags, dx },
    );
    if (!box) return false;
    await p.mouse.click(box.x, box.y);
    return true;
  };

  /** Ждём тишину в сети и догрузку картинок, потом даём анимациям устояться. */
  const settle = async (ms = 12000) => {
    await p.waitForLoadState('networkidle', { timeout: ms }).catch(() => {});
    await p
      .waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: ms })
      .catch(() => {});
    await p.waitForTimeout(2000);
  };

  const shot = async (name) => {
    await settle();
    const file = path.join(OUT, `${name}.webp`);
    await p.screenshot({ path: file, type: 'webp', quality: 92 });
    const { size } = await fs.stat(file);
    log.push(`shot ${name} (${Math.round(size / 1024)} KB)`);
  };

  const textVisible = async (t, timeout = 25000) => {
    try {
      await p.getByText(t, { exact: false }).first().waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  };

  /** Переход + снятие модалки входа + ожидание контента. */
  const go = async (routePath, waitText) => {
    await p.goto(`${ORIGIN}${routePath}`, { waitUntil: 'domcontentloaded' });
    await p.getByText('Войти через Shikimori').first().waitFor({ state: 'visible', timeout: 40000 }).catch(() => {});
    const hidden = await hideAuth();
    const shown = waitText ? await textVisible(waitText, 30000) : true;
    log.push(`go ${routePath} authHidden=${hidden} content=${shown}`);
    return shown;
  };

  // 1. экран входа
  await p.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
  log.push(`auth: ${await textVisible('Войти через Shikimori', 40000)}`);
  await shot('auth');

  // 2. Главная (без битой плашки «Сейчас на экранах»)
  await go('/', 'Скоро выйдет');
  const dropped = await p.evaluate(() => {
    const err = Array.from(document.querySelectorAll('div')).find(
      (el) => el.children.length === 0 && (el.textContent ?? '').trim() === 'Не удалось загрузить подборку',
    );
    if (!err) return false;
    let block = err;
    for (let el = err; el && el !== document.body; el = el.parentElement) {
      if ((el.textContent ?? '').includes('Сейчас на экранах')) {
        block = el;
        break;
      }
    }
    block.style.display = 'none';
    return true;
  });
  log.push(`home error-rail dropped: ${dropped}`);
  await p.mouse.wheel(0, 300);
  await p.waitForTimeout(3000);
  await p.mouse.wheel(0, -300);
  await shot('home');

  // 3. Поиск — каталог карточек. Постеры подтягиваются лениво: прокручиваем и ждём.
  await go('/search', 'Поиск');
  await p.mouse.wheel(0, 400);
  await p.waitForTimeout(3000);
  await p.mouse.wheel(0, -400);
  await settle();
  await shot('search');

  // 4. Настройки
  await go('/settings', 'Настройки');
  await shot('settings');

  // 5. Тайтл (Дандадан)
  await go('/release/57334', 'Смотреть');
  await shot('title');

  // 6. Серии — с тайтла по кнопке «Смотреть»
  log.push(`episodes click: ${await clickText('Смотреть')}`);
  log.push(`episodes: ${await textVisible('Серии', 30000)}`);
  await shot('episodes');

  // 7. Плеер — жмём ▶ у первой озвучки (правее счётчика «N/N сер.»)
  log.push(`player click: ${await clickRightOf(/^\d+\/\d+ сер\.$/, 31)}`);
  await p.waitForTimeout(12000);
  await shot('player');

  await p.waitForTimeout(1500); // даём догореть висящим запросам перед закрытием
  await browser.close();
  server.close();

  const hosts = Object.fromEntries([...proxied.entries()].sort((a, b) => b[1] - a[1]));
  console.log(JSON.stringify({ log, hosts, errors: [...new Set(errors)].slice(0, 10) }, null, 2));
}

main().catch((e) => {
  console.error('CAPTURE FAILED:', e);
  process.exit(1);
});
