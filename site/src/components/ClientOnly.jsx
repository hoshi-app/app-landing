import { useEffect, useState } from 'react';

/**
 * ClientOnly — рендерит содержимое только после монтирования.
 *
 * Нужен там, где компонент живым не нужен ни краулерам, ни в первом кадре:
 * canvas-фоны, WebGL-навигация и прочая анимация. Фолбэк уходит в статический
 * HTML, поэтому страница читается и работает до запуска скриптов, а на клиенте
 * первый рендер совпадает с серверным — расхождений при гидратации нет.
 */
export default function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : fallback;
}
