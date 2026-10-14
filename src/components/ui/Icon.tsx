/**
 * Иконки — тонкие штриховые глифы в стиле Feather: именно этот набор использует
 * само приложение (@expo/vector-icons → Feather). Свои инлайновые пути вместо
 * библиотеки иконок: меньше зависимостей и гарантированно тот же рисунок.
 */
import type { SVGProps } from 'react';

const P = {
  home: ['M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20Z', 'M9 21.5V13h6v8.5'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.35-4.35'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  play: ['M6 4.5 19 12 6 19.5Z'],
  mic: ['M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 11v1a7 7 0 0 1-14 0v-1', 'M12 19v3'],
  subtitles: ['M2 6.5h20v11H2Z', 'M6 13h4', 'M14 13h4', 'M6 16.5h9'],
  skip: ['M5 4.5 14 12 5 19.5Z', 'M19 4.5v15'],
  pip: ['M2 5.5h20v13H2Z', 'M12 12.5h7v3.5h-7Z'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7', 'M21 3.5V9h-5.5'],
  shield: ['M12 22s8-4 8-10V5.5L12 2.5l-8 3V12c0 6 8 10 8 10Z', 'M9 12l2 2 4-4'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6.5V12l4 2'],
  pie: ['M21.2 15.9A10 10 0 1 1 8 2.8', 'M22 12A10 10 0 0 0 12 2v10Z'],
  users: [
    'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M22 21v-2a4 4 0 0 0-3-3.9',
    'M16 3.1a4 4 0 0 1 0 7.8',
  ],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9Z'],
  tv: ['M2 4.5h20v13H2Z', 'M8 21h8', 'M12 17.5V21'],
  layers: ['M12 2.5 2 7.5l10 5 10-5Z', 'M2 12.5l10 5 10-5', 'M2 17l10 5 10-5'],
  gauge: ['M22 12h-4l-3 8-4-16-3 8H2'],
  archive: ['M21 8.5v11.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5', 'M1 3h22v5.5H1Z', 'M10 12.5h4'],
  sparkle: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z', 'M19 17l.7 1.8L21.5 20l-1.8.7L19 22l-.7-1.3L16.5 20l1.8-1.2Z'],
  chevron: ['M6 9.5 12 15.5 18 9.5'],
  arrowRight: ['M4 12h15', 'M13 6l6 6-6 6'],
  arrowDown: ['M12 4v15', 'M6 13l6 6 6-6'],
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['M20 6.5 9 17.5 4 12.5'],
  star: ['M12 2.5l3 6.4 6.9 1-5 5 1.2 7-6.1-3.3-6.1 3.3 1.2-7-5-5 6.9-1Z'],
  heart: ['M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1Z'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z'],
  filter: ['M3 5h18l-7 8v6l-4 2v-8Z'],
  cast: ['M2 20h.01', 'M2 16a4 4 0 0 1 4 4', 'M2 12a8 8 0 0 1 8 8', 'M6 4h14a2 2 0 0 1 2 2v10'],
} as const;

export type IconName = keyof typeof P | 'apple' | 'gplay';

const FILLED: Partial<Record<IconName, string>> = {
  apple:
    'M17.05 12.5c-.03-2.6 2.1-3.85 2.2-3.9-1.2-1.76-3.06-2-3.72-2.03-1.58-.16-3.09.93-3.9.93-.8 0-2.05-.9-3.37-.88-1.73.03-3.33 1-4.22 2.55-1.8 3.12-.46 7.74 1.29 10.27.86 1.24 1.88 2.63 3.22 2.58 1.29-.05 1.78-.83 3.34-.83 1.56 0 2 .83 3.36.8 1.39-.02 2.27-1.26 3.12-2.5.98-1.44 1.39-2.83 1.41-2.9-.03-.01-2.7-1.04-2.73-4.12M14.6 4.9c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.3-.58 3.02-1.44',
  gplay:
    'M3.6 1.8a1.5 1.5 0 0 0-.83 1.35v17.7c0 .57.3 1.07.78 1.34l9.9-10.2L3.6 1.8Zm11.2 11.55 2.9 2.99-9.6 5.45 6.7-8.44Zm0-2.7L8.1 2.2l9.6 5.45-2.9 3Zm3.9 3.99-2.55-2.63L18.7 9.4l2.76 1.57c.83.47.83 1.6 0 2.07l-2.76 1.57Z',
};

type Props = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, size = 20, strokeWidth = 1.75, ...rest }: Props) {
  const filled = FILLED[name];
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
        <path d={filled} />
      </svg>
    );
  }
  const paths = P[name as keyof typeof P] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
