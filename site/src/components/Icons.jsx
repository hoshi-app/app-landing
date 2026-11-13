/**
 * Icons.jsx — один SVG-спрайт на всю страницу.
 *
 * Контуры описаны один раз в <defs>, дальше — только <use>. Это дешевле, чем
 * инлайнить по десять путей в каждую карточку, и позволяют держать иконки
 * векторными при любом размере текста.
 */

export function IconSprite() {
  return (
    <svg className="sprite" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4.5 19 12 6 19.5Z" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
          <path d="M12 6.5V12l4 2" />
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.5 2 7.5l10 5 10-5Z" />
          <path d="M2 12.5l10 5 10-5" />
          <path d="M2 17l10 5 10-5" />
        </symbol>
        <symbol id="i-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
          <path d="M19 17l.7 1.8L21.5 20l-1.8.7L19 22l-.7-1.3L16.5 20l1.8-1.2Z" />
        </symbol>
        <symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        </symbol>
        <symbol id="i-bookmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
        </symbol>
        <symbol id="i-tv" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4.5h20v13H2Z" />
          <path d="M8 21h8" />
          <path d="M12 17.5V21" />
        </symbol>
        <symbol id="i-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </symbol>
        <symbol id="i-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9.5 12 15.5 18 9.5" />
        </symbol>
        <symbol id="i-telegram" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.94 4.3 18.9 19.19c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.76 8.66-7.82c.38-.33-.08-.52-.58-.19L6.6 13.6l-4.6-1.44c-1-.31-1.02-1 .21-1.48l18-6.94c.83-.32 1.56.2 1.29 1.56Z" />
        </symbol>
        <symbol id="i-apple" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.5c-.03-2.6 2.1-3.85 2.2-3.9-1.2-1.76-3.06-2-3.72-2.03-1.58-.16-3.09.93-3.9.93-.8 0-2.05-.9-3.37-.88-1.73.03-3.33 1-4.22 2.55-1.8 3.12-.46 7.74 1.29 10.27.86 1.24 1.88 2.63 3.22 2.58 1.29-.05 1.78-.83 3.34-.83 1.56 0 2 .83 3.36.8 1.39-.02 2.27-1.26 3.12-2.5.98-1.44 1.39-2.83 1.41-2.9-.03-.01-2.7-1.04-2.73-4.12M14.6 4.9c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.3-.58 3.02-1.44" />
        </symbol>
        <symbol id="i-gplay" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({ name, className = 'i' }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#i-${name}`} />
    </svg>
  );
}
