/**
 * image-size.mjs — размеры картинок по байтам, без зависимостей.
 *
 * Новостям не нужно вручную писать width/height: размеры читаются из самого
 * файла на сборке. Поддержаны форматы, которые лежат в site/public: SVG, PNG,
 * JPEG, WebP и GIF (включая анимированный — размеры в его заголовке). Неизвестный
 * формат — null, и тогда сборка честно падает.
 */

const svgSize = (text) => {
  const tag = text.match(/<svg\b[^>]*>/i);
  if (!tag) return null;

  const width = tag[0].match(/\swidth="([\d.]+)(?:px)?"/i);
  const height = tag[0].match(/\sheight="([\d.]+)(?:px)?"/i);
  if (width && height) {
    return { width: Math.round(Number(width[1])), height: Math.round(Number(height[1])) };
  }

  const box = tag[0].match(/\sviewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/i);
  if (box) return { width: Math.round(Number(box[3])), height: Math.round(Number(box[4])) };
  return null;
};

const pngSize = (buffer) => {
  if (buffer.length < 24) return null;
  if (buffer.toString('latin1', 1, 4) !== 'PNG') return null;
  if (buffer.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const jpegSize = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    /* SOF0…SOF3, SOF5…SOF7, SOF9…SOF11, SOF13…SOF15: в них высота и ширина. */
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isFrame) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    if (marker === 0xda) return null; // дошли до сжатых данных без SOF
    offset += 2 + length;
  }
  return null;
};

export function webpSize(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const type = buffer.toString('ascii', 12, 16);
  if (type === 'VP8X') {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  if (type === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (type === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** GIF87a/GIF89a: логический экран — 16-битные little-endian по смещениям 6 и 8. */
const gifSize = (buffer) => {
  if (buffer.length < 10) return null;
  const signature = buffer.toString('ascii', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
};

/** Размеры картинки по её байтам и имени (расширение важнее магии байтов). */
export function imageSize(buffer, name) {
  const ext = String(name).toLowerCase().split('.').pop();
  if (ext === 'svg') return svgSize(buffer.toString('utf8'));
  if (ext === 'png') return pngSize(buffer);
  if (ext === 'jpg' || ext === 'jpeg') return jpegSize(buffer);
  if (ext === 'webp') return webpSize(buffer);
  if (ext === 'gif') return gifSize(buffer);
  return null;
}
