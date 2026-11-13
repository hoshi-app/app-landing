import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * usePrefersReducedMotion — системная настройка «меньше движения».
 *
 * Компоненты react-bits в основном чтят её сами, но canvas-фоны и WebGL
 * дешевле просто не монтировать. На сервере отвечает false: статический HTML
 * показывает то же, что увидел бы браузер без настройки.
 */
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}
