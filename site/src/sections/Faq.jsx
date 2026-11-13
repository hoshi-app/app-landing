import ScrollFloat from '../reactbits/TextAnimations/ScrollFloat/ScrollFloat';
import { Icon } from '../components/Icons';
import { FAQ, TELEGRAM } from '../data/landing';

export default function Faq() {
  return (
    <section className="faq" id="faq">
      <div className="shell faq__grid">
        <div className="faq__copy">
          <ScrollFloat
            containerClassName="section__title"
            splitBy="chars"
            stagger={0.02}
            distance={70}
          >
            Вопросы
          </ScrollFloat>
          <p className="lead">
            Не нашли ответ —{' '}
            <a href={TELEGRAM} target="_blank" rel="noopener noreferrer">
              напишите в Telegram
            </a>
            .
          </p>
        </div>

        <div className="faq__list">
          {FAQ.map((item, index) => (
            <details name="faq" key={item.question} open={index === 0 ? true : undefined}>
              <summary>
                {item.question}
                <Icon name="chevron" className="i faq__mark" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
