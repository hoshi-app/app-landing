import { IconSprite } from './components/Icons';
import Header from './sections/Header';
import Hero from './sections/Hero';
import Ribbon from './sections/Ribbon';
import Catalog from './sections/Catalog';
import Inside from './sections/Inside';
import Faq from './sections/Faq';
import Footer from './sections/Footer';

export default function App() {
  return (
    <>
      <IconSprite />
      <a className="skip" href="#main">
        К содержанию
      </a>
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
