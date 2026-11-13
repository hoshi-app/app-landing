"""
fetch-posters.py — обложки для стены постеров.

    python tools/fetch-posters.py

Скрипт спрашивает у API Shikimori названия выбранных тайтлов, качает обложки,
ужимает до 240 px по ширине и кладёт AVIF + WebP в site/posters/. Название нужно
только для alt: на стене постеры показываются без подписей, поэтому ни оценок,
ни статусов, ни числа серий здесь больше нет.

В конце печатается готовая разметка для site/index.html — размеры вписываются
в width/height, чтобы браузер знал геометрию до загрузки картинок.

Арт принадлежит правообладателям; в репозитории лежат только уменьшенные копии
для превью.
"""
import json
import os
import sys
import urllib.request
from io import BytesIO

from PIL import Image

import media

OUT_DIR = os.path.join(media.SITE, "posters")

API = "https://shikimori.io/api/animes"
IDS = [
    52991,  # Провожающая в последний путь Фрирен
    5114,   # Стальной алхимик: Братство
    9253,   # Врата Штейна
    57334,  # Дандадан
    52701,  # Подземелье вкусностей
    56784,  # Блич: Тысячелетняя кровавая война — Конфликт
    54857,  # Re:Zero 3
    55791,  # Ребёнок идола 2
    39894,  # Звучи, эуфониум! 3
    52215,  # О движении Земли
    53223,  # Царство 5
    55690,  # Опасность в моём сердце 2
    55102,  # Плач девичьей группы
    55888,  # Реинкарнация безработного 2.2
    21,     # Ван-Пис
    59068,  # Подземелье вкусностей 2
]

WIDTH = 240
AVIF_Q = 58
WEBP_Q = 78
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36"


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    url = f"{API}?ids={','.join(str(i) for i in IDS)}&limit=50"
    animes = json.loads(get(url))
    by_id = {int(a["id"]): a for a in animes}

    snippets = []
    for anime_id in IDS:
        a = by_id.get(anime_id)
        if not a:
            print(f"  пропуск {anime_id}: нет в ответе API")
            continue
        original = (a.get("image") or {}).get("original") or ""
        if not original or "missing_" in original:
            print(f"  пропуск {anime_id}: нет постера")
            continue

        src = original if original.startswith("http") else f"https://shikimori.io{original}"
        try:
            raw = get(src)
        except Exception as e:  # noqa: BLE001
            print(f"  пропуск {anime_id}: {e}")
            continue

        img = Image.open(BytesIO(raw)).convert("RGB")
        out = media.fit(img, WIDTH)
        w, h = out.size
        media.save_avif(out, f"posters/{anime_id}.avif", AVIF_Q)
        media.save_webp(out, f"posters/{anime_id}.webp", WEBP_Q)

        title = (a.get("russian") or a.get("name") or "").replace('"', "&quot;")
        snippets.append(
            f'        <img src="./posters/{anime_id}.webp" width="{w}" height="{h}" '
            f'alt="{title}" loading="lazy" decoding="async">'
        )
        print(
            f"  ok {anime_id:6} {title[:40]:42} {w}x{h}  "
            f"avif {media.kb(f'posters/{anime_id}.avif'):>2} KB"
        )

    print("\nразметка для site/index.html:\n")
    print("\n".join(snippets))
    print(f"\n{len(snippets)} постеров -> site/posters/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
