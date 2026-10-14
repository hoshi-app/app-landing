import { motion, useReducedMotion } from 'motion/react';
import { hero } from '../data/copy';
import { ease, easeOutExpo } from '../lib/motion';
import { Aurora } from './Aurora';
import { StoreBadges } from './StoreBadges';

export function Hero() {
  const reduced = useReducedMotion();
  const words = hero.title.split(' ');

  return (
    <section id="top" className="relative overflow-hidden pb-[clamp(1.5rem,4vw,2.5rem)] pt-[clamp(6.5rem,12vw,8.5rem)]">
      <Aurora />

      <div className="shell relative flex min-h-[62svh] flex-col items-center justify-center text-center">
        <h1 className="max-w-[20ch] text-[clamp(2.5rem,7.8vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.04em]">
          {words.map((word, i) => (
            <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <motion.span
                className="inline-block"
                initial={reduced ? { opacity: 0 } : { y: '108%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.9, ease: easeOutExpo, delay: 0.15 + i * 0.06 }}
              >
                {word}
                {i < words.length - 1 ? '\u00A0' : ''}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="mt-6 max-w-[54ch] text-[clamp(1rem,2.1vw,1.15rem)] leading-relaxed text-mute"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.42 }}
        >
          {hero.lead}
        </motion.p>

        <StoreBadges className="mt-10" />

        <motion.p
          className="mt-5 text-xs text-dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {hero.note}
        </motion.p>
      </div>
    </section>
  );
}
