import type { ReactNode } from 'react';
import type { Feature } from '../../data/copy';
import { Icon } from './Icon';

/** Карточка с «прожектором»: рамка подсвечивается там, где курсор. */
export function SpotlightCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="card edge-glow group relative h-full overflow-hidden p-5"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(16rem circle at var(--spot-x, 50%) var(--spot-y, 0%), rgba(96,165,250,0.10), transparent 65%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function FeatureCard({ feature, titleAs = 'h4' }: { feature: Feature; titleAs?: 'h3' | 'h4' }) {
  const Title = titleAs;
  return (
    <SpotlightCard>
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/8 bg-white/4 text-accent">
        <Icon name={feature.icon} size={17} />
      </span>
      <Title className="mt-4 text-[0.95rem] font-semibold text-white">{feature.title}</Title>
      <p className="mt-1.5 text-sm leading-relaxed text-mute">{feature.text}</p>
    </SpotlightCard>
  );
}
