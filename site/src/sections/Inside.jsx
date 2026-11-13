import AnimatedContent from '../reactbits/Animations/AnimatedContent/AnimatedContent';
import ScrollFloat from '../reactbits/TextAnimations/ScrollFloat/ScrollFloat';
import ClientOnly from '../components/ClientOnly';
import { Icon } from '../components/Icons';
import Phone from '../components/Phone';
import Picture from '../components/Picture';
import { CHAPTERS } from '../data/landing';

function ChapterCopy({ chapter }) {
  return (
    <div className="chapter__body">
      <h3>{chapter.title}</h3>
      <p className="lead">{chapter.lead}</p>
      <ul className="features">
        {chapter.features.map((feature) => (
          <li className="feature" key={feature.title}>
            <Icon name={feature.icon} />
            <div>
              <h4>{feature.title}</h4>
              <p>{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Inside() {
  return (
    <section className="inside" id="inside">
      <div className="shell">
        <div className="section-head">
          <ScrollFloat
            containerClassName="section__title"
            splitBy="chars"
            stagger={0.02}
            distance={70}
          >
            Что внутри
          </ScrollFloat>
          <p className="lead">Каталог, список и прогресс в одном приложении.</p>
        </div>

        <div className="chapters">
          {CHAPTERS.map((chapter) => (
            <article className="chapter" key={chapter.id}>
              <div className="chapter__copy">
                <ClientOnly fallback={<ChapterCopy chapter={chapter} />}>
                  <AnimatedContent className="chapter__body" distance={60} duration={0.75} threshold={0.12}>
                    <ChapterCopy chapter={chapter} />
                  </AnimatedContent>
                </ClientOnly>
              </div>

              <div className="chapter__device">
                <ClientOnly
                  fallback={
                    <Phone>
                      <Picture
                        dir="screens"
                        name={chapter.screen.name}
                        width={chapter.screen.width}
                        height={chapter.screen.height}
                        alt={chapter.screen.alt}
                      />
                    </Phone>
                  }
                >
                  <AnimatedContent distance={80} duration={0.85} delay={0.08} threshold={0.05}>
                    <Phone>
                      <Picture
                        dir="screens"
                        name={chapter.screen.name}
                        width={chapter.screen.width}
                        height={chapter.screen.height}
                        alt={chapter.screen.alt}
                      />
                    </Phone>
                  </AnimatedContent>
                </ClientOnly>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
