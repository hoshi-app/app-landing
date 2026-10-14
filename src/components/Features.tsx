import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { chapters, type Feature } from '../data/copy';
import { asset } from '../lib/asset';
import { ease } from '../lib/motion';
import { Icon } from './ui/Icon';
import { Reveal } from './ui/Reveal';

/** Карточка с «прожектором»: рамка подсвечивается там, где курсор. */
function SpotlightCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="card edge-glow group relative h-full overflow-hidden p-5"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(16rem circle at var(--spot-x, 50%) var(--spot-y, 0%), rgba(96,165,250,0.10), transparent 65%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <SpotlightCard>
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/8 bg-white/4 text-accent">
        <Icon name={feature.icon} size={17} />
      </span>
      <h3 className="mt-4 text-[0.95rem] font-semibold text-white">{feature.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-mute">{feature.text}</p>
    </SpotlightCard>
  );
}

/**
 * Три главы «Что внутри». Каждая — экран приложения с одной стороны и сетка фич
 * с другой; главы чередуют сторону, чтобы взгляд не замыливался.
 */
export function Features() {
  const reduced = useReducedMotion();

  return (
    <section id="inside" className="relative scroll-mt-24 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell">
        <Reveal className="max-w-[42rem]">
          <span className="kicker">Что внутри</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
            Всё, за чем ходят в аниме-приложение, — и ничего лишнего
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-mute">
            Три вещи, которые решают всё: найти нужный тайтл, не потерять свой список и досмотреть серию до конца.
          </p>
        </Reveal>

        <div className="mt-[clamp(3rem,7vw,5.5rem)] space-y-[clamp(4rem,9vw,7rem)]">
          {chapters.map((chapter, ci) => {
            const flipped = ci % 2 === 1;
            return (
              <div key={chapter.id} className="grid items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-2">
                <Reveal className={flipped ? 'lg:order-2' : ''}>
                  <span className="kicker">{chapter.kicker}</span>
                  <h3 className="mt-4 text-[clamp(1.55rem,3.4vw,2.35rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
                    {chapter.title}
                  </h3>
                  <p className="mt-4 max-w-[42ch] text-[1rem] leading-relaxed text-mute">{chapter.lead}</p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {chapter.features.map((f, i) => (
                      <motion.div
                        key={f.title}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10% 0px' }}
                        transition={{ duration: 0.55, ease, delay: Math.min(i * 0.05, 0.3) }}
                      >
                        <FeatureCard feature={f} />
                      </motion.div>
                    ))}
                  </div>
                </Reveal>

                <Reveal className={flipped ? 'lg:order-1' : ''} y={40}>
                  <figure className="relative mx-auto max-w-[min(100%,22rem)]">
                    <div
                      aria-hidden="true"
                      className="absolute -inset-8 -z-10 rounded-[3rem] opacity-60 blur-3xl"
                      style={{
                        background:
                          'radial-gradient(50% 45% at 50% 30%, rgba(96,165,250,0.22), transparent 72%)',
                      }}
                    />
                    <div className="overflow-hidden rounded-[2rem] border border-white/8 bg-bg shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
                      <img
                        src={asset(chapter.screen)}
                        alt={chapter.screenAlt}
                        width={780}
                        height={1688}
                        loading="lazy"
                        decoding="async"
                        className="w-full"
                      />
                    </div>
                    <figcaption className="mt-4 text-center text-xs text-dim">
                      {chapter.screenAlt}
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
