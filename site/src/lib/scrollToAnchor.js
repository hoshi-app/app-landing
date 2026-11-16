/**
 * scrollToAnchor — короткая плавная прокрутка к якорю.
 *
 * Браузерный `scroll-behavior: smooth` при переходе на 4000–5000 px едет больше
 * секунды, и кажется, что интерфейс «думает» после нажатия. Здесь длительность
 * фиксированная и короткая: далеко — 600 мс, близко — меньше.
 *
 * Возвращает true, если якорь на странице есть и переход перехвачен.
 */
export function scrollToAnchor(hash) {
  const id = decodeURIComponent(String(hash).replace(/^#/, ''));
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  const header = document.querySelector('.head');
  /* На широком экране шапка липкая и закрывает верх — отступаем на её высоту.
     На телефоне она просто стоит в потоке и уезжает, поэтому отступ ей не нужен. */
  const sticky = header ? getComputedStyle(header).position === 'sticky' : false;
  const offset = sticky ? header.getBoundingClientRect().height + 8 : 8;
  const from = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.max(0, Math.min(target.getBoundingClientRect().top + from - offset, max));

  // на время анимации гасим CSS-сглаживание, иначе каждый шаг сглаживается сам
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';

  const finish = () => {
    html.style.scrollBehavior = previous;
    window.history.replaceState(
      null,
      '',
      id === 'top' ? window.location.pathname + window.location.search : `#${id}`,
    );
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const distance = Math.abs(to - from);

  if (reduced || distance < 12) {
    window.scrollTo(0, to);
    finish();
    return true;
  }

  const duration = Math.min(620, 200 + distance * 0.09);
  const start = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    window.scrollTo(0, from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
    else finish();
  };

  requestAnimationFrame(step);
  return true;
}
