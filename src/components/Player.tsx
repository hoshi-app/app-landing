import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import { player } from '../data/copy';
import { ease } from '../lib/motion';
import { Phone } from './Phone';
import { FeatureCard } from './ui/FeatureCard';

const IDLE = [{ id: player.screenIdle.id, screen: player.screenIdle.screen, alt: player.screenIdle.alt }];
const SKIP = [{ id: player.screenSkip.id, screen: player.screenSkip.screen, alt: player.screenSkip.alt }];

function Cards({ features }: { features: typeof player.featuresA }) {
  return (
    <div className="space-y-3">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.55, ease, delay: i * 0.06 }}
        >
          <FeatureCard feature={f} titleAs="h3" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Плеер во весь экран, в два такта.
 *
 * Телефон здесь большой: он выше окна и шире его, поэтому вылезает за края и
 * читается как настоящий экран, а не как картинка в рамке. Сначала он стоит
 * так, что видно левую часть плеера, — это кадр без подсказки пропуска и
 * карточки про провайдеров и качество. Дальше телефон уезжает влево: в кадре
 * оказывается кнопка «Пропустить», а справа появляются карточки про неё.
 */
export function Player() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [skipStage, setSkipStage] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = p > 0.5;
    setSkipStage((cur) => (cur === next ? cur : next));
  });

  const phoneX = useTransform(scrollYProgress, [0.28, 0.72], ['10vw', '-24vw']);
  const scrimLeft = useTransform(scrollYProgress, [0.3, 0.55], [1, 0.25]);
  const scrimRight = useTransform(scrollYProgress, [0.3, 0.55], [0.25, 1]);
  const cardsA = useTransform(scrollYProgress, [0.05, 0.3, 0.44], [0, 1, 0]);
  const cardsAY = useTransform(scrollYProgress, [0.3, 0.44], [0, -24]);
  const cardsB = useTransform(scrollYProgress, [0.54, 0.72], [0, 1]);
  const cardsBY = useTransform(scrollYProgress, [0.54, 0.72], [24, 0]);

  return (
    <section id="player" ref={ref} className="relative scroll-mt-24 lg:h-[260vh]">
      {/* --- мобильный вариант: то же самое, но столбиком и без хореографии --- */}
      <div className="shell overflow-hidden py-[clamp(4rem,9vw,7rem)] lg:hidden">
        <span className="kicker">{player.kicker}</span>
        <h2 className="mt-4 text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
          {player.title}
        </h2>
        <p className="mt-4 text-[1.02rem] leading-relaxed text-mute">{player.lead}</p>

        <div className="-mx-[clamp(1.25rem,5vw,2.5rem)] mt-10" style={{ ['--phone-w' as string]: '62vw' }}>
          <Phone screens={IDLE} index={0} orientation="landscape" dots={false} />
        </div>
        <div className="mt-8">
          <Cards features={player.featuresA} />
        </div>

        <div className="-mx-[clamp(1.25rem,5vw,2.5rem)] mt-12" style={{ ['--phone-w' as string]: '62vw' }}>
          <Phone screens={SKIP} index={0} orientation="landscape" dots={false} />
        </div>
        <div className="mt-8">
          <Cards features={player.featuresB} />
        </div>
      </div>

      {/* --- десктоп: липкая сцена с прокруткой --- */}
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-hidden">
        <div className="relative h-full">
          {/* затемнение по краям: слева в первом такте, справа во втором */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-[46%] bg-[linear-gradient(90deg,#121212_0%,rgba(18,18,18,0.94)_38%,rgba(18,18,18,0.42)_68%,transparent_100%)]"
            style={reduced ? undefined : { opacity: scrimLeft }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-[46%] bg-[linear-gradient(270deg,#121212_0%,rgba(18,18,18,0.94)_38%,rgba(18,18,18,0.42)_68%,transparent_100%)]"
            style={reduced ? undefined : { opacity: scrimRight }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[30vh] bg-[linear-gradient(180deg,#121212_0%,rgba(18,18,18,0.72)_48%,transparent_100%)]"
          />

          {/* телефон: выше окна и шире его — вылезает за края */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={
              reduced
                ? { ['--phone-w' as string]: '104vh' }
                : { x: phoneX, ['--phone-w' as string]: '104vh' }
            }
          >
            <Phone screens={skipStage ? SKIP : IDLE} index={0} orientation="landscape" dots={false} />
          </motion.div>

          {/* текст поверх */}
          <div className="absolute left-[4vw] top-[10vh] z-10 max-w-[30rem]">
            <span className="kicker">{player.kicker}</span>
            <h2 className="mt-4 text-[clamp(1.9rem,3.2vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
              {player.title}
            </h2>
            <p className="mt-4 max-w-[38ch] text-[1rem] leading-relaxed text-mute">{player.lead}</p>
          </div>

          <motion.div
            className="absolute left-[4vw] top-[38vh] z-10 w-[21rem]"
            style={reduced ? undefined : { opacity: cardsA, y: cardsAY }}
          >
            <Cards features={player.featuresA} />
          </motion.div>

          <motion.div
            className="absolute right-[4vw] top-[32vh] z-10 w-[21rem]"
            style={reduced ? undefined : { opacity: cardsB, y: cardsBY }}
          >
            <Cards features={player.featuresB} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
