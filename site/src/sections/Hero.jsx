import { useState } from 'react';
import BlurText from '../reactbits/TextAnimations/BlurText/BlurText';
import LightRays from '../reactbits/Backgrounds/LightRays/LightRays';
import Noise from '../reactbits/Animations/Noise/Noise';
import PixelSwap from '../reactbits/Animations/PixelSwap/PixelSwap';
import ClientOnly from '../components/ClientOnly';
import { Icon } from '../components/Icons';
import Picture from '../components/Picture';
import Phone from '../components/Phone';
import StoreBadges from '../components/StoreBadges';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import { SCREENS, TELEGRAM } from '../data/landing';

const TITLE = 'Аниме, которое смотрится просто';
const LEAD =
  'Каталог аниме, озвучки и субтитры в одном приложении. Выбирай, смотри, продолжай с того же места.';

export default function Hero() {
  const reduced = usePrefersReducedMotion();
  /* Пока идёт вход, слова анимируются блюром и держат will-change. После входа
     это уже просто текст: класс снимает с него и то, и другое, иначе под
     вуалью шапки висят два десятка лишних слоёв. */
  const [titleDone, setTitleDone] = useState(false);
  const [leadDone, setLeadDone] = useState(false);

  return (
    <section className="hero" id="top" aria-label="hoshi — аниме, которое смотрится просто">
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__glow" />
        <ClientOnly>
          {!reduced && (
            <div className="hero__rays">
              <LightRays
                raysOrigin="top-center"
                raysColor="#818cf8"
                raysSpeed={0.5}
                lightSpread={0.3}
                rayLength={2.6}
                rayDensity={1.5}
                raySharpness={0.5}
                glow={0.42}
                haze={0.12}
                atmosphere={0.8}
                intensity={1.05}
                saturation={1.2}
                maxDevicePixelRatio={1.5}
                followMouse
                mouseInfluence={0.05}
              />
            </div>
          )}
          {!reduced && (
            <div className="hero__grain">
              {/* dust={0}: канвасные точки «как от старой плёнки» убраны,
                  остаётся ровное зерно на тайле. fps 12, а не 20: зерно и так
                  шумит, а каждый тик двигает слой поверх света и заставляет
                  пересчитывать blur вуали. */}
              <Noise opacity={0.07} size={1} fps={12} blendMode="soft-light" contrast={0.55} dust={0} flicker={0.04} />
            </div>
          )}
        </ClientOnly>
      </div>

      <div className="shell hero__grid">
        <div className="hero__copy">
          <p className="eyebrow">Бета · iOS и Android</p>

          <BlurText
            as="h1"
            className={`hero__title${titleDone ? ' is-settled' : ''}`}
            text={TITLE}
            animateBy="words"
            direction="top"
            delay={80}
            stepDuration={0.26}
            blur={9}
            distance={42}
            trigger="load"
            onAnimationComplete={() => setTitleDone(true)}
          />

          <BlurText
            className={`hero__lead${leadDone ? ' is-settled' : ''}`}
            text={LEAD}
            animateBy="words"
            direction="top"
            delay={280}
            stepDuration={0.12}
            blur={6}
            distance={18}
            trigger="load"
            onAnimationComplete={() => setLeadDone(true)}
          />

          <div className="hero__cta">
            <StoreBadges />
            <a className="button button--tg" href={TELEGRAM} target="_blank" rel="noopener noreferrer">
              <Icon name="telegram" className="i" />
              <span>Telegram</span>
            </a>
          </div>

          <p className="hero__note">Бесплатно. Для списка нужен аккаунт.</p>
        </div>

        <div className="hero__device">
          <div className="device">
            <Phone>
              {/* PixelSwap умеет рендериться на сервере: оба слоя — обычные
                  div'ы с картинками. Так приоритетный кадр не пересоздаётся
                  после гидратации, и LCP остаётся ранним. */}
              <PixelSwap
                className="device__swap"
                aspectRatio="440 / 956"
                pixelSize={26}
                pixelDuration={320}
                duration={480}
                randomness={0.18}
                bounce={0.25}
                trigger="click"
                intro={false}
                firstContent={
                  <Picture
                    dir="screens"
                    name={SCREENS.title.name}
                    width={SCREENS.title.width}
                    height={SCREENS.title.height}
                    alt={SCREENS.title.alt}
                    priority
                  />
                }
                secondContent={
                  <Picture
                    dir="screens"
                    name={SCREENS.home.name}
                    width={SCREENS.home.width}
                    height={SCREENS.home.height}
                    alt={SCREENS.home.alt}
                  />
                }
              />
            </Phone>
          </div>
        </div>
      </div>
    </section>
  );
}
