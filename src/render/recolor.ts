import { CanvasTexture, Color, type Texture } from 'three';

// Repaint parts of a texture by hue, e.g. give a second person different clothes
// from the same model. Pixels whose hue falls in [hueMin, hueMax] (degrees) and
// that aren't grey are given `toHue`, with saturation and lightness scaled.
export interface RecolorRule {
  hueMin: number;
  hueMax: number;
  toHue: number;
  sat: number; // saturation multiplier
  light: number; // lightness multiplier
}

const MIN_SATURATION = 0.15; // greys, whites and blacks are left alone

export function recolorTexture(src: Texture, rules: readonly RecolorRule[]): Texture {
  const img = src.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const c = new Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < px.length; i += 4) {
    c.setRGB(px[i]! / 255, px[i + 1]! / 255, px[i + 2]! / 255);
    c.getHSL(hsl);
    if (hsl.s < MIN_SATURATION) continue;
    const deg = hsl.h * 360;
    const rule = rules.find((r) => deg >= r.hueMin && deg <= r.hueMax);
    if (!rule) continue;
    c.setHSL(rule.toHue / 360, Math.min(1, hsl.s * rule.sat), Math.min(1, hsl.l * rule.light));
    px[i] = Math.round(c.r * 255);
    px[i + 1] = Math.round(c.g * 255);
    px[i + 2] = Math.round(c.b * 255);
  }
  ctx.putImageData(data, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.flipY = src.flipY;
  tex.colorSpace = src.colorSpace;
  tex.wrapS = src.wrapS;
  tex.wrapT = src.wrapT;
  tex.channel = src.channel;
  return tex;
}
