import { Icon } from './Icons';

/**
 * DocBar.jsx — шапка вложенной страницы: логотип и необязательная ссылка назад.
 *
 * Одна и та же на юридических документах и в ленте обновлений: страницы лежат
 * на одинаковой глубине, поэтому корень и иконки считаются от «../../».
 * В ленте ссылка живёт над контентом, поэтому `backHref` необязателен.
 */
export default function DocBar({ root = '../../', backHref, backLabel = 'На главную' }) {
  return (
    <header className="doc__bar">
      <div className="shell doc__row">
        <a href={root} aria-label="hoshi — на главную">
          <img src={`${root}logo.svg`} width="110" height="20" alt="hoshi" />
        </a>
        {backHref ? (
          <a className="doc__back" href={backHref}>
            <Icon name="chevron" className="i doc__back-icon" />
            {backLabel}
          </a>
        ) : null}
      </div>
    </header>
  );
}
