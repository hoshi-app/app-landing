import { motion, useReducedMotion } from 'motion/react';
import { cta } from '../data/copy';
import { easeOutExpo } from '../lib/motion';
import { StoreBadges } from './StoreBadges';
import { Star } from './ui/Brand';
import { Reveal } from './ui/Reveal';

export function FinalCta() {
  const reduced = useReducedMotion();

  return (
    <section id="download" className="relative scroll-mt-24 overflow-hidden py-[clamp(5rem,11vw,8rem)]">
      {/* водяной знак: та же звезда, что на иконке приложения */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-white/[0.035]"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -8 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: easeOutExpo }}
      >
        <Star size={520} />
      </motion.div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(60% 50% at 50% 50%, rgba(96,165,250,0.10), transparent 70%)',
        }}
      />

      <div className="shell-narrow flex flex-col items-center text-center">
        <Reveal>
          <h2 className="text-[clamp(2rem,5.4vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            {cta.title}
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 max-w-[42ch] text-[1.05rem] leading-relaxed text-mute">{cta.lead}</p>
        </Reveal>
        <Reveal delay={0.16} className="mt-10">
          <StoreBadges />
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-dim">{cta.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
