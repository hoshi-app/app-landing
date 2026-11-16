/**
 * deploy.mjs — собрать сайт и выложить dist/ в ветку pages.
 *
 *   npm run deploy
 *
 * GitHub Pages настроен на ветку pages, каталог /(root). Ветка одноразовая:
 * каждый деплой перезаписывает её целиком, история проекта живёт в main.
 * CNAME и .nojekyll печёт tools/build.mjs — без CNAME GitHub снимает домен,
 * без .nojekyll Pages прогоняет статику через Jekyll.
 *
 * Работа идёт в .pages/ (в .gitignore), а не в dist/: иначе .git оказался бы
 * внутри сборки, которую Vite при следующем запуске стирает.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const WORK = path.join(ROOT, '.pages');

const git = (args, cwd = ROOT) =>
  execFileSync('git', args, { cwd, stdio: 'inherit' });
const node = (script) =>
  execFileSync(process.execPath, [path.join(ROOT, 'tools', script)], {
    cwd: ROOT,
    stdio: 'inherit',
  });

/* В pages уходит только то, что прошло verify — те же шаги, что в CI. */
node('build.mjs');
node('verify.mjs');

const origin = execFileSync('git', ['remote', 'get-url', 'origin'], {
  cwd: ROOT,
  encoding: 'utf8',
}).trim();

await fs.rm(WORK, { recursive: true, force: true });
await fs.cp(DIST, WORK, { recursive: true });

git(['init', '-q', '-b', 'pages'], WORK);
git(['add', '-A'], WORK);
git(['commit', '-q', '-m', `deploy: ${new Date().toISOString()}`], WORK);
git(['push', '-q', '-f', origin, 'pages'], WORK);

await fs.rm(WORK, { recursive: true, force: true });
console.log(`deploy: dist/ → ${origin}, ветка pages`);
