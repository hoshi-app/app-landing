import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { player } from '../data/copy';
import { ease } from '../lib/motion';
import { Phone } from './Phone';
import { FeatureCard } from './ui/FeatureCard';
import { Reveal } from './ui/Reveal';

const SCREENS = player.screens.map((s) => ({ id: s.id, screen: s.screen, alt: s.alt }));

/** Отдельная секция про плеер: ландшафтный кадр вместо портретного макета. */
export function Player() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  return (
    <section id="player" className="relative scroll-mt-24 overflow-hidden py-[clamp(4rem,9vw,7rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60%]"
        style={{ background: 'radial-gradient(70% 60% at 50% 0%, rgba(96,165,250,0.10), transparent 70%)' }}
      />

      <div className="shell">
        <Reveal className="max-w-[46rem]">
          <span className="kicker">{player.kicker}</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
            {player.title}
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-mute">{player.lead}</p>
        </Reveal>

        <Reveal y={40} className="mt-[clamp(2rem,5vw,3.5rem)]">
          <Phone
            screens={SCREENS}
            index={index}
            onSelect={setIndex}
            orientation="landscape"
            caption={null}
            style={{ ['--phone-w' as string]: 'min(100%, 56rem)' }}
          />
        </Reveal>

        <div className="mt-[clamp(2.5rem,6vw,4rem)] grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {player.features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.55, ease, delay: Math.min(i * 0.05, 0.25) }}
            >
              <FeatureCard feature={f} titleAs="h3" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
