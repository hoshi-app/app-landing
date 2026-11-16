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

const isExternal = (url) => /^https?:/i.test(url);

/** Круглый знак записи: аватар канала стоит над заголовком вместо обложки. */
function Logo({ logo }) {
  if (!logo) return null;
  return (
    <p className="log__logo">
      <img
        src={`${ROOT}${logo.src}`}
        width={logo.width}
        height={logo.height}
        alt={logo.alt}
        decoding="async"
      />
    </p>
  );
}

/** Обложка записи: размеры в разметке обязательны, иначе страница дёргается. */
function Cover({ cover }) {
  if (!cover) return null;
  return (
    <img
      className="log__cover"
      src={`${ROOT}${cover.src}`}
      width={cover.width}
      height={cover.height}
      alt={cover.alt}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Карточка канала: адрес, куда идти, и сама ссылка одной строкой. Ссылка
 * внешняя, поэтому и она, и стрелка открываются в новой вкладке.
 */
function Channel({ channel }) {
  if (!channel) return null;
  return (
    <a className="log__channel" href={channel.url} target="_blank" rel="noopener noreferrer">
      <span className="log__channel-icon">
        <Icon name="telegram" />
      </span>
      <span className="log__channel-text">
        <span className="log__channel-name">{channel.label}</span>
        <span className="log__channel-handle">{channel.handle}</span>
      </span>
      <Icon name="arrow" className="log__channel-arrow" />
    </a>
  );
}

/** Текст записи: markdown уже собран в HTML на сборке, стили — общие .doc__section. */
function Body({ html }) {
  return <section className="doc__section" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Кнопка действия: единственная заливка акцентом на странице. */
function Cta({ cta }) {
  if (!cta) return null;
  const external = isExternal(cta.url);
  return (
    <a
      className="button log__cta"
      href={cta.url}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {cta.label}
      {external ? <Icon name="arrow" className="i" /> : null}
    </a>
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
            <Logo logo={page.logo} />
            <p className="eyebrow">hoshi · обновления</p>
            <h1 className="doc__title">{page.title}</h1>
            <p className="doc__date">
              <time dateTime={page.date}>{dateLabel(page.date)}</time> · {page.tag}
            </p>
            <p className="doc__intro">{page.summary}</p>

            <Cover cover={page.cover} />
            <Channel channel={page.channel} />
            <Body html={page.html} />
            <Cta cta={page.cta} />
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
