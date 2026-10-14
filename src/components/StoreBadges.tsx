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
      <Icon name={store === 'apple' ? 'apple' : 'gplay'} size={store === 'apple' ? 24 : 22} className="shrink-0" />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mute">{copy.top}</span>
        <span className="mt-1 text-[0.95rem] font-semibold text-white">{copy.bottom}</span>
      </span>
      {!href && (
        <span className="ml-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-mute">
          скоро
        </span>
      )}
    </>
  );

  const base =
    'glass group inline-flex select-none items-center gap-3 rounded-2xl px-4 py-3 text-left transition-transform duration-300';

  if (href) {
    return (
      <a href={href} className={`${base} hover:-translate-y-0.5`} target="_blank" rel="noreferrer noopener">
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
