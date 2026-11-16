import DocBar from '../components/DocBar';
import Footer from './Footer';
import { NOT_FOUND } from '../data/notFound';
import { changelogHref } from '../data/changelog';

/**
 * NotFound.jsx — страница 404.
 *
 * Лежит в dist/404.html и отдаётся на любой несуществующий адрес, поэтому её
 * URL заранее неизвестен: все ссылки здесь абсолютные от корня («/»), иначе на
 * глубине вроде /faq/ они просили бы /faq/assets/… и страница оставалась без
 * стилей.
 */
export default function NotFound() {
  return (
    <>
      <DocBar root="/" />

      <main className="doc" id="main" tabIndex={-1}>
        <div className="shell doc__wrap">
          <p className="eyebrow">hoshi · ошибка 404</p>
          <h1 className="doc__title">{NOT_FOUND.title}</h1>
          <p className="doc__intro">{NOT_FOUND.text}</p>

          <nav className="doc__foot" aria-label="Куда перейти">
            <h2>Куда перейти</h2>
            <ul>
              <li>
                <a href="/">На главную</a>
              </li>
              <li>
                <a href={changelogHref('', '/')}>Что нового</a>
              </li>
            </ul>
          </nav>
        </div>
      </main>

      <Footer base="/" />
    </>
  );
}
