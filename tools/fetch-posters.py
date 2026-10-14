"""
fetch-posters.py — собирает постеры для ленты на лендинге.

    python tools/fetch-posters.py

Что делает:
  1) спрашивает у API Shikimori карточки выбранных тайтлов (название, статус,
     оценка, число серий, путь к постеру);
  2) качает постеры, ужимает до 420 px по ширине и сохраняет WebP в public/posters/,
     чтобы лендинг не зависел от чужого CDN и не весил десятки мегабайт;
  3) пишет src/data/posters.ts — готовый список для ленты.

Арт принадлежит правообладателям; в репозитории лежат только уменьшенные копии
для превью на странице приложения.
"""
import json
import os
import re
import sys
import urllib.request
from io import BytesIO

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "posters")
DATA_FILE = os.path.join(ROOT, "src", "data", "posters.ts")

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

WIDTH = 420
QUALITY = 82
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36"

STATUS = {
    "released": ("Вышло", "green"),
    "ongoing": ("Онгоинг", "blue"),
    "anons": ("Анонс", "orange"),
}
KIND = {
    "tv": "TV Сериал", "movie": "Фильм", "ona": "ONA", "ova": "OVA",
    "tv_special": "Спецвыпуск", "special": "Спецвыпуск", "music": "Клип", "pv": "Проморол",
}
MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def aired_label(value: str | None) -> str:
    """YYYY-MM-DD → «2024» / «окт 2027»: день и месяц '01' у шики означают «неизвестно»."""
    if not value:
        return ""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", value)
    if not m:
        return ""
    year, month, day = m.group(1), int(m.group(2)), m.group(3)
    if day == "01" and month == 1:
        return year
    if day == "01":
        return f"{MONTHS[month - 1]} {year}"
    return f"{day} {MONTHS[month - 1]} {year}"


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    url = f"{API}?ids={','.join(str(i) for i in IDS)}&limit=50"
    animes = json.loads(get(url))
    by_id = {int(a["id"]): a for a in animes}

    rows = []
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
        height = round(img.height * WIDTH / img.width)
        img = img.resize((WIDTH, height), Image.LANCZOS)
        name = f"{anime_id}.webp"
        img.save(os.path.join(OUT_DIR, name), "WEBP", quality=QUALITY, method=6)

        status = (a.get("status") or "").lower()
        badge, tone = STATUS.get(status, ("", "z8"))
        episodes = a.get("episodes") or 0
        aired = int((a.get("aired_on") or "0")[:4] or 0)
        if status == "ongoing":
            meta = f"{a.get('episodes_aired', 0)}/{episodes or '?'} эп."
        elif episodes:
            meta = f"{episodes} эп."
        else:
            meta = KIND.get(a.get("kind", ""), a.get("kind", ""))

        rows.append({
            "id": anime_id,
            "title": a.get("russian") or a.get("name") or "",
            "poster": f"posters/{name}",
            "badge": badge,
            "tone": tone,
            "meta": meta,
            "score": float(a.get("score") or 0),
            "aired": aired_label(a.get("aired_on")) or (str(aired) if aired else ""),
        })
        print(f"  ok {anime_id} {rows[-1]['title']}  {os.path.getsize(os.path.join(OUT_DIR, name)) // 1024} KB")

    body = ",\n".join(
        "  { id: %d, title: %s, poster: '%s', badge: %s, tone: '%s', meta: %s, score: %s, aired: %s }"
        % (
            r["id"],
            json.dumps(r["title"], ensure_ascii=False),
            r["poster"],
            json.dumps(r["badge"], ensure_ascii=False),
            r["tone"],
            json.dumps(r["meta"], ensure_ascii=False),
            r["score"],
            json.dumps(r["aired"], ensure_ascii=False),
        )
        for r in rows
    )
    ts = f"""// Сгенерировано tools/fetch-posters.py — правьте скрипт, а не файл.
// Постеры — уменьшенные копии обложек Shikimori, арт принадлежит правообладателям.

export type Poster = {{
  id: number;
  title: string;
  poster: string;
  badge: string;
  tone: 'green' | 'blue' | 'orange' | 'z8';
  meta: string;
  score: number;
  aired: string;
}};

export const posters: Poster[] = [
{body},
];
"""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(ts)

    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    print(f"\n{len(rows)} posters, {total // 1024} KB -> public/posters/")
    print(f"data -> {os.path.relpath(DATA_FILE, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
