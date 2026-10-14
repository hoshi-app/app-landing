import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { ease } from '../../lib/motion';

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
};

/**
 * Появление блока при прокрутке: подъём + снятие блюра. При reduced-motion
 * остаётся только прозрачность — движение выключено.
 */
export function Reveal({ children, delay = 0, y = 26, className, once = true }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y, filter: 'blur(10px)' }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: reduced ? 0.35 : 0.75, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
