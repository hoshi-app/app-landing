import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { posters, type Poster } from '../data/posters';
import { asset } from '../lib/asset';
import { Icon } from './ui/Icon';

const TONE: Record<Poster['tone'], string> = {
  green: 'bg-live',
  blue: 'bg-accent',
  orange: 'bg-soon',
  z8: 'bg-[#27272a]',
};

/** Карточка ровно как ListCard в приложении: постер 2:3, бейдж, название, мета и оценка. */
function PosterCard({ poster }: { poster: Poster }) {
  return (
    <article className="w-[clamp(8.5rem,20vw,11rem)] shrink-0 select-none">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-card">
        <img
          src={asset(poster.poster)}
          alt={poster.title}
          width={420}
          height={630}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
        {poster.badge && (
          <span
            className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold text-black ${TONE[poster.tone]}`}
          >
            {poster.badge}
          </span>
        )}
      </div>
      {/* обычный абзац, а не заголовок: лента декоративная и не должна лезть в структуру документа */}
      <p className="mt-2 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{poster.title}</p>
      <div className="mt-1 flex min-h-[1.15rem] items-center gap-2">
        <span className="truncate text-[0.7rem] text-mute">{poster.meta}</span>
        {poster.score > 0 && (
          <span className="glass inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[0.66rem] text-soft">
            <Icon name="star" size={10} className="text-warn" />
            {poster.score.toFixed(1)}
          </span>
        )}
      </div>
    </article>
  );
}

type RowProps = { items: Poster[]; speed: number; direction: 1 | -1 };

/**
 * Лента едет сама, тянется курсором и пальцем, а после броска доезжает по инерции.
 * Наведение плавно тормозит её до нуля, а не обрывает анимацию.
 *
 * Движение — трансформом, а не scrollLeft: так лента не упирается в конец и
 * бесшовно зацикливается на второй копии набора.
 */
function Row({ items, speed, direction }: RowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  const st = useRef({ pos: 0, v: 0, dragging: false, x: 0, lastT: 0, period: 0 });

  // период цикла = ширина одной копии + зазор между копиями
  useEffect(() => {
    const measure = () => {
      const group = groupRef.current;
      if (!group) return;
      const gap = parseFloat(getComputedStyle(group).columnGap || '16') || 16;
      st.current.period = group.getBoundingClientRect().width + gap;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (groupRef.current) ro.observe(groupRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const s = st.current;
      const el = trackRef.current;
      const base = reduced || paused ? 0 : speed * direction;

      if (!s.dragging) {
        // тормозим к цели плавно: резкая остановка при наведении выглядела как рывок
        const k = Math.abs(s.v) > 60 ? 1.4 : 2.8;
        s.v += (base - s.v) * Math.min(1, dt * k);
        s.pos += s.v * dt;
      }

      const period = s.period;
      if (period > 0) {
        while (s.pos >= period) s.pos -= period;
        while (s.pos < 0) s.pos += period;
      }

      if (el) el.style.transform = `translate3d(${-s.pos}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [speed, direction, reduced, paused]);

  const onDown = (e: React.PointerEvent) => {
    const s = st.current;
    s.dragging = true;
    s.x = e.clientX;
    s.v = 0;
    s.lastT = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.dragging) return;
    const now = performance.now();
    const dx = e.clientX - s.x;
    s.x = e.clientX;
    s.pos -= dx;
    const dt = Math.max(0.008, (now - s.lastT) / 1000);
    s.lastT = now;
    // сглаживаем скорость, иначе бросок дёргается на первом же кадре
    s.v = s.v * 0.72 + (-dx / dt) * 0.28;
  };

  const onUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.dragging) return;
    s.dragging = false;
    s.v = Math.max(-2600, Math.min(2600, s.v));
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* палец уже отпущен */
    }
  };

  return (
    <div
      className="relative cursor-grab overflow-hidden py-3 active:cursor-grabbing"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setPaused(false);
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ touchAction: 'pan-y' }}
    >
      <div ref={trackRef} className="flex w-max gap-4">
        <div ref={groupRef} className="flex gap-4">
          {items.map((p) => (
            <PosterCard key={p.id} poster={p} />
          ))}
        </div>
        <div className="flex gap-4" aria-hidden="true">
          {items.map((p) => (
            <PosterCard key={`dup-${p.id}`} poster={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Две ленты постеров под героем. Наклонены одинаково, поэтому идут параллельно
 * и не сходятся углами на краях экрана.
 */
export function Marquee() {
  const half = Math.ceil(posters.length / 2);
  const first = posters.slice(0, half);
  const second = posters.slice(half);

  return (
    <section aria-label="Что можно смотреть" className="relative pb-[clamp(1rem,3vw,2rem)]">
      <div className="fade-x -rotate-[1.2deg]">
        <Row items={first} speed={34} direction={1} />
        <Row items={second} speed={26} direction={-1} />
      </div>
    </section>
  );
}
