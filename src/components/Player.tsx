import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { player } from '../data/copy';
import { ease } from '../lib/motion';
import { Phone } from './Phone';
import { FeatureCard } from './ui/FeatureCard';

const IDLE = [{ id: player.screenIdle.id, screen: player.screenIdle.screen, alt: player.screenIdle.alt }];
const SKIP = [{ id: player.screenSkip.id, screen: player.screenSkip.screen, alt: player.screenSkip.alt }];

/**
 * Высота корпуса: минимум из доли ширины и доли высоты окна, чтобы на низких
 * окнах телефон ужимался, а не вылезал за рамки.
 */
const PHONE_H = 'min(57vw, 74vh)';

/** Доля ширины окна, которую телефон занимает в первом такте. */
const START_SHARE = 0.62;

/** Шапка фиксированная и перекрывает верх сцены — учитываем её при раскладке. */
const HEADER = 56;
/** Гарантированный отступ от шапки и от низа окна. */
const MARGIN = 30;
/** Зазор между карточками и телефоном. */
const GAP = 34;

/** Порог срабатывания с запасом: вниз — 0.30, назад — 0.16. */
const TRIGGER_DOWN = 0.3;
const TRIGGER_UP = 0.16;

/** Длительность самого переезда. */
const MOVE = 0.78;

function Cards({ features, layout }: { features: typeof player.featuresA; layout: 'row' | 'column' }) {
  return (
    <div className={layout === 'row' ? 'grid gap-3 sm:grid-cols-3' : 'flex flex-col gap-3'}>
      {features.map((f) => (
        <FeatureCard key={f.title} feature={f} titleAs="h3" />
      ))}
    </div>
  );
}

function Stacked() {
  return (
    <>
      <Cards features={player.featuresA} layout="row" />
      <div className="mt-8" style={{ ['--phone-w' as string]: '64vw' }}>
        <Phone screens={IDLE} index={0} orientation="landscape" dots={false} />
      </div>

      <div className="-ml-[clamp(1.25rem,5vw,2.5rem)] mt-14" style={{ ['--phone-w' as string]: '96vw' }}>
        <div style={{ marginLeft: 'calc(var(--phone-w) * -0.542)' }}>
          <Phone screens={SKIP} index={0} orientation="landscape" dots={false} />
        </div>
      </div>
      <div className="mt-8">
        <Cards features={player.featuresB} layout="column" />
      </div>
    </>
  );
}

export function Player() {
  const ref = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  /**
   * Раскладку первого такта считаем в JS: нужно уложить карточки и телефон так,
   * чтобы сверху остался зазор под шапкой, а снизу — до края окна. Иначе на
   * невысоких окнах телефон упирается в шапку и в нижний край.
   */
  const [layout, setLayout] = useState({ scale: 0.62, cardsTop: 80, phoneY: 130 });

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const baseH = Math.min(0.57 * w, 0.74 * h); // высота корпуса без масштаба
      const baseW = baseH * (1704 / 786);
      const cardsH = cardsRef.current?.offsetHeight ?? 210;

      const avail = h - HEADER - MARGIN * 2;
      const maxPhoneH = Math.max(120, avail - cardsH - GAP);
      // масштаб ограничен и шириной (60–70% экрана), и высотой
      const scale = Math.min((START_SHARE * w) / baseW, maxPhoneH / baseH);

      const phoneH = baseH * scale;
      const groupH = cardsH + GAP + phoneH;
      const groupTop = HEADER + (h - HEADER - groupH) / 2;
      const phoneCenter = groupTop + cardsH + GAP + phoneH / 2;
      // базовая точка телефона — центр области под шапкой
      const baseCenter = h / 2 + HEADER / 2;

      setLayout({ scale, cardsTop: groupTop, phoneY: phoneCenter - baseCenter });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  /**
   * Прокрутка только ЗАПУСКАЕТ переезд. Дальше анимация играет сама, за
   * фиксированное время, и не зависит от того, докуда долистали.
   */
  const [moved, setMoved] = useState(false);
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setMoved((cur) => (cur ? p > TRIGGER_UP : p > TRIGGER_DOWN));
  });

  // кадр меняем на середине переезда, а не в самом начале
  const [skipFrame, setSkipFrame] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSkipFrame(moved), moved ? (MOVE * 1000) / 2 : 0);
    return () => window.clearTimeout(id);
  }, [moved]);

  return (
    <section id="player" className="relative scroll-mt-24">
      <div className="shell pb-[clamp(1.5rem,3vw,2.5rem)] pt-[clamp(4rem,9vw,7rem)]">
        <span className="kicker">{player.kicker}</span>
        <h2 className="mt-4 max-w-[22ch] text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
          {player.title}
        </h2>
        <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-mute">{player.lead}</p>
      </div>

      {/* без анимации показываем те же две композиции столбиком */}
      <div className={`shell overflow-hidden pb-[clamp(4rem,9vw,7rem)] ${reduced ? '' : 'lg:hidden'}`}>
        <Stacked />
      </div>

      {!reduced && (
        <div ref={ref} className="hidden lg:block lg:h-[170vh]">
          <div className="lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden">
            <div className="relative h-full">
              {/* один телефон на оба такта. z-10 — карточки должны быть ПОД ним */}
              <motion.div
                className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{
                  ['--phone-w' as string]: PHONE_H,
                  top: `calc(50% + ${HEADER / 2}px)`,
                  z: 0,
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                }}
                initial={false}
                animate={{
                  x: moved ? '-50vw' : '0vw',
                  y: moved ? '0px' : `${layout.phoneY}px`,
                  scale: moved ? 1 : layout.scale,
                }}
                transition={{ duration: MOVE, ease: [0.32, 0.72, 0, 1] }}
              >
                <Phone screens={skipFrame ? SKIP : IDLE} index={0} orientation="landscape" dots={false} />
              </motion.div>

              {/* такт 1: карточки в ряд шириной как телефон. Уходят первыми */}
              <motion.div
                className="absolute inset-x-0"
                style={{ top: layout.cardsTop, willChange: 'opacity' }}
                initial={false}
                animate={{ opacity: moved ? 0 : 1 }}
                transition={{ duration: 0.28, ease }}
              >
                <div ref={cardsRef} className="mx-auto" style={{ width: `${START_SHARE * 100}vw` }}>
                  <Cards features={player.featuresA} layout="row" />
                </div>
              </motion.div>

              {/* такт 2: столбик справа. Приходит после того, как первые ушли */}
              <motion.div
                className="absolute left-[66%] top-1/2 w-[29%] -translate-y-1/2"
                style={{ willChange: 'opacity' }}
                initial={false}
                animate={{ opacity: moved ? 1 : 0 }}
                transition={{ duration: 0.3, ease, delay: moved ? 0.42 : 0 }}
              >
                <Cards features={player.featuresB} layout="column" />
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
