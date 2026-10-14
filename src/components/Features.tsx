import { motion, useReducedMotion } from 'motion/react';
import { chapters } from '../data/copy';
import { ease } from '../lib/motion';
import { Phone } from './Phone';
import { FeatureCard } from './ui/FeatureCard';
import { Reveal } from './ui/Reveal';

/**
 * «Что внутри»: интро в две колонки, дальше три главы. У каждой главы свой
 * экран приложения рядом — он едет вместе с текстом, а не висит на месте,
 * и стороны чередуются, чтобы взгляд не замыливался.
 */
export function Features() {
  const reduced = useReducedMotion();

  return (
    <section id="inside" className="relative scroll-mt-24 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell">
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-12">
          <div>
            <span className="kicker">Что внутри</span>
            <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
              Найти, вести, досмотреть
            </h2>
          </div>
          <p className="max-w-[46ch] text-[1.02rem] leading-relaxed text-mute lg:pb-1.5">
            Три вещи, за которыми открывают аниме-приложение: найти нужный тайтл, не потерять свой список и дойти до
            конца серии.
          </p>
        </Reveal>

        <div className="mt-[clamp(3rem,7vw,5.5rem)] space-y-[clamp(4rem,9vw,7rem)]">
          {chapters.map((chapter, ci) => {
            const flipped = ci % 2 === 1;
            return (
              <div key={chapter.id} className="grid items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-2">
                <Reveal className={flipped ? 'lg:order-2' : ''}>
                  <span className="kicker">{chapter.kicker}</span>
                  <h3 className="mt-4 max-w-[24ch] text-[clamp(1.5rem,3.2vw,2.2rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
                    {chapter.title}
                  </h3>
                  <p className="mt-4 max-w-[50ch] text-[1rem] leading-relaxed text-mute">{chapter.lead}</p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {chapter.features.map((f, i) => (
                      <motion.div
                        key={f.title}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10% 0px' }}
                        transition={{ duration: 0.55, ease, delay: Math.min(i * 0.05, 0.25) }}
                      >
                        <FeatureCard feature={f} />
                      </motion.div>
                    ))}
                  </div>
                </Reveal>

                <Reveal className={flipped ? 'lg:order-1' : ''} y={40}>
                  <Phone
                    screens={[{ id: chapter.id, screen: chapter.screen, alt: chapter.screenAlt }]}
                    index={0}
                    dots={false}
                    style={{ ['--phone-w' as string]: 'clamp(9.5rem,48vw,19rem)' }}
                  />
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
