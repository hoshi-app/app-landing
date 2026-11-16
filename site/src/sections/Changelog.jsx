import Footer from './Footer';
import DocBar from '../components/DocBar';
import { Icon } from '../components/Icons';
import { CHANGELOG, LIST_PAGE, changelogHref, dateLabel } from '../data/changelog';

/**
 * Changelog.jsx — список записей и сама запись.
 *
 * Разметка одна на оба адреса: список — /faq/changelog/, запись —
 * /faq/changelog/<slug>. Страницы лежат на глубине документов, поэтому
 * относительные пути считаются от «../../», а вёрстка переиспользует
 * классы юридических страниц (.doc__*), добавляя только список (.log__*).
 */
const ROOT = '../../';

/** Картинка записи: одна на новость, размеры уже прочитаны из файла на сборке. */
function Img({ img }) {
  if (!img) return null;
  return (
    <p className="log__img">
      <img
        src={`${ROOT}${img.src}`}
        width={img.width}
        height={img.height}
        alt={img.alt}
        decoding="async"
      />
    </p>
  );
}

/** Текст записи: HTML собран на сборке, пустого блока в разметке нет (тело необязательно). */
function Body({ html }) {
  if (!html.trim()) return null;
  return <section className="doc__section log__body" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Кнопки действия: строк во front-matter столько же, сколько кнопок. На сайте
 * рисуются только https-кнопки; `app:/…` открывается внутри приложения и здесь
 * не показывается. Первая видимая — заливкой, остальные контуром: акцент один.
 */
function Buttons({ buttons }) {
  const links = (buttons ?? []).filter((button) => button.href);
  if (!links.length) return null;
  return (
    <p className="log__ctas">
      {links.map((button, index) => (
        <a
          key={`${button.href} ${index}`}
          className={index === 0 ? 'button' : 'button button--ghost'}
          href={button.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {button.label}
          <Icon name="arrow" className="i" />
        </a>
      ))}
    </p>
  );
}

export default function Changelog({ page }) {
  if (page.list) {
    return (
      <>
        <DocBar root={ROOT} />

        <main className="doc" id="main" tabIndex={-1}>
          <div className="shell doc__wrap">
            <a className="doc__back log__back" href={ROOT}>
              <Icon name="chevron" className="i doc__back-icon" />
              На главную
            </a>
            <p className="eyebrow">hoshi · обновления</p>
            <h1 className="doc__title">{LIST_PAGE.title}</h1>
            <p className="doc__intro">{LIST_PAGE.description}</p>

            {CHANGELOG.length === 0 ? (
              <p className="doc__intro">Пока нет записей.</p>
            ) : (
              <ul className="log__list">
                {CHANGELOG.map((entry) => (
                  <li className="log__item" key={entry.slug}>
                    <a className="log__link" href={`./${entry.slug}`}>
                      <span className="log__meta">
                        <time dateTime={entry.date}>{dateLabel(entry.date)}</time>
                        <span className="log__tag">{entry.tag}</span>
                      </span>
                      <span className="log__title">{entry.title}</span>
                      <span className="log__summary">{entry.summary}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        <Footer base={ROOT} />
      </>
    );
  }

  return (
    <>
      <DocBar root={ROOT} />

      <main className="doc" id="main" tabIndex={-1}>
        <div className="shell doc__wrap">
          <a className="doc__back log__back" href={changelogHref('', ROOT)}>
            <Icon name="chevron" className="i doc__back-icon" />
            Все обновления
          </a>
          <article>
            <Img img={page.img} />
            <p className="eyebrow">hoshi · обновления</p>
            <h1 className="doc__title">{page.title}</h1>
            <p className="doc__date">
              <time dateTime={page.date}>{dateLabel(page.date)}</time> · {page.tag}
            </p>
            <p className="doc__intro">{page.summary}</p>

            <Body html={page.html} />
            <Buttons buttons={page.buttons} />
            {page.note ? <p className="log__note">{page.note}</p> : null}
          </article>

          <nav className="doc__foot" aria-label="Навигация">
            <h2>Дальше</h2>
            <ul>
              <li>
                <a href={changelogHref('', ROOT)}>Все обновления</a>
              </li>
              <li>
                <a href={ROOT}>На главную</a>
              </li>
            </ul>
          </nav>
        </div>
      </main>

      <Footer base={ROOT} />
    </>
  );
}
