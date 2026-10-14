import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { start } from '../data/copy';
import { ease } from '../lib/motion';
import { Icon } from './ui/Icon';
import { Reveal } from './ui/Reveal';

/** Три шага и линия, которая прорисовывается по мере прокрутки. */
export function Start() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="start" className="relative scroll-mt-24 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell">
        <Reveal className="max-w-[38rem]">
          <span className="kicker">{start.kicker}</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
            {start.title}
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-[clamp(2.5rem,6vw,4rem)]">
          {/* линия-коннектор: на широком экране горизонталь, на узком — вертикаль */}
          <span aria-hidden="true" className="absolute left-0 right-0 top-[2.15rem] hidden h-px bg-white/8 md:block">
            <motion.span
              className="block h-full origin-left bg-gradient-to-r from-accent to-accent/20"
              style={reduced ? { scaleX: 1 } : { scaleX }}
            />
          </span>
          <span aria-hidden="true" className="absolute bottom-6 left-[2.15rem] top-6 w-px bg-white/8 md:hidden">
            <motion.span
              className="block h-full w-full origin-top bg-gradient-to-b from-accent to-accent/20"
              style={reduced ? { scaleY: 1 } : { scaleY }}
            />
          </span>

          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
            {start.steps.map((step, i) => (
              <motion.li
                key={step.title}
                className="relative flex gap-5 md:flex-col md:gap-0"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-15% 0px' }}
                transition={{ duration: 0.6, ease, delay: i * 0.12 }}
              >
                <span className="relative z-10 grid h-[4.3rem] w-[4.3rem] shrink-0 place-items-center rounded-2xl border border-white/8 bg-card text-accent">
                  <Icon name={step.icon} size={22} />
                </span>
                <div className="md:mt-6">
                  <h3 className="text-[1.05rem] font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-mute">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
