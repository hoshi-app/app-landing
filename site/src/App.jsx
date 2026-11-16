import { IconSprite } from './components/Icons';
import Header from './sections/Header';
import Hero from './sections/Hero';
import Ribbon from './sections/Ribbon';
import Catalog from './sections/Catalog';
import Faq from './sections/Faq';
import Footer from './sections/Footer';
import Legal from './sections/Legal';
import Changelog from './sections/Changelog';
import NotFound from './sections/NotFound';
import { docForPath } from './data/legal';
import { changelogForPath } from './data/changelog';

/**
 * Адрес страницы приходит из `path` — так сборка предрендерит каждый документ
 * отдельным HTML. В браузере путь берётся из location. Разметка для одного и
 * того же пути на сервере и на клиенте совпадает, поэтому гидратация проходит
 * без перерисовки.
 */
function Landing() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Ribbon />
        <Catalog />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

export default function App({ path, notFound = false }) {
  const route = path ?? (typeof window === 'undefined' ? '/' : window.location.pathname);
  const doc = notFound ? null : docForPath(route);
  const log = notFound ? null : changelogForPath(route);

  return (
    <>
      <IconSprite />
      <a className="skip" href="#main">
        К содержанию
      </a>
      {notFound ? (
        <NotFound />
      ) : log ? (
        <Changelog page={log} />
      ) : doc ? (
        <Legal doc={doc} />
      ) : (
        <Landing />
      )}
    </>
  );
}
