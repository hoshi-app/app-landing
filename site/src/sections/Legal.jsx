import Footer from './Footer';
import { Icon } from '../components/Icons';
import { DOCS, DOC_CONTACT, legalHref } from '../data/legal';

/**
 * Юридический документ: шапка с логотипом, текст и футер.
 *
 * Разметка одна на все шесть документов — различается только содержимое
 * data/legal.js. Оглавление собирается из разделов, ссылки на соседние
 * документы — из `related`, контакты берутся из одного места.
 */
export default function Legal({ doc }) {
  return (
    <>
      <header className="doc__bar">
        <div className="shell doc__row">
          <a href="./" aria-label="hoshi — на главную">
            <img src="./logo.svg" width="110" height="20" alt="hoshi" />
          </a>
          <a className="doc__back" href="./">
            <Icon name="chevron" className="i doc__back-icon" />
            На главную
          </a>
        </div>
      </header>

      <main className="doc" id="main" tabIndex={-1}>
        <div className="shell doc__wrap">
          <p className="eyebrow">hoshi · документы</p>
          <h1 className="doc__title">{doc.title}</h1>
          {doc.intro.map((text) => (
            <p className="doc__intro" key={text}>
              {text}
            </p>
          ))}
          <p className="doc__date">{doc.updated}</p>

          <nav className="doc__toc" aria-label="Оглавление">
            <ol>
              {doc.sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#sec-${index + 1}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((section, index) => (
            <section className="doc__section" key={section.title} id={`sec-${index + 1}`}>
              <h2>{section.title}</h2>
              {section.body.map((block, blockIndex) =>
                Array.isArray(block) ? (
                  <ul key={blockIndex}>
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={blockIndex}>{block}</p>
                ),
              )}
            </section>
          ))}

          <section className="doc__foot" aria-labelledby="doc-contacts">
            <h2 id="doc-contacts">Контакты</h2>
            <ul>
              <li>
                Почта: <a href={`mailto:${DOC_CONTACT.email}`}>{DOC_CONTACT.email}</a>
              </li>
              <li>
                Telegram:{' '}
                <a href={DOC_CONTACT.telegram} target="_blank" rel="noopener noreferrer">
                  {DOC_CONTACT.telegramLabel}
                </a>
              </li>
            </ul>
          </section>

          <section className="doc__foot" aria-labelledby="doc-related">
            <h2 id="doc-related">Связанные документы</h2>
            <ul>
              {doc.related.map((slug) => (
                <li key={slug}>
                  <a href={legalHref(slug)}>{DOCS[slug].title}</a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
