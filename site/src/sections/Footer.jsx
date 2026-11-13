import { Icon } from '../components/Icons';
import { NAV, TELEGRAM } from '../data/landing';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="shell">
        <div className="foot__top">
          <div className="foot__brand">
            <img src="./logo.svg" width="110" height="20" alt="hoshi" />
            <p>hoshi не хранит видео: приложение находит поток в открытых источниках.</p>
            <p>Постеры принадлежат правообладателям.</p>
          </div>

          <div className="foot__nav">
            <nav aria-label="Разделы страницы">
              {NAV.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
            <ul className="foot__social">
              <li>
                <a href={TELEGRAM} target="_blank" rel="noopener noreferrer">
                  <Icon name="telegram" className="i" />
                  <span>Telegram</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot__bottom">
          <span>© 2026 hoshi</span>
          <span>Видео приложение не хранит.</span>
        </div>
      </div>
    </footer>
  );
}
