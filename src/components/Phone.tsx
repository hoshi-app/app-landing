import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { asset } from '../lib/asset';
import { easeOutExpo } from '../lib/motion';
import { Icon } from './ui/Icon';

export type Screen = { id: string; screen: string; alt: string };

function StatusBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[7%] pt-[3.2%] text-white">
      <span className="text-[clamp(0.6rem,1.6vw,0.78rem)] font-semibold tracking-tight tabular-nums">9:41</span>
      <span className="flex items-center gap-1.5">
        {/* сигнал */}
        <svg viewBox="0 0 18 12" className="h-[9px] w-[14px]" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
          <rect x="4.6" y="5.2" width="3" height="6.8" rx="1" />
          <rect x="9.2" y="2.6" width="3" height="9.4" rx="1" />
          <rect x="13.8" y="0" width="3" height="12" rx="1" opacity="0.35" />
        </svg>
        {/* wi-fi */}
        <svg viewBox="0 0 16 12" className="h-[10px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M1 4.3a10.5 10.5 0 0 1 14 0" />
          <path d="M3.6 7a6.8 6.8 0 0 1 8.8 0" />
          <path d="M6.3 9.7a2.9 2.9 0 0 1 3.4 0" />
        </svg>
        {/* батарея */}
        <svg viewBox="0 0 26 12" className="h-[11px] w-[23px]" aria-hidden="true">
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="3.2" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
          <rect x="2.4" y="2.4" width="14" height="7.2" rx="2" fill="currentColor" />
          <path d="M23.4 4.2v3.6a2 2 0 0 0 0-3.6Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

type Props = {
  screens: Screen[];
  index: number;
  onSelect?: (index: number) => void;
  className?: string;
  /** глубина наклона 3D-слоя, задаётся снаружи (Hero/Showcase) */
  style?: React.CSSProperties;
};

/**
 * Макет телефона: титановый безель, Dynamic Island, кнопки по бокам и настоящий
 * скриншот приложения внутри. Кадры сняты в 390×844 — пропорция экрана совпадает
 * один в один, поэтому ничего не обрезается.
 */
export function Phone({ screens, index, onSelect, className, style }: Props) {
  const reduced = useReducedMotion();
  const screen = screens[Math.max(0, Math.min(index, screens.length - 1))];

  return (
    <div className={className} style={style}>
      <div className="relative mx-auto w-[var(--phone-w,clamp(13.5rem,58vw,20rem))]">
        {/* свечение за корпусом */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 rounded-[50%] opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(45% 40% at 50% 25%, rgba(96,165,250,0.28), transparent 70%), radial-gradient(40% 45% at 65% 80%, rgba(167,139,250,0.18), transparent 70%)',
          }}
        />

        <div className="relative">
          {/* боковые кнопки */}
          <span aria-hidden="true" className="absolute -left-[3px] top-[19%] h-[7%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
          <span aria-hidden="true" className="absolute -left-[3px] top-[29%] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
          <span aria-hidden="true" className="absolute -left-[3px] top-[43%] h-[11%] w-[3px] rounded-l bg-gradient-to-b from-white/25 to-white/5" />
          <span aria-hidden="true" className="absolute -right-[3px] top-[31%] h-[15%] w-[3px] rounded-r bg-gradient-to-b from-white/25 to-white/5" />

          {/* титановый корпус */}
          <div
            className="relative rounded-[3.1rem] p-[3px] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.07)]"
            style={{
              background:
                'linear-gradient(150deg, #6f6f75 0%, #2a2a2e 18%, #131316 42%, #0c0c0e 60%, #3a3a40 82%, #17171a 100%)',
            }}
          >
            <div className="relative rounded-[2.95rem] bg-[#08080a] p-[3px]">
              <div className="relative overflow-hidden rounded-[2.8rem] bg-bg">
                {/* Dynamic Island */}
                <div className="pointer-events-none absolute left-1/2 top-[1.6%] z-30 h-[3.4%] w-[27%] -translate-x-1/2 rounded-full bg-black">
                  <span className="absolute right-[18%] top-1/2 h-[38%] w-[8%] -translate-y-1/2 rounded-full bg-[#101820]" />
                </div>

                <StatusBar />

                <div className="relative aspect-[390/844] w-full">
                  <AnimatePresence initial={false}>
                    <motion.img
                      key={screen.id}
                      src={asset(screen.screen)}
                      alt={screen.alt}
                      width={780}
                      height={1688}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.03, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: -10 }}
                      transition={{ duration: reduced ? 0.3 : 0.75, ease: easeOutExpo }}
                    />
                  </AnimatePresence>

                  {/* лёгкое затемнение сверху — чтобы статус-бар читался на любом кадре */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[9%] bg-gradient-to-b from-black/55 to-transparent"
                  />
                </div>

                {/* home-индикатор */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[0.9%] left-1/2 z-20 h-[0.42%] w-[32%] -translate-x-1/2 rounded-full bg-white/35"
                />

                {/* блик по стеклу */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 rounded-[2.8rem]"
                  style={{
                    background:
                      'linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 74%, rgba(255,255,255,0.05) 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* переключатель экранов */}
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

        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-dim">
          <Icon name="cast" size={13} />
          <span>Снято в самом приложении</span>
        </p>
      </div>
    </div>
  );
}
