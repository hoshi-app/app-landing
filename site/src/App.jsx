import { IconSprite } from './components/Icons';
import Header from './sections/Header';
import Hero from './sections/Hero';
import Ribbon from './sections/Ribbon';
import Catalog from './sections/Catalog';
import Inside from './sections/Inside';
import Faq from './sections/Faq';
import Footer from './sections/Footer';
import Legal from './sections/Legal';
import { docForPath } from './data/legal';

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
        <Inside />
        <Faq />
      </main>
      <Footer />
    </>
  );
}

export default function App({ path }) {
  const doc = docForPath(path ?? (typeof window === 'undefined' ? '/' : window.location.pathname));

  return (
    <>
      <IconSprite />
      <a className="skip" href="#main">
        К содержанию
      </a>
      {doc ? <Legal doc={doc} /> : <Landing />}
    </>
  );
}
