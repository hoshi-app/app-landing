import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { asset } from '../lib/asset';
import { easeOutExpo } from '../lib/motion';

export type Screen = { id: string; screen: string; alt: string };

type Props = {
  screens: Screen[];
  index: number;
  onSelect?: (index: number) => void;
  /** landscape — тот же портретный корпус, повёрнутый на 90° */
  orientation?: 'portrait' | 'landscape';
  className?: string;
  style?: CSSProperties;
  dots?: boolean;
};

/**
 * Макет телефона: титановый безель, кнопки по бокам и настоящий скриншот внутри.
 *
 * В ландшафте корпус НЕ рисуется заново — это буквально тот же портретный макет,
 * повёрнутый на 90° через CSS `rotate`. Поэтому совпадает всё: толщина рамки,
 * радиус угла, кнопки (они уезжают на верхнюю и нижнюю грань) и тень. Внутри
 * скриншот повёрнут обратно, чтобы читаться нормально.
 *
 * Статус-бар и Dynamic Island в вёрстке не рисуются — они уже вшиты в кадры
 * (`tools/prepare-screens.py`).
 */
export function Phone({ screens, index, onSelect, orientation = 'portrait', className, style, dots = true }: Props) {
  const reduced = useReducedMotion();
  const screen = screens[Math.max(0, Math.min(index, screens.length - 1))];
  const rotated = orientation === 'landscape';

  const px = `calc(var(--phone-w) / 393)`;
  const radiusOuter = `calc(${px} * 55)`;
  const radiusMid = `calc(${px} * 51)`;
  const radiusScreen = `calc(${px} * 47)`;
  const bezel = `max(3px, calc(${px} * 4.3))`;
  /** Экран уже корпуса на четыре рамки, поэтому и повёрнутый силуэт уже, чем --phone-w × 1704/786. */
  const rotatedWidth = `calc(var(--phone-w) * ${1704 / 786} - 4 * ${bezel} * ${1704 / 786 - 1})`;

  const shell = (
    <div className="relative w-[var(--phone-w,clamp(13.5rem,58vw,20rem))]">
      <span aria-hidden="true" className="absolute -left-[3px] top-[19%] h-[7%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
      <span aria-hidden="true" className="absolute -left-[3px] top-[29%] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
      <span aria-hidden="true" className="absolute -left-[3px] top-[43%] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
      <span aria-hidden="true" className="absolute -right-[3px] top-[31%] h-[15%] w-[3px] rounded-r bg-gradient-to-b from-white/25 to-white/5" />

      <div
        className={`relative ${rotated ? '' : 'shadow-[0_50px_90px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.07)]'}`}
        style={{
          borderRadius: radiusOuter,
          padding: bezel,
          background:
            'linear-gradient(150deg, #6f6f75 0%, #2a2a2e 18%, #131316 42%, #0c0c0e 60%, #3a3a40 82%, #17171a 100%)',
        }}
      >
        <div className="relative bg-[#08080a]" style={{ borderRadius: radiusMid, padding: bezel }}>
          <div className="relative overflow-hidden bg-bg" style={{ borderRadius: radiusScreen }}>
            {/* корпус всегда портретный; в ландшафте картинка лежит боком и повёрнута обратно */}
            <div className="relative w-full" style={{ aspectRatio: '786 / 1704' }}>
              <AnimatePresence initial={false}>
                <motion.img
                  key={screen.id}
                  src={asset(screen.screen)}
                  alt={screen.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute object-cover"
                  style={
                    rotated
                      ? {
                          left: '50%',
                          top: '50%',
                          // до поворота кадр должен быть ровно размером «высота × ширина»
                          // экранного бокса. После поворота на -90° он ложится в бокс
                          // один в один.
                          width: 'calc(100% * 1704 / 786)',
                          height: 'calc(100% * 786 / 1704)',
                          maxWidth: 'none',
                          // поворот и центрирование задаём через motion: обычный CSS
                          // transform он всё равно перезапишет своими анимациями
                          x: '-50%',
                          y: '-50%',
                          rotate: -90,
                        }
                      : { inset: 0, height: '100%', width: '100%' }
                  }
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
                  transition={{ duration: reduced ? 0.3 : 0.7, ease: easeOutExpo }}
                />
              </AnimatePresence>
            </div>

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
  );

  return (
    <div className={className} style={style}>
      {rotated ? (
        // бокс повёрнутого корпуса: ширина = высота портретного макета, и наоборот.
        //
        // Тень здесь именно `box-shadow`, а не `drop-shadow`: drop-shadow на большом
        // повёрнутом элементе перерисовывается каждый кадр анимации и рассыпается
        // на плитки. Скругление задаём то же, что у самого корпуса, поэтому тень
        // повторяет силуэт.
        <div
          className="relative mx-auto"
          style={{
            width: rotatedWidth,
            height: 'var(--phone-w,clamp(13.5rem,58vw,20rem))',
            borderRadius: radiusOuter,
            boxShadow: '0 30px 46px -14px rgba(0,0,0,0.8)',
            contain: 'paint',
          }}
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: 'translate(-50%, -50%) rotate(90deg)' }}
          >
            {shell}
          </div>
        </div>
      ) : (
        <div className="relative mx-auto w-[var(--phone-w,clamp(13.5rem,58vw,20rem))]">{shell}</div>
      )}

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
    </div>
  );
}
