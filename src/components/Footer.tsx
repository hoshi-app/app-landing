import { footer, nav } from '../data/copy';
import { Logo } from './ui/Brand';

export function Footer() {
  return (
    <footer className="border-t border-white/6 py-10">
      <div className="shell flex flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[30rem]">
            <Logo size={22} className="text-white" />
            <p className="mt-4 text-sm leading-relaxed text-dim">{footer.disclaimer}</p>
            <p className="mt-3 text-sm leading-relaxed text-dim">{footer.credits}</p>
          </div>

          <nav aria-label="Разделы страницы" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="text-mute transition-colors duration-300 hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/6 pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© {footer.year} hoshi</span>
          <span>Сделано для тех, кто смотрит аниме</span>
        </div>
      </div>
    </footer>
  );
}
