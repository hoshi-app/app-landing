import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { look } from '../data/copy';
import { ease } from '../lib/motion';
import { Phone } from './Phone';
import { Reveal } from './ui/Reveal';

const SCREENS = look.steps.map((s) => ({ id: s.id, screen: s.screen, alt: s.alt }));

/**
 * Липкий телефон и рассказ, который едет мимо: активным считается шаг, ближайший
 * к центру экрана, — поэтому подсветка и экран в телефоне всегда совпадают с тем,
 * что человек читает прямо сейчас.
 */
export function Look() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const distance = Math.abs(r.top + r.height / 2 - mid);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive((cur) => (cur === best ? cur : best));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) =>
    stepRefs.current[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });

  return (
    <section id="look" className="relative scroll-mt-24 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell">
        <Reveal className="max-w-[42rem]">
          <span className="kicker">{look.kicker}</span>
          <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
            {look.title}
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-mute">{look.lead}</p>
        </Reveal>

        <div className="mt-[clamp(2.5rem,6vw,4rem)] grid gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          {/* на узком экране телефон залипает под шапкой и закрывает собой текст
              непрозрачной подложкой — иначе шаги просвечивают сквозь корпус */}
          <div className="sticky top-14 z-10 self-start bg-bg/92 pb-2 backdrop-blur-md lg:top-28 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none">
            <Phone
              screens={SCREENS}
              index={active}
              onSelect={goTo}
              style={{ ['--phone-w' as string]: 'clamp(9.5rem,44vw,19rem)' }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[-1rem] -bottom-8 h-10 bg-gradient-to-b from-bg to-transparent lg:hidden"
            />
          </div>

          <ol className="flex flex-col">
            {look.steps.map((step, i) => (
              <li
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="flex min-h-[52vh] items-center lg:min-h-[68vh]"
              >
                <motion.div
                  className="relative w-full pl-5"
                  initial={false}
                  animate={{ y: active === i ? 0 : 6 }}
                  transition={{ duration: 0.5, ease }}
                >
                  {/* Состояние шага показываем цветом, а не прозрачностью: прозрачность
                      уводила контраст текста ниже 4.5:1 и валила проверку доступности. */}
                  <span aria-hidden="true" className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-white/8">
                    <motion.span
                      className="block h-full w-full origin-top rounded-full bg-accent"
                      initial={false}
                      animate={{ scaleY: active === i ? 1 : 0 }}
                      transition={{ duration: 0.5, ease }}
                    />
                  </span>

                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-7 w-7 place-items-center rounded-full border text-[0.7rem] font-semibold transition-colors duration-500"
                      style={{
                        borderColor: active === i ? 'rgba(96,165,250,0.9)' : 'rgba(255,255,255,0.14)',
                        color: active === i ? '#60a5fa' : '#a1a1aa',
                        background: active === i ? 'rgba(96,165,250,0.12)' : 'transparent',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className={`kicker ${active === i ? 'text-accent' : ''}`}>{step.kicker}</span>
                  </div>

                  <h3
                    className={`mt-4 text-[clamp(1.35rem,3vw,2rem)] font-semibold leading-[1.15] tracking-[-0.02em] transition-colors duration-500 ${
                      active === i ? 'text-white' : 'text-soft'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`mt-3 max-w-[44ch] text-[0.98rem] leading-relaxed transition-colors duration-500 ${
                      active === i ? 'text-mute' : 'text-dim'
                    }`}
                  >
                    {step.text}
                  </p>

                  {/* прогресс шага */}
                  <span className="mt-6 block h-px w-full max-w-[16rem] overflow-hidden bg-white/8">
                    <motion.span
                      className="block h-full origin-left bg-accent"
                      initial={false}
                      animate={{ scaleX: active === i ? 1 : 0 }}
                      transition={{ duration: 0.5, ease }}
                    />
                  </span>
                </motion.div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
