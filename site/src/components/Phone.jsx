/**
 * Phone.jsx — корпус телефона вокруг слота экрана.
 *
 * Корпус — готовая картинка (`site/public/frames/iphone.webp`, 490×1000,
 * прозрачный экран внутри): рамка, кнопки и Dynamic Island уже нарисованы.
 * Кадр приложения кладётся под неё в вырез экрана — поэтому интерфейс не
 * приходится вырезать по скруглению, а капсула всегда на своём месте.
 *
 * Вырез измерен по файлу: x 25…464, y 22…977, радиус 77 px при ширине 490.
 */
export default function Phone({ children, className = '' }) {
  return (
    <div className={`phone ${className}`.trim()}>
      <div className="phone__screen">{children}</div>
      <img
        className="phone__frame"
        src="./frames/iphone.webp"
        width="490"
        height="1000"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
    </div>
  );
}
