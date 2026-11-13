"""
make-brand.py — знак страницы из одного источника.

    python tools/make-brand.py

Пути звезды и вордмарка взяты из приложения (app/assets/logo.svg, logo_text.svg)
и лежат только здесь: скрипт пишет

  site/logo.svg               — звезда + «hoshi» одной картинкой для шапки и футера;
  site/favicon.svg            — звезда в скруглённом квадрате;
  site/favicon.png            — 256×256 с прозрачными углами для старых браузеров;
  site/apple-touch-icon.png   — 180×180 для «на экран Домой» в iOS.

Геометрия иконки — как в брендбуке: звезда занимает 70% канвы, по X отцентрована,
по Y опущена на 2.9%.
"""
import os
import sys

from PIL import Image, ImageDraw

import media

ROOT = media.ROOT
SITE = media.SITE
SOURCE = os.path.join(ROOT, "tools", "icon-source.png")

STAR_PATH = (
    "m1313.21,5.89l217.33,367.92c2.19,3.71,6.2,5.96,10.5,5.89l581.1-8.54c12.22-.18,"
    "16.85,15.88,6.41,22.24l-421.75,256.76c-5.59,3.4-7.42,10.66-4.11,16.3l282.67,483.02c5.71,"
    "9.76-4.01,21.27-14.59,17.28l-681.39-257.37c-3.45-1.3-7.32-.95-10.47.97l-986.7,599.93c-11.03,"
    "6.71-23.42-6.36-16.13-17.02l516.47-755.48c4.38-6.41,1.61-15.23-5.65-17.99L7.76,424.75c-12.38-"
    "4.69-9.16-23.02,4.08-23.21l1015.12-14.41c3.91-.06,7.55-2.01,9.75-5.25L1292.97,5.25c4.95-7.27,"
    "15.77-6.92,20.24.65Z"
)
STAR_VB = (2134.34, 1512.14)

WORD_PATH = [
    "M 767.771 519.42 C 768.583 519.316 769.216 519.231 770.042 519.189 C 829.521 516.2 893.172 527.416 939.126 567.748 C 966.696 592.025 981.765 623.694 983.571 660.272 C 988.477 759.671 898.998 809.944 810.379 814.244 C 809.664 814.327 808.948 814.399 808.231 814.459 C 750.492 819.047 686.271 806.912 640.076 768.945 C 584.274 723.082 576.277 637.65 623.442 582.443 C 659.689 540.016 713.114 523.827 767.771 519.42 z M 781.578 590.354 C 795.931 589.01 813.092 591.637 825.435 600.408 C 858.688 624.036 858.843 690.946 837.667 722.483 C 828.196 736.59 812.552 741.421 796.44 743.954 C 754.39 745.362 731.329 728.931 726.076 685.955 C 720.694 641.913 730.356 596.255 781.578 590.354 z",
    "M 347.849 430.536 C 349.972 435.972 348.749 560.99 348.772 578.688 C 349.987 577.303 351.24 575.953 352.53 574.637 C 385.934 540.645 424.484 518.955 473.056 518.84 C 518.379 518.733 560.832 540.279 570.913 587.932 C 577.168 617.497 575.018 649.517 575.032 679.72 L 575.084 803.818 L 442.864 803.712 L 442.869 667.196 C 442.919 662.626 442.896 658.055 442.8 653.486 C 442.092 630.29 434.462 607.276 406.945 609.136 C 382.422 610.793 364.153 627.513 348.769 645.083 C 348.069 697.746 348.876 751.058 348.581 803.841 L 214.389 803.697 C 216.372 683.504 213.808 560.433 214.715 439.919 C 257.126 438.276 305.073 433.825 347.849 430.536 z",
    "M 1435.43 431.406 C 1437.32 431.119 1442.84 430.985 1445.01 430.869 L 1445.1 578.736 C 1445.89 577.856 1446.7 576.995 1447.52 576.154 C 1481.41 541.457 1518.36 519.676 1567.99 518.925 C 1615.02 517.772 1658.33 541.32 1667.73 590.448 C 1673.21 619.109 1671.22 650.352 1671.21 679.604 L 1671.13 804.003 C 1627.92 803.072 1582.44 803.749 1539.06 803.773 L 1539.04 677.75 C 1539.2 650.114 1543.07 604.827 1501.74 609.301 C 1478.26 611.843 1459.46 627.755 1445.19 645.55 L 1445.12 803.8 L 1312.81 803.748 L 1312.93 440.137 C 1352.22 438.577 1396.04 434.502 1435.43 431.406 z",
    "M 1130.8 519.43 C 1171.7 514.878 1237.76 524.186 1278.28 532.701 C 1276.53 556.096 1273.36 582.034 1270.96 605.569 C 1248.94 599.571 1116.68 568.711 1115.33 606.329 C 1118.46 618.48 1154.07 621.964 1165.52 624.123 C 1220.97 634.586 1297.19 647.125 1297.5 719.045 C 1297.86 803.349 1194.23 814.477 1130.75 814.299 C 1089.2 815.054 1028.64 806.256 989.777 794.986 C 991.271 778.75 995.33 733.449 998.597 718.887 C 1038.21 735.293 1083.85 742.859 1126.71 743.524 C 1174.68 744.268 1197.27 720.585 1134.75 709.573 C 1080.79 700.069 995.107 685.891 990.805 617.232 C 985.862 538.353 1070.75 523.32 1130.8 519.43 z",
    "M 1703.68 537.541 L 1835.74 537.648 L 1835.82 803.805 L 1703.68 803.76 L 1703.68 537.541 z",
    "M1770 410c90-10 90 100 0 100C1680 510 1680 420 1770 410z",
]
WORD_VB = "200 390 1680 440"
WORD_RATIO = 1680 / 440

CANVAS = 1024
RADIUS = 230          # скругление: ~22.4% канвы, как у squircle в iOS
STAR_SHARE = 0.70     # звезда занимает 70% канвы
STAR_DROP = 0.029     # и опущена на 2.9% вниз


def logo_svg() -> tuple[str, float, float]:
    """Звезда и вордмарк в тех же пропорциях, что были в строке шапки: 25 px + 10 px зазор."""
    star_w = 25.0
    word_h = 19.5
    gap = 10.0
    star_h = star_w * STAR_VB[1] / STAR_VB[0]
    word_w = word_h * WORD_RATIO
    total_w = star_w + gap + word_w
    star_y = (word_h - star_h) / 2
    paths = "".join(f'<path fill-rule="evenodd" d="{d}"/>' for d in WORD_PATH)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.4f} {word_h}" '
        f'width="{total_w:.0f}" height="{word_h}" fill="#fff">\n'
        f'  <svg x="0" y="{star_y:.4f}" width="{star_w}" height="{star_h:.4f}" '
        f'viewBox="0 0 {STAR_VB[0]} {STAR_VB[1]}"><path d="{STAR_PATH}"/></svg>\n'
        f'  <svg x="{star_w + gap:.1f}" y="0" width="{word_w:.4f}" height="{word_h}" '
        f'viewBox="{WORD_VB}">{paths}</svg>\n'
        f"</svg>\n"
    )
    return svg, total_w, word_h


def rounded_mask(size: int, radius: int) -> Image.Image:
    ss = 4
    mask = Image.new("L", (size * ss, size * ss), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * ss - 1, size * ss - 1], radius=radius * ss, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def favicon_svg() -> str:
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


def write(rel: str, body: str) -> None:
    path = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(body)
    print(f"  {rel:24} {os.path.getsize(path) // 1024} KB")


def main() -> int:
    logo, w, h = logo_svg()
    write("logo.svg", logo)
    write("favicon.svg", favicon_svg())

    if not os.path.exists(SOURCE):
        print(f"нет {SOURCE} — иконки PNG не обновлены")
        return 1

    img = Image.open(SOURCE).convert("RGBA").resize((CANVAS, CANVAS), Image.LANCZOS)
    img.putalpha(rounded_mask(CANVAS, RADIUS))
    img.resize((256, 256), Image.LANCZOS).save(os.path.join(SITE, "favicon.png"), "PNG", optimize=True)
    img.resize((180, 180), Image.LANCZOS).save(
        os.path.join(SITE, "apple-touch-icon.png"), "PNG", optimize=True
    )
    for rel in ("favicon.png", "apple-touch-icon.png"):
        print(f"  {rel:24} {os.path.getsize(os.path.join(SITE, rel)) // 1024} KB")

    print(f"\nлого: {w:.1f}×{h} -> site/logo.svg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
