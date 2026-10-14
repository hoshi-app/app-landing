import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Star, Wordmark } from './ui/Brand';
import { easeOutExpo } from '../lib/motion';

/**
 * Заставка при входе — повторяет BrandSplash из приложения: звезда влетает
 * пружиной, слово подъезжает следом. Показывается один раз за сессию и
 * полностью пропускается при reduced-motion.
 */
export function Splash() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;
    try {
      if (sessionStorage.getItem('hoshi:splash')) return;
      sessionStorage.setItem('hoshi:splash', '1');
    } catch {
      /* приватный режим — просто показываем */
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1500);
    return () => window.clearTimeout(t);
  }, [reduced]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55, ease: easeOutExpo } }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.span
              className="text-white"
              initial={{ scale: 0.35, opacity: 0, rotate: -18 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            >
              <Star size={72} />
            </motion.span>
            <motion.span
              className="text-white"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.28 }}
            >
              <Wordmark height={26} />
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
