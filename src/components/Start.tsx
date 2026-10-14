import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { start } from '../data/copy';
import { ease } from '../lib/motion';
import { Phone } from './Phone';
import { Icon } from './ui/Icon';
import { Reveal } from './ui/Reveal';

const SCREENS = [{ id: 'auth', screen: start.screen, alt: start.screenAlt }];

/** Экран входа и три шага, между которыми прорисовывается линия по мере прокрутки. */
export function Start() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="start" className="relative scroll-mt-24 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell">
        <Reveal className="max-w-[38rem]">
          <span className="kicker">{start.kicker}</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
            {start.title}
          </h2>
        </Reveal>

        <div className="mt-[clamp(2.5rem,6vw,4rem)] grid items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)]">
          <Reveal y={40} className="order-1">
            <Phone
              screens={SCREENS}
              index={0}
              dots={false}
              caption={null}
              style={{ ['--phone-w' as string]: 'clamp(10rem,46vw,15rem)' }}
            />
          </Reveal>

          <div ref={ref} className="relative order-2">
            <span aria-hidden="true" className="absolute bottom-8 left-[1.75rem] top-8 w-px bg-white/8">
              <motion.span
                className="block h-full w-full origin-top bg-gradient-to-b from-accent to-accent/20"
                style={reduced ? { scaleY: 1 } : { scaleY }}
              />
            </span>

            <ol className="space-y-8">
              {start.steps.map((step, i) => (
                <motion.li
                  key={step.title}
                  className="relative flex gap-5"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-15% 0px' }}
                  transition={{ duration: 0.6, ease, delay: i * 0.12 }}
                >
                  <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/8 bg-card text-accent">
                    <Icon name={step.icon} size={22} />
                  </span>
                  <div className="pt-1.5">
                    <h3 className="text-[1.05rem] font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-mute">{step.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
