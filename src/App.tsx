import { useReducedMotion } from 'motion/react';
import { useLenis } from './hooks/useLenis';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { Features } from './components/Features';
import { Look } from './components/Look';
import { Start } from './components/Start';
import { Faq } from './components/Faq';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { ScrollProgress } from './components/ScrollProgress';
import { Splash } from './components/Splash';

export default function App() {
  const reduced = useReducedMotion();
  useLenis(!reduced);

  return (
    <>
      <Splash />
      {!reduced && <ScrollProgress />}
      <Header />
      <main id="main">
        <Hero />
        <Marquee />
        <Features />
        <Look />
        <Start />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
