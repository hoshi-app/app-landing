import { renderToString } from 'react-dom/server';
import App from './App.jsx';

/**
 * entry-server.jsx — точка входа SSR-сборки для tools/build.mjs.
 *
 * Отдаёт статическую разметку приложения для конкретного адреса: сборка
 * рендерит главную и каждый юридический документ отдельным HTML. Живут здесь
 * только те компоненты, которые безопасны без DOM: всё, что рисуется в canvas
 * или считает позиции при монтировании, обёрнуто в <ClientOnly> и на сервере
 * отдаёт фолбэк.
 */
export function render(path = '/') {
  return renderToString(<App path={path} />);
}

/** 404 отдаётся на произвольный адрес, поэтому рендерится без пути. */
export function render404() {
  return renderToString(<App notFound />);
}
