"""
prepare-screens.py — готовит скриншоты приложения для лендинга.

    python tools/prepare-screens.py

Сырые кадры лежат в .screens-src/ (в репозиторий не попадают: 15 МБ PNG).
Скрипт:

  1) вклеивает в портретные кадры настоящий Dynamic Island — его нет на снимке,
     потому что он чёрный на чёрном фоне приложения, а нарисованный в вёрстке
     «похожий» остров выглядел игрушечно;
  2) уменьшает кадры до 2x от логического размера и сохраняет в WebP;
  3) кладёт результат в public/screens/.

Геометрия острова — iPhone 15 Pro: экран 393x852 pt при 3x, то есть 1179x2556 px.
Капсула 126x37 pt, верхний край 11 pt от верха экрана, фронтальная камера — в
правой части капсулы.
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, ".screens-src")
DST = os.path.join(ROOT, "public", "screens")

# логический размер экрана iPhone 15 Pro и множитель исходников
SHEET_W, SHEET_H = 393, 852
SCALE = 3  # 1179 = 393 * 3

ISLAND_W_PT, ISLAND_H_PT, ISLAND_TOP_PT = 126, 37, 11
LENS_D_PT = 11.5          # диаметр фронтальной камеры
LENS_FROM_RIGHT_PT = 20.5  # от правого края капсулы до центра объектива

SS = 4  # суперсэмплинг для гладких краёв

# имя файла в .screens-src -> имя на выходе
PORTRAIT = {
    "home.PNG": "home",
    "title.PNG": "title",
    "search.PNG": "search",
    "auth.png": "auth",
}
LANDSCAPE = {
    "player.PNG": "player",
    "player_skip.PNG": "player_skip",
}


def draw_island(img: Image.Image) -> None:
    """Вклеивает капсулу Dynamic Island и объектив камеры в верхнюю часть кадра."""
    w, h = img.size
    px = w / SHEET_W  # фактический масштаб кадра (3.0 для 1179x2556)

    x0 = (SHEET_W - ISLAND_W_PT) / 2 * px
    y0 = ISLAND_TOP_PT * px
    x1 = x0 + ISLAND_W_PT * px
    y1 = y0 + ISLAND_H_PT * px
    r = (y1 - y0) / 2

    # маска капсулы считаем только для верхней полосы — так 1179x2556 не разрастается
    band = int(y1 + 40 * px)
    mw, mh = w * SS, band * SS
    mask = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=r * SS, fill=255
    )
    mask = mask.resize((w, band), Image.LANCZOS)

    black = Image.new("RGB", (w, band), (0, 0, 0))
    img.paste(black, (0, 0), mask)

    # объектив: почти чёрный круг со слабым ободком и крошечным бликом —
    # на живом устройстве он едва читается, светящаяся точка выглядела фальшью
    cx = x1 - LENS_FROM_RIGHT_PT * px
    cy = (y0 + y1) / 2
    lr = LENS_D_PT / 2 * px

    lm = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(lm).ellipse(
        [(cx - lr) * SS, (cy - lr) * SS, (cx + lr) * SS, (cy + lr) * SS], fill=255
    )
    lm = lm.crop((0, 0, mw, band * SS)).resize((w, band), Image.LANCZOS)

    lens = Image.new("RGB", (w, band), (7, 8, 12))
    ImageDraw.Draw(lens).ellipse(
        [(cx - lr) * 0.86, (cy - lr) * 0.86, (cx + lr) * 0.86, (cy + lr) * 0.86],
        fill=(3, 4, 6),
    )
    img.paste(lens, (0, 0), lm)

    # блик: одна точка в верхней левой четверти объектива, почти незаметная
    gx, gy = cx - lr * 0.34, cy - lr * 0.34
    gr = max(1.0, lr * 0.17)
    gm = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(gm).ellipse(
        [(gx - gr) * SS, (gy - gr) * SS, (gx + gr) * SS, (gy + gr) * SS], fill=255
    )
    gm = gm.crop((0, 0, mw, band * SS)).resize((w, band), Image.LANCZOS)
    img.paste(Image.new("RGB", (w, band), (58, 74, 104)), (0, 0), gm)


def save(img: Image.Image, name: str, out_w: int) -> tuple[int, int]:
    out_h = round(img.height * out_w / img.width)
    resized = img.resize((out_w, out_h), Image.LANCZOS)
    path = os.path.join(DST, f"{name}.webp")
    resized.save(path, "WEBP", quality=90, method=6)
    return out_w, out_h


def main() -> int:
    if not os.path.isdir(SRC):
        print(f"нет папки {SRC} — положите туда сырые скриншоты")
        return 1
    os.makedirs(DST, exist_ok=True)

    def find(stem: str) -> str | None:
        for f in os.listdir(SRC):
            if f.lower() == stem.lower():
                return os.path.join(SRC, f)
        return None

    made = []
    for src_name, out_name in PORTRAIT.items():
        path = find(src_name)
        if not path:
            print(f"  нет {src_name}")
            continue
        img = Image.open(path).convert("RGB")
        draw_island(img)
        size = save(img, out_name, SHEET_W * 2)
        made.append((out_name, size, "портрет"))

    for src_name, out_name in LANDSCAPE.items():
        path = find(src_name)
        if not path:
            print(f"  нет {src_name}")
            continue
        img = Image.open(path).convert("RGB")
        # в ландшафте капсула уходит на левую чёрную полосу кадра и всё равно
        # не видна — чёрное на чёрном, поэтому не рисуем
        size = save(img, out_name, SHEET_H * 2)
        made.append((out_name, size, "ландшафт"))

    for name, size, kind in made:
        kb = os.path.getsize(os.path.join(DST, f"{name}.webp")) // 1024
        print(f"  {name:12} {size[0]}x{size[1]}  {kind:9} {kb} KB")

    total = sum(
        os.path.getsize(os.path.join(DST, f))
        for f in os.listdir(DST)
        if f.endswith(".webp")
    )
    print(f"\n{len(made)} кадров, {total // 1024} KB -> public/screens/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
