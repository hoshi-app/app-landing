import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Star, Wordmark } from './ui/Brand';

/**
 * Заставка при входе — один в один как BrandSplash в приложении:
 * звезда влетает пружиной (scale 0.7 → 1, без вращения), через 420 мс снизу
 * подъезжает вордмарк на 14 px, вся сцена держится ~1.15 c и гаснет за 320 мс.
 * Фон, размеры и паузы взяты из app/src/ui/BrandSplash.tsx.
 */
export function Splash() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;
    setVisible(true);
    // 1150 мс — минимальное время показа из приложения, потом +320 мс на затухание
    const t = window.setTimeout(() => setVisible(false), 1150);
    return () => window.clearTimeout(t);
  }, [reduced]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.32, ease: 'easeOut' } }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center" style={{ gap: 22 }}>
            <motion.span
              className="text-white"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 11, mass: 0.7 }}
            >
              <Star size={110} />
            </motion.span>

            <motion.span
              className="text-white"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.36, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Wordmark height={51} />
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
