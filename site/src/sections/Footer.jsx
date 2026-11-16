import { Icon } from '../components/Icons';
import { TELEGRAM } from '../data/landing';
import { DOCS, LEGAL_ORDER, legalHref } from '../data/legal';
import { LIST_PAGE, changelogHref } from '../data/changelog';

export default function Footer({ base = './' }) {
  return (
    <footer className="foot">
      <div className="shell">
        <div className="foot__top">
          <div className="foot__brand">
            <img src={`${base}logo.svg`} width="110" height="20" alt="hoshi" />
            <p>hoshi не хранит видео: приложение находит поток в открытых источниках.</p>
            <p>Постеры принадлежат правообладателям.</p>
          </div>

          <div className="foot__nav">
            <nav aria-label="Разделы">
              <a href={changelogHref('', base)}>{LIST_PAGE.title}</a>
              {LEGAL_ORDER.map((slug) => (
                <a key={slug} href={legalHref(slug, base)}>
                  {DOCS[slug].nav}
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
