"""
media.py — общий помощник скриптов подготовки материалов.

Лендинг собирается Vite из `site/`: разметка и стили живут в `site/src`,
а картинки — статика Vite в `site/public`, её сборщик копирует в `dist` как
есть. Скрипты здесь только готовят картинки: кладут AVIF (основной формат)
и WebP (фолбэк) рядом. Никаких манифестов: `tools/verify.mjs` сверяет
заявленные в разметке размеры с настоящими файлами, поэтому второй источник
правды не нужен.
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site", "public")


def save_avif(im: Image.Image, rel: str, quality: int) -> tuple[int, int]:
    path = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "AVIF", quality=quality, method=6)
    return im.size


def save_webp(im: Image.Image, rel: str, quality: int) -> tuple[int, int]:
    path = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)
    return im.size


def fit(im: Image.Image, width: int) -> Image.Image:
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def kb(rel: str) -> int:
    return os.path.getsize(os.path.join(SITE, rel)) // 1024
