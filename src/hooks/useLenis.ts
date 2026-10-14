import Lenis from 'lenis';
import { useEffect } from 'react';

/**
 * Инерционная прокрутка. Включается только если пользователь не просил
 * уменьшить движение — иначе остаётся обычный нативный скролл.
 */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: -80 },
      lerp: 0.11,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    return () => lenis.destroy();
  }, [enabled]);
}
