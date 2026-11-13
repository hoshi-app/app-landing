"""
prepare-screens.py — готовит скриншоты приложения для лендинга.

    python tools/prepare-screens.py

Сырые кадры лежат в .screens-src/ (в репозиторий не попадают: 15 МБ PNG).
Скрипт:

  1) уменьшает кадры до ширины реального отображения с запасом на 2x и сохраняет
     AVIF (основной формат) вместе с WebP (фолбэк);
  2) печатает width/height для каждой картинки — их вписывают в
     site/src/data/landing.js, а tools/verify.mjs сверяет заявленное с настоящим
     размером файла.

Dynamic Island в кадры не вклеивается: корпус телефона на странице — отдельная
картинка (`site/public/frames/iphone.webp`), и капсула в ней уже нарисована.
Внутри экрана остаётся только интерфейс приложения.

Портретные кадры показываются шириной 240–320 CSS px с запасом на 2x: кадр
героя готовится в 640 px, кадры глав — в 512.
"""
import os
import sys

from PIL import Image

import media

ROOT = media.ROOT
SRC = os.path.join(ROOT, ".screens-src")

AVIF_Q = 62
WEBP_Q = 78

# имя файла в .screens-src -> (имя на выходе, ширина)
# title стоит в герое (до 320 CSS px, нужен запас на 2x), home и search — только
# в главах (до 240 CSS px), поэтому им хватает 512.
PORTRAIT = {
    "home.PNG": ("home", 512),
    "title.PNG": ("title", 640),
    "search.PNG": ("search", 512),
}


def emit(img: Image.Image, name: str, width: int) -> None:
    """Кладёт AVIF + WebP по одному размеру и печатает атрибуты для разметки."""
    out = media.fit(img, width)
    w, h = out.size
    media.save_avif(out, f"screens/{name}.avif", AVIF_Q)
    media.save_webp(out, f"screens/{name}.webp", WEBP_Q)
    print(
        f"  {name:12} {w}x{h}  avif {media.kb(f'screens/{name}.avif'):>3} KB"
        f"  webp {media.kb(f'screens/{name}.webp'):>3} KB"
        f'  ->  width={w} height={h}'
    )


def main() -> int:
    if not os.path.isdir(SRC):
        print(f"нет папки {SRC} — положите туда сырые скриншоты")
        return 1

    def find(stem: str) -> str | None:
        for f in os.listdir(SRC):
            if f.lower() == stem.lower():
                return os.path.join(SRC, f)
        return None

    for src_name, (out_name, width) in PORTRAIT.items():
        path = find(src_name)
        if not path:
            print(f"  нет {src_name}")
            continue
        img = Image.open(path).convert("RGB")
        emit(img, out_name, width)

    total = sum(
        os.path.getsize(os.path.join(media.SITE, f"screens/{f}"))
        for f in os.listdir(os.path.join(media.SITE, "screens"))
    )
    print(f"\n{len(PORTRAIT)} кадра, {total // 1024} KB -> site/public/screens/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
