/**
 * Picture.jsx — картинка с AVIF-источником и WebP-фолбэком.
 *
 * Размеры пишутся в разметку всегда: без width/height браузер не знает, сколько
 * места оставить, и страница дёргается при загрузке. `priority` ставится ровно
 * на одну картинку — ту, что видна в первом кадре.
 */
export default function Picture({
  name,
  dir = 'screens',
  width,
  height,
  alt,
  priority = false,
  className = '',
}) {
  const base = `./${dir}/${name}`;

  return (
    <picture className={className}>
      <source srcSet={`${base}.avif`} type="image/avif" />
      <img
        src={`${base}.webp`}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  );
}
