import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { hero, look } from '../data/copy';
import { ease, easeOutExpo } from '../lib/motion';
import { Aurora } from './Aurora';
import { Phone } from './Phone';
import { StoreBadges } from './StoreBadges';
import { Icon } from './ui/Icon';

const SCREENS = look.steps.map((s) => ({ id: s.id, screen: s.screen, alt: s.alt }));
const HERO_ORDER = ['title', 'episodes', 'search', 'home', 'auth', 'settings'];

export function Hero() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => HERO_ORDER.indexOf('title'));
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // порядок показа в герое: сначала самые «продающие» экраны
  const ordered = HERO_ORDER.map((id) => SCREENS.find((s) => s.id === id)).filter(Boolean) as typeof SCREENS;

  // автопереключение экранов
  useEffect(() => {
    if (reduced || paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % ordered.length), 4200);
    return () => window.clearInterval(t);
  }, [reduced, paused, ordered.length]);

  // наклон телефона за курсором
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), { stiffness: 90, damping: 18 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 90, damping: 18 });

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === 'touch') return;
    const r = sectionRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section
      id="top"
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative overflow-hidden pb-[clamp(3.5rem,9vw,6rem)] pt-[clamp(6.5rem,12vw,8.5rem)]"
    >
      <Aurora />

      <div className="shell relative flex flex-col items-center text-center">
        <motion.span
          className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs text-soft"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.15 }}
        >
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 rounded-full bg-live animate-pulse-ring" />
            <span className="h-2 w-2 rounded-full bg-live" />
          </span>
          {hero.eyebrow}
        </motion.span>

        <h1 className="mt-7 max-w-[18ch] text-[clamp(2.35rem,7.6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          {hero.title.split(' ').map((word, i) => (
            <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className="inline-block"
                initial={reduced ? { opacity: 0 } : { y: '108%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.9, ease: easeOutExpo, delay: 0.22 + i * 0.07 }}
              >
                {word}
                {i < hero.title.split(' ').length - 1 ? '\u00A0' : ''}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="mt-6 max-w-[46ch] text-[clamp(0.98rem,2.1vw,1.16rem)] leading-relaxed text-mute"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.5 }}
        >
          {hero.lead}
        </motion.p>

        <StoreBadges className="mt-9" />

        <motion.p
          className="mt-5 text-xs text-dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.85 }}
        >
          {hero.note}
        </motion.p>

        <motion.div
          className="mt-10 w-full [perspective:1600px] sm:mt-12"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: easeOutExpo, delay: 0.65 }}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <motion.div style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}>
            <Phone screens={ordered} index={index} onSelect={setIndex} />
          </motion.div>
        </motion.div>

        <motion.a
          href="#inside"
          className="mt-12 inline-flex flex-col items-center gap-2 text-xs text-dim transition-colors duration-300 hover:text-soft"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <span className="uppercase tracking-[0.18em]">{hero.primary}</span>
          <span className="relative grid h-9 w-5 place-items-start overflow-hidden rounded-full border border-white/12">
            <span className="mt-1 h-2 w-2 rounded-full bg-accent animate-float" style={{ animation: 'scroll-hint 2.4s ease-in-out infinite' }} />
          </span>
          <Icon name="arrowDown" size={14} />
        </motion.a>
      </div>
    </section>
  );
}
