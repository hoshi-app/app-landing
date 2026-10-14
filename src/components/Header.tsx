import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useState } from 'react';
import { nav, socials } from '../data/copy';
import { ease, easeOutExpo } from '../lib/motion';
import { Icon } from './ui/Icon';
import { Logo } from './ui/Brand';

export function Header() {
  const { scrollY } = useScroll();
  const [lifted, setLifted] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useMotionValueEvent(scrollY, 'change', (v) => setLifted(v > 24));

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        initial={reduced ? { opacity: 0 } : { y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.1 }}
      >
        <div
          className={`transition-all duration-500 ${lifted ? 'border-b border-white/5 bg-bg/70 backdrop-blur-xl' : 'border-b border-transparent'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div className={`shell flex items-center justify-between transition-all duration-500 ${lifted ? 'h-14' : 'h-[4.5rem]'}`}>
            <a href="#top" className="flex items-center text-white" aria-label="hoshi — наверх">
              <Logo size={lifted ? 22 : 25} className="transition-all duration-500" />
            </a>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Разделы страницы">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="relative rounded-full px-3.5 py-2 text-sm text-mute transition-colors duration-300 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href="#download"
                className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-transform duration-300 hover:-translate-y-0.5 sm:inline-flex"
              >
                Скачать
              </a>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="glass grid h-10 w-10 place-items-center rounded-full text-white md:hidden"
                aria-label="Открыть меню"
                aria-expanded={open}
              >
                <Icon name="menu" size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              aria-label="Закрыть меню"
              className="absolute inset-0 h-full w-full bg-bg/80 backdrop-blur-xl"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              className="relative flex h-full flex-col justify-center gap-2 px-8"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } } }}
              aria-label="Разделы страницы"
            >
              {nav.map((item) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-white/5 py-4 text-3xl font-semibold text-white"
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
                  }}
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.a
                href="#download"
                onClick={() => setOpen(false)}
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-black"
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
                }}
              >
                Скачать <Icon name="arrowRight" size={18} />
              </motion.a>

              <motion.div
                className="mt-8 flex flex-wrap gap-3"
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
                }}
              >
                {socials.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 text-sm text-mute transition-colors duration-300 hover:text-white"
                  >
                    <Icon name={s.icon} size={16} />
                    <span>{s.label}</span>
                  </a>
                ))}
              </motion.div>
            </motion.nav>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="glass absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full text-white"
              aria-label="Закрыть меню"
            >
              <Icon name="close" size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
