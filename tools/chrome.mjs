/**
 * chrome.mjs — где лежит Chromium для tools/og.mjs и tools/shoot.mjs.
 *
 * Сначала CHROME_PATH, потом сборка ms-playwright, потом системный Chrome.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export async function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const root = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  let dirs = [];
  try {
    dirs = (await fs.readdir(root)).filter((d) => d.startsWith('chromium-')).sort().reverse();
  } catch {
    /* Chromium не установлен — ищем системный Chrome */
  }
  for (const dir of dirs) {
    for (const sub of ['chrome-win64', 'chrome-win']) {
      const exe = path.join(root, dir, sub, 'chrome.exe');
      try {
        await fs.access(exe);
        return exe;
      } catch {
        /* следующий вариант */
      }
    }
  }

  for (const exe of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ]) {
    try {
      await fs.access(exe);
      return exe;
    } catch {
      /* следующий вариант */
    }
  }
  throw new Error('не найден Chromium или Chrome — задайте CHROME_PATH');
}
