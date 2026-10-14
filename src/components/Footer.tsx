import { footer, nav, socials } from '../data/copy';
import { Logo } from './ui/Brand';
import { Icon } from './ui/Icon';

export function Footer() {
  return (
    <footer className="border-t border-white/6 py-10">
      <div className="shell flex flex-col gap-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[30rem]">
            <Logo size={22} className="text-white" />
            <p className="mt-4 text-sm leading-relaxed text-dim">{footer.disclaimer}</p>
            <p className="mt-3 text-sm leading-relaxed text-dim">{footer.credits}</p>
          </div>

          <div className="flex flex-col gap-6 sm:items-end">
            <nav aria-label="Разделы страницы" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-mute transition-colors duration-300 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <ul className="flex flex-wrap gap-3">
              {socials.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="glass group inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_18px_40px_-18px_rgba(96,165,250,0.7)]"
                  >
                    <Icon
                      name={s.icon}
                      size={16}
                      className="text-accent transition-transform duration-500 group-hover:scale-110"
                    />
                    <span className="font-medium text-white">{s.label}</span>
                    <span className="text-xs text-dim">{s.hint}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/6 pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© {footer.year} hoshi</span>
          <span>Сделано для тех, кто смотрит аниме</span>
        </div>
      </div>
    </footer>
  );
}
