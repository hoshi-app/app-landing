import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { faq } from '../data/copy';
import { ease } from '../lib/motion';
import { Icon } from './ui/Icon';
import { Reveal } from './ui/Reveal';

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();

  return (
    <section id="faq" className="relative scroll-mt-24 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell grid gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Reveal>
          <span className="kicker">{faq.kicker}</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
            {faq.title}
          </h2>
        </Reveal>

        <Reveal y={32}>
          <ul className="divide-y divide-white/8 border-y border-white/8">
            {faq.items.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span
                        className={`text-[1.02rem] font-medium transition-colors duration-300 ${isOpen ? 'text-white' : 'text-soft group-hover:text-white'}`}
                      >
                        {item.q}
                      </span>
                      <motion.span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                          isOpen ? 'border-accent/60 bg-accent/12 text-accent' : 'border-white/12 text-mute'
                        }`}
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.4, ease }}
                      >
                        <Icon name="chevron" size={16} />
                      </motion.span>
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: reduced ? 0.01 : 0.42, ease },
                          opacity: { duration: reduced ? 0.01 : 0.3, ease },
                        }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[62ch] pb-6 pr-12 text-[0.95rem] leading-relaxed text-mute">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
