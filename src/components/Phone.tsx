import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { asset } from '../lib/asset';
import { easeOutExpo } from '../lib/motion';
import { Icon } from './ui/Icon';

export type Screen = { id: string; screen: string; alt: string };

type Props = {
  screens: Screen[];
  index: number;
  onSelect?: (index: number) => void;
  orientation?: 'portrait' | 'landscape';
  className?: string;
  style?: CSSProperties;
  /** подпись под точками; null — не показывать */
  caption?: string | null;
  dots?: boolean;
};

/** Ширина экрана устройства в логических точках: iPhone 15 Pro в портрете и ландшафте. */
const DEVICE_PT = { portrait: 393, landscape: 852 };

/**
 * Макет телефона: титановый безель, кнопки по бокам и настоящий скриншот внутри.
 *
 * Статус-бар и Dynamic Island в вёрстке не рисуются — они уже вшиты в кадры
 * (`tools/prepare-screens.py`), поэтому здесь остаётся только корпус и стекло.
 *
 * Радиусы и толщина рамки считаются от физического масштаба устройства: ширина
 * кадра делится на ширину экрана в точках, и всё остальное берётся в тех же
 * точках. Поэтому ландшафтный макет — это буквально тот же телефон, повёрнутый
 * на 90°: угол остаётся 55 pt, а не растягивается вместе с шириной кадра.
 */
export function Phone({
  screens,
  index,
  onSelect,
  orientation = 'portrait',
  className,
  style,
  caption = 'Снято в самом приложении',
  dots = true,
}: Props) {
  const reduced = useReducedMotion();
  const screen = screens[Math.max(0, Math.min(index, screens.length - 1))];
  const landscape = orientation === 'landscape';

  const px = `calc(var(--phone-w) / ${DEVICE_PT[orientation]})`; // один пункт устройства
  const radiusOuter = `calc(${px} * 55)`;
  const radiusMid = `calc(${px} * 51)`;
  const radiusScreen = `calc(${px} * 47)`;
  const bezel = `max(3px, calc(${px} * 4.3))`;

  return (
    <div className={className} style={style}>
      <div className="relative mx-auto w-[var(--phone-w,clamp(13.5rem,58vw,20rem))]">
        <div className="relative">
          {/* Кнопки корпуса. В портрете они на боках, в ландшафте — на верхней грани:
              телефон тот же, просто повёрнут. */}
          {landscape ? (
            <>
              <span aria-hidden="true" className="absolute -top-[3px] left-[17%] h-[3px] w-[5%] rounded-t bg-gradient-to-r from-white/25 to-white/5" />
              <span aria-hidden="true" className="absolute -top-[3px] left-[25%] h-[3px] w-[9%] rounded-t bg-gradient-to-r from-white/25 to-white/5" />
              <span aria-hidden="true" className="absolute -top-[3px] left-[36%] h-[3px] w-[9%] rounded-t bg-gradient-to-r from-white/25 to-white/5" />
              <span aria-hidden="true" className="absolute -top-[3px] left-[80%] h-[3px] w-[12%] rounded-t bg-gradient-to-r from-white/25 to-white/5" />
            </>
          ) : (
            <>
              <span aria-hidden="true" className="absolute -left-[3px] top-[19%] h-[7%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
              <span aria-hidden="true" className="absolute -left-[3px] top-[29%] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
              <span aria-hidden="true" className="absolute -left-[3px] top-[43%] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
              <span aria-hidden="true" className="absolute -right-[3px] top-[31%] h-[15%] w-[3px] rounded-r bg-gradient-to-b from-white/25 to-white/5" />
            </>
          )}

          {/* титановый корпус */}
          <div
            className="relative shadow-[0_50px_90px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.07)]"
            style={{
              borderRadius: radiusOuter,
              padding: bezel,
              background:
                'linear-gradient(150deg, #6f6f75 0%, #2a2a2e 18%, #131316 42%, #0c0c0e 60%, #3a3a40 82%, #17171a 100%)',
            }}
          >
            <div className="relative bg-[#08080a]" style={{ borderRadius: radiusMid, padding: bezel }}>
              <div className="relative overflow-hidden bg-bg" style={{ borderRadius: radiusScreen }}>
                <div className="relative w-full" style={{ aspectRatio: landscape ? '1704 / 786' : '786 / 1704' }}>
                  <AnimatePresence initial={false}>
                    <motion.img
                      key={screen.id}
                      src={asset(screen.screen)}
                      alt={screen.alt}
                      width={landscape ? 1704 : 786}
                      height={landscape ? 786 : 1704}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
                      transition={{ duration: reduced ? 0.3 : 0.7, ease: easeOutExpo }}
                    />
                  </AnimatePresence>
                </div>

                {/* блик по стеклу */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    borderRadius: radiusScreen,
                    background:
                      'linear-gradient(118deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 74%, rgba(255,255,255,0.05) 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {dots && (
          <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Экраны приложения">
            {screens.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.alt}
                onClick={() => onSelect?.(i)}
                className="group grid h-6 w-6 place-items-center rounded-full"
              >
                <motion.span
                  className="block rounded-full"
                  animate={{
                    width: i === index ? 22 : 6,
                    height: 6,
                    backgroundColor: i === index ? '#60a5fa' : 'rgba(255,255,255,0.22)',
                  }}
                  transition={{ duration: 0.45, ease: reduced ? undefined : easeOutExpo }}
                />
              </button>
            ))}
          </div>
        )}

        {caption && (
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-dim">
            <Icon name="cast" size={13} />
            <span>{caption}</span>
          </p>
        )}
      </div>
    </div>
  );
}
