/**
 * serve.mjs — статическая раздача с честным сжатием.
 *
 *   npm run dev       → site/ на http://127.0.0.1:5173/
 *   npm run preview   → dist/ на http://127.0.0.1:4174/
 *
 * Экспортирует start(), чтобы tools/shoot.mjs и tools/og.mjs поднимали этот же
 * сервер, а не копировали раздачу у себя. Сжимает текст так же, как хостинг:
 * без этого замеры «сколько весит страница» врут.
 */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

/** Что сжимаем: только текст, картинки уже сжаты своим форматом. */
const COMPRESSIBLE = /^(text\/|application\/(javascript|json)|image\/svg)/;

/**
 * Сжатые тела кэшируются по пути и времени правки. Brotli 600-килобайтного
 * бандла — это сотни миллисекунд синхронной работы, и без кэша сервер на это
 * время перестаёт отвечать: шрифты и картинки приезжают позже, чем в жизни,
 * и замеры LCP врут.
 */
const cache = new Map();

async function compressed(file, body, encoding) {
  // У SPA-фолбэка файла на диске может не быть (клиент просит неизвестный
  // путь) — тогда сжимаем без кэша, а не падаем на stat.
  let stamp = `${body.length}`;
  try {
    stamp = String((await fs.stat(file)).mtimeMs);
  } catch {
    /* кэшировать нечем — сожмём каждый раз */
  }
  const key = `${file}:${stamp}:${encoding}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const packed = encoding === 'br' ? zlib.brotliCompressSync(body) : zlib.gzipSync(body);
  cache.set(key, packed);
  return packed;
}

function handler(root) {
  return async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    let file = path.normalize(path.join(root, rel));

    // адрес с «/» на конце — это каталог, как на GitHub Pages: /faq/changelog/
    if (rel.endsWith('/')) file = path.join(file, 'index.html');

    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }

    let body;
    let type;
    let status = 200;
    try {
      body = await fs.readFile(file);
      type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    } catch {
      // без расширения сначала пробуем одноимённый .html: /terms -> terms.html,
      // иначе главная отдавала бы разметку лендинга на адресе документа
      const alias = `${file}.html`;
      try {
        body = await fs.readFile(alias);
        file = alias;
        type = MIME['.html'];
      } catch {
        // и каталог без слэша: /faq/changelog -> /faq/changelog/index.html
        const index = path.join(file, 'index.html');
        try {
          body = await fs.readFile(index);
          file = index;
          type = MIME['.html'];
        } catch {
          // неизвестный путь — своя 404-страница и код 404, как на GitHub Pages
          file = path.join(root, '404.html');
          try {
            body = await fs.readFile(file);
            type = MIME['.html'];
            status = 404;
          } catch {
            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
            return;
          }
        }
      }
    }

    const headers = { 'content-type': type, 'cache-control': 'no-cache' };
    const accepted = String(req.headers['accept-encoding'] ?? '');

    if (COMPRESSIBLE.test(type) && body.length > 512) {
      const encoding = accepted.includes('br') ? 'br' : accepted.includes('gzip') ? 'gzip' : null;
      if (encoding) {
        headers['content-encoding'] = encoding;
        body = await compressed(file, body, encoding);
      }
    }

    res.writeHead(status, headers).end(body);
  };
}

/**
 * Поднимает раздачу каталога. Возвращает сервер и адрес — закрывать сервер
 * вызывающему коду.
 */
export function start(dir = 'dist', port = 4174, host = '127.0.0.1') {
  const root = path.resolve(ROOT, dir);
  const server = http.createServer(handler(root));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const shown = host === '0.0.0.0' ? '127.0.0.1' : host;
      resolve({ server, url: `http://${shown}:${port}/` });
    });
  });
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  // HOST=0.0.0.0 — открыть сайт в локальной сети, а не только на этой машине.
  // В cmd `set HOST=0.0.0.0 && …` кладёт в значение хвостовой пробел, и
  // getaddrinfo падает на "0.0.0.0 " — отсюда trim.
  const host = (process.env.HOST ?? '').trim() || '127.0.0.1';
  const [dir = 'dist', port = '4174'] = process.argv.slice(2);
  const { url } = await start(dir, Number(port), host);
  console.log(`landing: ${url}  (${dir}/, ${host})`);
}
