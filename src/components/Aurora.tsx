import { useReducedMotion } from 'motion/react';

/**
 * Фон героя: три медленно дрейфующих пятна и звёздная сетка точек.
 * Всё на CSS-анимациях — никакого JS в кадре, поэтому не мешает прокрутке.
 */
export function Aurora() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className={`absolute -left-[18%] -top-[22%] h-[62vmax] w-[62vmax] rounded-full opacity-[0.75] blur-[90px] ${reduced ? '' : 'animate-drift'}`}
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(96,165,250,0.62), transparent 62%)' }}
      />
      <div
        className={`absolute -right-[16%] top-[6%] h-[52vmax] w-[52vmax] rounded-full opacity-[0.6] blur-[90px] ${reduced ? '' : 'animate-drift'}`}
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.58), transparent 62%)',
          animationDelay: '-9s',
        }}
      />
      <div
        className={`absolute left-[24%] top-[42%] h-[46vmax] w-[46vmax] rounded-full opacity-[0.42] blur-[100px] ${reduced ? '' : 'animate-drift'}`}
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(251,146,60,0.5), transparent 62%)',
          animationDelay: '-17s',
        }}
      />

      {/* звёздное поле: те же точки, что в HeroBackdrop на странице тайтла */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 70% 12%, rgba(255,255,255,0.35), transparent), radial-gradient(1.5px 1.5px at 42% 76%, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 88% 62%, rgba(255,255,255,0.3), transparent), radial-gradient(1.5px 1.5px at 12% 88%, rgba(255,255,255,0.28), transparent)',
          backgroundSize: '480px 480px, 620px 620px, 540px 540px, 720px 720px, 660px 660px',
        }}
      />

      {/* виньетка: гасит пятна к низу и к краям, чтобы текст оставался читаемым */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_0%,transparent_45%,rgba(18,18,18,0.72)_80%,#121212_100%)]" />
    </div>
  );
}
