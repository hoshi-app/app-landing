/**
 * serve.mjs — отдаёт собранный dist по-честному, как на хостинге.
 *
 *   node tools/serve.mjs [порт]        по умолчанию 4174
 *
 * Нужен, чтобы посмотреть сборку до публикации: у Vite preview тот же смысл, но
 * этот сервер не зависит от node_modules и одинаково работает из подпапки.
 */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const DIST = path.resolve('dist');
const PORT = Number(process.argv[2] ?? 4174);

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
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(DIST, rel));

  if (!file.startsWith(DIST)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const body = await fs.readFile(file);
    res
      .writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-cache',
      })
      .end(body);
  } catch {
    try {
      const html = await fs.readFile(path.join(DIST, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] }).end(html);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`landing: http://127.0.0.1:${PORT}/`);
});
