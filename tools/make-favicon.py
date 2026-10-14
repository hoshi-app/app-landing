"""
make-favicon.py — иконка для вкладки браузера со скруглёнными углами.

    python tools/make-favicon.py

Берёт public/icon-1024.png (белая звезда на #171717), скругляет углы и кладёт:
  public/favicon.svg — вектор, основной вариант;
  public/favicon.png — растровая копия 256x256 с прозрачными углами для старых браузеров.

Пропорции звезды взяты из брендбука приложения: ровно 70% канвы, по X отцентрована,
по Y опущена на 2.9% (то же расположение, что в logo.png и в иконках приложения).
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
CANVAS = 1024
RADIUS = 230          # скругление в долях канвы: ~22.4%, как у squircle в iOS
STAR_SHARE = 0.70     # звезда занимает 70% канвы
STAR_DROP = 0.029     # и опущена на 2.9% вниз

# тот же путь, что в app/assets/logo.svg
STAR_PATH = (
    "m1313.21,5.89l217.33,367.92c2.19,3.71,6.2,5.96,10.5,5.89l581.1-8.54c12.22-.18,"
    "16.85,15.88,6.41,22.24l-421.75,256.76c-5.59,3.4-7.42,10.66-4.11,16.3l282.67,483.02c5.71,"
    "9.76-4.01,21.27-14.59,17.28l-681.39-257.37c-3.45-1.3-7.32-.95-10.47.97l-986.7,599.93c-11.03,"
    "6.71-23.42-6.36-16.13-17.02l516.47-755.48c4.38-6.41,1.61-15.23-5.65-17.99L7.76,424.75c-12.38-"
    "4.69-9.16-23.02,4.08-23.21l1015.12-14.41c3.91-.06,7.55-2.01,9.75-5.25L1292.97,5.25c4.95-7.27,"
    "15.77-6.92,20.24.65Z"
)
STAR_VB = (2134.34, 1512.14)


def rounded_mask(size: int, radius: int) -> Image.Image:
    ss = 4
    mask = Image.new("L", (size * ss, size * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * ss - 1, size * ss - 1], radius=radius * ss, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def make_svg() -> str:
    star_w = CANVAS * STAR_SHARE
    star_h = star_w * STAR_VB[1] / STAR_VB[0]
    x = (CANVAS - star_w) / 2
    y = (CANVAS - star_h) / 2 + CANVAS * STAR_DROP
    scale = star_w / STAR_VB[0]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}" width="{CANVAS}" height="{CANVAS}">\n'
        f'  <rect width="{CANVAS}" height="{CANVAS}" rx="{RADIUS}" fill="#171717"/>\n'
        f'  <g transform="translate({x:.1f} {y:.1f}) scale({scale:.6f})">\n'
        f'    <path fill="#ffffff" d="{STAR_PATH}"/>\n'
        f"  </g>\n</svg>\n"
    )


def main() -> int:
    src = os.path.join(PUBLIC, "icon-1024.png")
    if not os.path.exists(src):
        print(f"нет {src}")
        return 1

    svg_path = os.path.join(PUBLIC, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(make_svg())

    img = Image.open(src).convert("RGBA").resize((CANVAS, CANVAS), Image.LANCZOS)
    img.putalpha(rounded_mask(CANVAS, RADIUS))
    img.resize((256, 256), Image.LANCZOS).save(os.path.join(PUBLIC, "favicon.png"), "PNG", optimize=True)

    print(f"favicon.svg {os.path.getsize(svg_path)} B")
    print(f"favicon.png {os.path.getsize(os.path.join(PUBLIC, 'favicon.png')) // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
