import CurvedLoop from '../reactbits/TextAnimations/CurvedLoop/CurvedLoop';
import ClientOnly from '../components/ClientOnly';
import { RIBBON } from '../data/landing';

/**
 * Ribbon — дуга с бегущей строкой между героем и каталогом.
 *
 * Чистая декорация: у CurvedLoop своя SVG-лента, у обёртки — aria-hidden.
 * Статический фолбэк держит полосу нужной высоты до запуска скриптов.
 */
export default function Ribbon() {
  return (
    <div className="ribbon" aria-hidden="true">
      <ClientOnly
        fallback={
          <div className="ribbon__static">
            <span>{RIBBON}</span>
          </div>
        }
      >
        <CurvedLoop
          marqueeText={RIBBON}
          speed={0.7}
          curveAmount={130}
          direction="left"
          shape="arc"
          fontSize={52}
          fontWeight={800}
          letterSpacing={1}
          color="rgba(255, 255, 255, 0.19)"
          interactive={false}
          pauseOnHover={false}
          edgeFade={0.1}
          scrollBoost={0.6}
        />
      </ClientOnly>
    </div>
  );
}
