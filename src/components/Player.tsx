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
    <div className="grid gap-3 sm:grid-cols-3">
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
 * Текст занимает свою полосу сверху, поэтому ему не нужны затемнения поверх
 * картинки. Под ним — телефон крупнее окна: он выше своей области и шире её,
 * поэтому вылезает за края и читается как настоящий экран, а не картинка в рамке.
 *
 * Первый такт: телефон стоит так, что видно левую часть плеера, — это кадр без
 * подсказки пропуска и карточки про провайдеров и качество. Второй: телефон
 * уезжает влево, в кадре оказывается кнопка «Пропустить», а в полосе меняются
 * карточки — про пропуск заставок.
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

  const phoneX = useTransform(scrollYProgress, [0.28, 0.72], ['0vw', '-62vw']);
  // телефон выше своей области, поэтому во втором такте поднимаем его:
  // иначе кнопка «Пропустить» остаётся ниже кадра
  const phoneY = useTransform(scrollYProgress, [0.28, 0.72], ['0vh', '-34vh']);
  const cardsA = useTransform(scrollYProgress, [0, 0.34, 0.46], [1, 1, 0]);
  const cardsAY = useTransform(scrollYProgress, [0.34, 0.46], [0, -20]);
  const cardsB = useTransform(scrollYProgress, [0.54, 0.7], [0, 1]);
  const cardsBY = useTransform(scrollYProgress, [0.54, 0.7], [20, 0]);

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
        <div className="flex h-full flex-col">
          {/* полоса с текстом и карточками */}
          <div className="shell shrink-0 pb-8 pt-[9vh]">
            <div className="flex items-start gap-x-[clamp(2rem,4vw,4rem)]">
              <div className="max-w-[24rem] shrink-0">
                <span className="kicker">{player.kicker}</span>
                <h2 className="mt-4 text-[clamp(1.8rem,2.5vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
                  {player.title}
                </h2>
                <p className="mt-4 max-w-[36ch] text-[0.98rem] leading-relaxed text-mute">{player.lead}</p>
              </div>

              {/* два набора карточек сменяют друг друга на одном месте */}
              <div className="relative min-w-0 flex-1 pt-1">
                <motion.div style={reduced ? undefined : { opacity: cardsA, y: cardsAY }}>
                  <Cards features={player.featuresA} />
                </motion.div>
                <motion.div
                  className="absolute inset-x-0 top-1"
                  style={reduced ? { display: 'none' } : { opacity: cardsB, y: cardsBY }}
                >
                  <Cards features={player.featuresB} />
                </motion.div>
              </div>
            </div>
          </div>

          {/* область телефона: он больше её и вылезает за края */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <motion.div
              className="absolute left-[7%] top-0"
              style={
                reduced
                  ? { ['--phone-w' as string]: '118vh' }
                  : { x: phoneX, y: phoneY, ['--phone-w' as string]: '118vh' }
              }
            >
              <Phone screens={skipStage ? SKIP : IDLE} index={0} orientation="landscape" dots={false} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
