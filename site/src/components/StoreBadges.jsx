import { Icon } from './Icons';

/**
 * StoreBadges.jsx — «скоро в магазинах».
 *
 * Приложение ещё не опубликовано, поэтому это не ссылки, а плашки: ссылка,
 * ведущая в никуда, хуже обязательного предупреждения в title.
 */
export default function StoreBadges() {
  return (
    <div className="stores">
      <span className="store" title="Приложение ещё не опубликовано">
        <Icon name="apple" className="i store__icon" />
        <span className="store__text">
          <span className="store__top">Скоро в</span>
          <span className="store__bottom">App Store</span>
        </span>
      </span>
      <span className="store" title="Приложение ещё не опубликовано">
        <Icon name="gplay" className="i store__icon" />
        <span className="store__text">
          <span className="store__top">Скоро в</span>
          <span className="store__bottom">Google Play</span>
        </span>
      </span>
    </div>
  );
}
