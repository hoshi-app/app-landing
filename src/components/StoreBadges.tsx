import { motion } from 'motion/react';
import { Icon } from './ui/Icon';
import { hero, site } from '../data/copy';
import { easeOutExpo } from '../lib/motion';

type BadgeProps = {
  store: 'apple' | 'google';
  href: string;
};

function Badge({ store, href }: BadgeProps) {
  const copy = store === 'apple' ? hero.badges.apple : hero.badges.google;
  const inner = (
    <>
      {/* блик, который проезжает по кнопке при наведении */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.13),transparent)] transition-transform duration-700 group-hover:translate-x-full"
      />
      <Icon
        name={store === 'apple' ? 'apple' : 'gplay'}
        size={store === 'apple' ? 24 : 22}
        className="relative shrink-0 transition-transform duration-500 group-hover:scale-110"
      />
      <span className="relative flex flex-col items-start leading-none">
        <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors duration-500 group-hover:text-soft">
          {copy.top}
        </span>
        <span className="mt-1 text-[0.95rem] font-semibold text-white">{copy.bottom}</span>
      </span>
      {!href && (
        <span className="relative ml-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-mute transition-colors duration-500 group-hover:border-accent/40 group-hover:text-soft">
          скоро
        </span>
      )}
    </>
  );

  const base =
    'glass group relative inline-flex select-none items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-left transition-all duration-500 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_18px_40px_-18px_rgba(96,165,250,0.7)]';

  if (href) {
    return (
      <a href={href} className={base} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }

  return (
    <span className={`${base} cursor-default`} aria-label={`${copy.bottom} — скоро`} title="Приложение ещё не опубликовано">
      {inner}
    </span>
  );
}

export function StoreBadges({ className }: { className?: string }) {
  return (
    <motion.div
      className={`flex flex-wrap items-center justify-center gap-3 ${className ?? ''}`}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.55 } } }}
    >
      {(['apple', 'google'] as const).map((store) => (
        <motion.div
          key={store}
          variants={{
            hidden: { opacity: 0, y: 16, filter: 'blur(8px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: easeOutExpo } },
          }}
        >
          <Badge store={store} href={store === 'apple' ? site.appStoreUrl : site.googlePlayUrl} />
        </motion.div>
      ))}
    </motion.div>
  );
}
