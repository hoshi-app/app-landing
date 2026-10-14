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
    <article className="w-[clamp(8.5rem,20vw,11rem)] shrink-0">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-card">
        <img
          src={asset(poster.poster)}
          alt={poster.title}
          width={420}
          height={630}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {poster.badge && (
          <span
            className={`absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold text-black ${TONE[poster.tone]}`}
          >
            {poster.badge}
          </span>
        )}
      </div>
      {/* не h3: заголовки ленты не должны лезть в структуру документа (heading-order) */}
      <p className="mt-2 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white">{poster.title}</p>
      <div className="mt-1 flex h-[1.15rem] items-center gap-2">
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

function Row({ items, direction }: { items: Poster[]; direction: 'left' | 'right' }) {
  // две одинаковые половины: сдвиг ровно на 50% даёт бесшовный цикл
  const half = [...items, ...items];
  return (
    <div className="marquee fade-x overflow-hidden">
      <div
        className={`marquee-track ${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}`}
        style={{ ['--marquee-duration' as string]: `${direction === 'left' ? 78 : 92}s` }}
      >
        {half.map((p, i) => (
          <PosterCard key={`${direction}-${p.id}-${i}`} poster={p} />
        ))}
      </div>
    </div>
  );
}

/** Ленты постеров под героем: едут навстречу, останавливаются при наведении. */
export function Marquee() {
  const first = posters.slice(0, Math.ceil(posters.length / 2));
  const second = posters.slice(Math.ceil(posters.length / 2));

  return (
    <section
      aria-label="Что можно смотреть"
      className="relative -mt-6 overflow-hidden py-[clamp(1.5rem,4vw,3rem)]"
    >
      <div className="space-y-4">
        <div className="-rotate-[1.4deg]">
          <Row items={first} direction="left" />
        </div>
        <div className="rotate-[1.1deg]">
          <Row items={second} direction="right" />
        </div>
      </div>
    </section>
  );
}
