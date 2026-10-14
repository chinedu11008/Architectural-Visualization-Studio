import * as THREE from 'three';
import { DEFAULT_BUILDING_ROLES } from './building-rules';

export const REFERENCE_PALETTE_VERSION = 5;

function hsv(red, green, blue) {
  const color = new THREE.Color().setRGB(red / 255, green / 255, blue / 255, THREE.SRGBColorSpace);
  const result = {};
  color.getHSL(result);
  return result;
}

function colorHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function isNearPaletteColor(candidate, palette) {
  const color = new THREE.Color(candidate);
  const minimumDistanceSquared = 0.16 ** 2;
  return palette.some((existing) => {
    const other = new THREE.Color(existing);
    const red = color.r - other.r;
    const green = color.g - other.g;
    const blue = color.b - other.b;
    return red * red + green * green + blue * blue < minimumDistanceSquared;
  });
}

function paletteFromPixels(pixels, width, height, matches, limit = 5) {
  const buckets = new Map();
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 32) continue;
    const pixel = index / 4;
    const row = Math.floor(pixel / width);
    const column = pixel % width;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const { h, s, l } = hsv(red, green, blue);
    if (!matches({ red, green, blue, h, s, l, row, column, width, height })) continue;
    const key = `${red >> 4}:${green >> 4}:${blue >> 4}`;
    const bucket = buckets.get(key) || { red: 0, green: 0, blue: 0, count: 0 };
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  const result = [];
  for (const bucket of [...buckets.values()].sort((a, b) => b.count - a.count)) {
    const color = colorHex(bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count);
    if (isNearPaletteColor(color, result)) continue;
    result.push(color);
    if (result.length >= limit) break;
  }
  return result;
}

export function inspectReference(source) {
  return new Promise((resolve) => {
    let objectUrl = null;
    const image = new Image();
    const finish = (result) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        canvas.height = 96;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const cropWidth = image.width * 0.66;
        const cropHeight = image.height * 0.62;
        const cropX = (image.width - cropWidth) / 2;
        const cropY = image.height * 0.18;
        context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const sceneCanvas = document.createElement('canvas');
        sceneCanvas.width = 128;
        sceneCanvas.height = 128;
        const sceneContext = sceneCanvas.getContext('2d', { willReadFrequently: true });
        sceneContext.drawImage(image, 0, 0, sceneCanvas.width, sceneCanvas.height);
        const scenePixels = sceneContext.getImageData(0, 0, sceneCanvas.width, sceneCanvas.height).data;
        const buckets = new Map();
        const fallbackBuckets = new Map();
        let greenPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index + 3] < 32) continue;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const row = Math.floor(index / (canvas.width * 4));
          const { h, s, l } = hsv(red, green, blue);
          if (h >= 0.17 && h <= 0.46 && s > 0.13) greenPixels += 1;
          const key = `${red >> 4}:${green >> 4}:${blue >> 4}`;
          const fallbackBucket = fallbackBuckets.get(key) || { red: 0, green: 0, blue: 0, count: 0 };
          fallbackBucket.red += red;
          fallbackBucket.green += green;
          fallbackBucket.blue += blue;
          fallbackBucket.count += 1;
          fallbackBuckets.set(key, fallbackBucket);
          if (l < 0.08 || l > 0.97) continue;
          if (row < canvas.height * 0.26 && h >= 0.49 && h <= 0.73 && s > 0.2 && l > 0.35) continue;
          if (h >= 0.17 && h <= 0.46 && s > 0.11) continue;
          const bucket = buckets.get(key) || { red: 0, green: 0, blue: 0, count: 0 };
          bucket.red += red;
          bucket.green += green;
          bucket.blue += blue;
          bucket.count += 1;
          buckets.set(key, bucket);
        }
        const candidates = [...buckets.values()].sort((a, b) => b.count - a.count);
        const palette = [];
        for (const bucket of candidates) {
          const candidate = colorHex(bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count);
          if (isNearPaletteColor(candidate, palette)) continue;
          palette.push(candidate);
          if (palette.length === 6) break;
        }
        if (palette.length < 3) {
          const fallbackCandidates = [...fallbackBuckets.values()].sort((a, b) => b.count - a.count);
          for (const bucket of fallbackCandidates) {
            const candidate = colorHex(bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count);
            if (isNearPaletteColor(candidate, palette)) continue;
            palette.push(candidate);
            if (palette.length === 3) break;
          }
        }
        const inLowerScene = ({ row, height }) => row / height > 0.48;
        const foliage = paletteFromPixels(scenePixels, sceneCanvas.width, sceneCanvas.height,
          ({ h, s, l }) => h >= 0.16 && h <= 0.46 && s > 0.12 && l > 0.08 && l < 0.84);
        const bark = paletteFromPixels(scenePixels, sceneCanvas.width, sceneCanvas.height,
          ({ h, s, l, row, height }) => row / height > 0.24 && h >= 0.025 && h <= 0.15 && s > 0.12 && l > 0.08 && l < 0.62);
        const lowerColors = ({ h, l, row, height }) => inLowerScene({ row, height })
          && !(h >= 0.16 && h <= 0.46) && l > 0.07 && l < 0.94;
        const hardscape = paletteFromPixels(scenePixels, sceneCanvas.width, sceneCanvas.height,
          ({ h, s, l, row, height }) => lowerColors({ h, l, row, height }) && (s < 0.34 || (h >= 0.025 && h <= 0.15)));
        const vehiclePaints = paletteFromPixels(scenePixels, sceneCanvas.width, sceneCanvas.height,
          ({ h, l, row, height }) => lowerColors({ h, l, row, height }), 6);
        finish({
          palette,
          greenery: greenPixels / (pixels.length / 4) > 0.018,
          contextStyle: {
            foliage,
            bark,
            hardscape,
            vehiclePaints,
          },
        });
      } catch (error) {
        finish({ palette: [], greenery: false, error: error.message || 'The reference image could not be sampled.' });
      }
    };
    image.onerror = () => finish({ palette: [], greenery: false, error: 'The reference image could not be loaded for palette sampling.' });
    if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      image.src = objectUrl;
      return;
    }
    const url = String(source || '');
    if (!url.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

export function rolesFromPalette(palette = []) {
  if (!palette.length) return { ...DEFAULT_BUILDING_ROLES };
  const ordered = [...palette].sort((first, second) => {
    const a = {};
    const b = {};
    new THREE.Color(first).getHSL(a);
    new THREE.Color(second).getHSL(b);
    return a.l - b.l;
  });
  const accent = [...palette].sort((first, second) => {
    const a = {};
    const b = {};
    new THREE.Color(first).getHSL(a);
    new THREE.Color(second).getHSL(b);
    return b.s - a.s;
  })[0];
  const glazing = palette.map((color) => {
    const hsl = {};
    new THREE.Color(color).getHSL(hsl);
    return { color, ...hsl };
  }).filter(({ h, s, l }) => h >= 0.47 && h <= 0.73 && s > 0.08 && l < 0.72)
    .sort((first, second) => Math.abs(first.h - 0.57) - Math.abs(second.h - 0.57) || first.l - second.l)[0]?.color;
  return {
    exteriorWall: ordered.at(-1) || DEFAULT_BUILDING_ROLES.exteriorWall,
    interiorWall: ordered.at(-2) || ordered.at(-1) || DEFAULT_BUILDING_ROLES.interiorWall,
    roof: ordered[0] || DEFAULT_BUILDING_ROLES.roof,
    trim: ordered.at(Math.floor(ordered.length / 2)) || DEFAULT_BUILDING_ROLES.trim,
    door: accent || ordered[1] || DEFAULT_BUILDING_ROLES.door,
    balustrade: ordered[0] || DEFAULT_BUILDING_ROLES.balustrade,
    glazing: glazing || DEFAULT_BUILDING_ROLES.glazing,
  };
}

