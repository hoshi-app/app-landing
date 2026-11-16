import { useCallback, useEffect, useRef, useState } from 'react';
import GooeyNav from '../reactbits/Components/GooeyNav/GooeyNav';
import GradualBlur from '../reactbits/Animations/GradualBlur/GradualBlur';
import ClientOnly from '../components/ClientOnly';
import { scrollToAnchor } from '../lib/scrollToAnchor';
import { NAV } from '../data/landing';

const LINKS = [{ label: 'Начало', href: '#top' }, ...NAV];

/** Пока идёт программная прокрутка, подсветку не двигаем: иначе капля
    пробегает через промежуточные разделы и выглядит как рывок. */
const SPY_LOCK_MS = 800;

/**
 * Активный раздел ищется пересечением с тем, что реально на экране: у GooeyNav
 * подсветка — это «где я», а не «по чему последний раз кликнули».
 */
function useSectionSpy(links, lockRef) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ids = links.map((link) => link.href.slice(1));
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (performance.now() < lockRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(ids.indexOf(visible.target.id));
      },
      { rootMargin: '-42% 0px -48% 0px', threshold: [0, 0.2, 0.5, 0.8] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [links, lockRef]);

  return [active, setActive];
}

/**
 * Шапка: логотип слева и навигация по центру экрана.
 *
 * Меню на телефоне нет вовсе — там остаётся только логотип, разделы лежат
 * в футере. Это дешевле и честнее, чем прятать навигацию за кнопкой.
 */
export default function Header() {
  const lockRef = useRef(0);
  const [active, setActive] = useSectionSpy(LINKS, lockRef);

  // клик по ссылке: подсветка сразу на нужном пункте, прокрутка — своя, короткая
  const onNavigate = useCallback(
    (index) => {
      lockRef.current = performance.now() + SPY_LOCK_MS;
      setActive(index);
    },
    [setActive],
  );

  const onClick = useCallback(
    (event) => {
      const link = event.target.closest?.('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!scrollToAnchor(href)) return;
      /* подсветку двигаем сразу: и гоу-виджет, и обычные ссылки на телефоне
         должны отозваться на клик, а не после того, как прокрутка доедет */
      const index = LINKS.findIndex((item) => item.href === href);
      if (index >= 0) onNavigate(index);
      else lockRef.current = performance.now() + SPY_LOCK_MS;
      event.preventDefault();
    },
    [onNavigate],
  );

  return (
    <header className="head" onClick={onClick}>
      <div className="head__veil" aria-hidden="true">
        <ClientOnly>
          {/* Слоёв четыре, а не девять: каждый слой — это отдельный проход
              backdrop-filter, а свет героя под вуалью перерисовывается каждый
              кадр. Радиусы и так идут по экспоненте, и четыре ступени вместе с
              тинтом читаются как та же рампа — девять проходов покупали
              разницу, которой не видно. */}
          <GradualBlur
            position="top"
            height="12rem"
            strength={1.6}
            layers={4}
            curve="bezier"
            exponential
            tint="rgba(18, 18, 18, 0.38)"
            zIndex={0}
          />
        </ClientOnly>
      </div>

      <div className="shell head__row">
        <a className="head__logo" href="#top" aria-label="hoshi — наверх">
          <img src="./logo.svg" width="110" height="20" alt="hoshi" />
        </a>

        <nav className="head__nav" aria-label="Разделы страницы">
          {/* Телефоны и планшеты: гоу-виджет там прячется, поэтому меню — обычные
              ссылки в той же строке, что и лого. aria-current держит подсветку
              текущего раздела и до гидратации. */}
          <ul className="head__plain">
            {LINKS.map((link, index) => (
              <li key={link.href}>
                <a href={link.href} aria-current={active === index ? 'true' : undefined}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <ClientOnly>
            <GooeyNav
              items={LINKS}
              activeIndex={active}
              onChange={onNavigate}
              size="sm"
              theme="dark"
              frame={false}
              color="#818cf8"
              activeTextColor="#121212"
              particleCount={10}
              spread={48}
              gooeyness={0.38}
              wobble={0}
              style={{ '--gn-muted': 'var(--z4)', '--gn-ink': 'var(--text)' }}
            />
          </ClientOnly>
        </nav>
      </div>
    </header>
  );
}
