import LogoLoop from '../reactbits/Animations/LogoLoop/LogoLoop';
import ScrollFloat from '../reactbits/TextAnimations/ScrollFloat/ScrollFloat';
import Counter from '../reactbits/Components/Counter/Counter';
import { POSTER_ROWS, STATS } from '../data/landing';

const label = (poster) => `Постер: ${poster.title}`;

const toItems = (row) =>
  row.map((poster) => ({
    avif: `./posters/${poster.id}.avif`,
    webp: `./posters/${poster.id}.webp`,
    width: poster.width,
    height: poster.height,
    alt: label(poster),
  }));

/* Списки собираются один раз на модуле: LogoLoop пересобирает движок, когда
   меняется идентичность props, и новые массивы на каждый рендер дают вечный
   цикл «измерение -> setState -> рендер». */
const ROWS = POSTER_ROWS.map(toItems);

/* LogoLoop рисует <img> сам; renderItem отдаёт ему готовый <picture>,
   чтобы браузер взял AVIF, а WebP остался фолбэком. */
function renderPoster(item) {
  return (
    <picture>
      <source srcSet={item.avif} type="image/avif" />
      <img
        src={item.webp}
        width={item.width}
        height={item.height}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

export default function Catalog() {
  return (
    <section className="catalog" id="catalog">
      <div className="shell section-head">
        <ScrollFloat
          containerClassName="section__title"
          splitBy="chars"
          stagger={0.02}
          distance={70}
        >
          Каталог
        </ScrollFloat>
        <p className="lead">Онгоинги, классика и анонсы с оценками и описаниями.</p>
      </div>

      <div className="marquee">
        {ROWS.map((items, index) => (
          <div className="marquee__row" key={index}>
            <LogoLoop
              logos={items}
              logoHeight={190}
              gap={14}
              speed={index === 0 ? 58 : 64}
              direction={index === 0 ? 'left' : 'right'}
              pauseOnHover
              fadeOut
              fadeOutWidth={0.06}
              draggable
              scrollBoost={0.35}
              ariaLabel="Постеры аниме из каталога"
              renderItem={renderPoster}
            />
          </div>
        ))}
      </div>

      <div className="shell">
        <ul className="stats">
          {STATS.map((stat) => (
            <li className="stat" key={stat.label}>
              <Counter
                className="stat__value"
                value={stat.value}
                locale="ru-RU"
                duration={1.2}
                fontSize="clamp(2.1rem, 4.6vw, 3.1rem)"
                fontWeight={700}
              />
              <span className="stat__label">{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
