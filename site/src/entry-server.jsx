import { renderToString } from 'react-dom/server';
import App from './App.jsx';

/**
 * entry-server.jsx — точка входа SSR-сборки для tools/build.mjs.
 *
 * Отдаёт статическую разметку приложения. Живут здесь только те компоненты,
 * которые безопасны без DOM: всё, что рисуется в canvas или считает позиции
 * при монтировании, обёрнуто в <ClientOnly> и на сервере отдаёт фолбэк.
 */
export function render() {
  return renderToString(<App />);
}
