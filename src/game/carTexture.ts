/* ------------------------------------------------------------------ */
/*  Top-down car sprites, drawn with a tiny graphics-command interface */
/*  so the exact same artwork can be rendered by Phaser in the game    */
/*  and by plain SVG in previews/tests.                               */
/* ------------------------------------------------------------------ */

import type { CarDef } from '../lib/gameData'

/** The subset of Phaser.GameObjects.Graphics the car art needs. */
export interface CarGraphics {
  fillStyle(color: number, alpha?: number): void
  lineStyle(width: number, color: number, alpha?: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  fillRoundedRect(x: number, y: number, w: number, h: number, radius: number): void
  strokeRoundedRect(x: number, y: number, w: number, h: number, radius: number): void
  fillCircle(x: number, y: number, radius: number): void
  fillEllipse(x: number, y: number, width: number, height: number): void
  fillPoints(points: { x: number; y: number }[], closeShape?: boolean): void
}

export const CAR_TEX_W = 74
export const CAR_TEX_H = 120
export const TRUCK_TEX_H = 148

/** Lighten (amt > 0) or darken (amt < 0) a 0xRRGGBB colour by a percentage. */
export function shade(hex: number, amt: number): number {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const mix = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * (amt / 100) : v * (1 + amt / 100))))
  return (mix(r) << 16) | (mix(g) << 8) | mix(b)
}

/**
 * Draws one car sprite (top-down, nose pointing up) and returns its size.
 * Player cars get a cute face, traffic/truck sprites stay faceless, and each
 * premium car model adds its own signature detailing.
 */
export function drawCarTexture(
  g: CarGraphics,
  body: number,
  roof: number,
  kind: CarDef['kind'] | 'traffic' | 'truck',
): { width: number; height: number } {
  const isTruck = kind === 'truck'
  const w = CAR_TEX_W
  const h = isTruck ? TRUCK_TEX_H : CAR_TEX_H
  const dark = shade(body, -28)
  const light = shade(body, 22)
  // shadow
  g.fillStyle(0x000000, 0.22)
  g.fillEllipse(w / 2, h / 2 + 5, w - 6, h - 8)
  // wheels
  g.fillStyle(0x23262d, 1)
  const wy2 = h - 42
  g.fillRoundedRect(1, 20, 11, 26, 4)
  g.fillRoundedRect(w - 12, 20, 11, 26, 4)
  g.fillRoundedRect(1, wy2, 11, 26, 4)
  g.fillRoundedRect(w - 12, wy2, 11, 26, 4)
  // body
  g.fillStyle(body, 1)
  g.fillRoundedRect(8, 3, w - 16, h - 6, 16)
  g.lineStyle(3, kind === 'racer' ? 0x5be0f0 : dark, 1)
  g.strokeRoundedRect(8, 3, w - 16, h - 6, 16)
  // glossy hood
  g.fillStyle(light, 0.55)
  g.fillRoundedRect(14, 8, w - 28, 22, 10)
  if (isTruck) {
    g.fillStyle(0xf4f7fb, 1)
    g.fillRoundedRect(12, 52, w - 24, h - 66, 8)
    g.lineStyle(2, 0xc7d2e0, 1)
    g.strokeRoundedRect(12, 52, w - 24, h - 66, 8)
    g.fillStyle(body, 1)
    g.fillRoundedRect(18, h / 2 - 6, w - 36, 12, 6)
  } else {
    // roof
    g.fillStyle(roof, 1)
    g.fillRoundedRect(15, 52, w - 30, 36, 10)
    g.lineStyle(2, dark, 0.6)
    g.strokeRoundedRect(15, 52, w - 30, 36, 10)
    // rear window
    g.fillStyle(0xbfe9ff, 1)
    g.fillRoundedRect(16, 92, w - 32, 15, 6)
  }
  // windshield
  g.fillStyle(0xcdefff, 1)
  g.fillRoundedRect(14, 27, w - 28, 22, 8)
  g.lineStyle(2, 0x7fb6cf, 1)
  g.strokeRoundedRect(14, 27, w - 28, 22, 8)
  if (kind !== 'traffic' && kind !== 'truck') {
    // cute eyes on the windshield (player cars)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(28, 38, 7.5)
    g.fillCircle(w - 28, 38, 7.5)
    g.fillStyle(0x26303b, 1)
    g.fillCircle(28, 36.5, 3.8)
    g.fillCircle(w - 28, 36.5, 3.8)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(29.5, 35, 1.4)
    g.fillCircle(w - 26.5, 35, 1.4)
  }
  // centre stripe
  if (kind === 'mint' || kind === 'standard') {
    g.fillStyle(light, 0.8)
    g.fillRoundedRect(w / 2 - 4, 6, 8, 18, 4)
  }
  if (kind === 'police') {
    g.fillStyle(0x2456e6, 1)
    g.fillRoundedRect(w / 2 - 17, 64, 16, 11, 4)
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(w / 2 - 2, 64, 5, 11, 2)
    g.fillStyle(0xe6352b, 1)
    g.fillRoundedRect(w / 2 + 2, 64, 16, 11, 4)
  }
  if (kind === 'taxi') {
    const s = 8
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 === 0 ? 0x23262d : 0xffffff, 1)
      g.fillRect(13 + i * s, 66, s, 9)
    }
    g.fillStyle(0x23262d, 1)
    g.fillRoundedRect(w / 2 - 9, 55, 18, 8, 3)
    g.fillStyle(0xffc91f, 1)
    g.fillRoundedRect(w / 2 - 8, 56, 16, 6, 2)
  }

  /* ---- signature styling for the premium cars (top-down view) ---- */
  if (kind === 'sport') {
    g.fillStyle(0xffffff, 0.92)
    g.fillRoundedRect(w / 2 - 12, 5, 7, 19, 3)
    g.fillRoundedRect(w / 2 + 5, 5, 7, 19, 3)
    g.fillRoundedRect(w / 2 - 12, 53, 7, 32, 3)
    g.fillRoundedRect(w / 2 + 5, 53, 7, 32, 3)
    g.fillStyle(0x23262d, 1)
    g.fillRoundedRect(12, 102, w - 24, 8, 4)
    g.fillRoundedRect(20, 96, 5, 9, 2)
    g.fillRoundedRect(w - 25, 96, 5, 9, 2)
  }
  if (kind === 'van') {
    // long side windows, roof rack and rear cargo doors
    g.fillStyle(0xbfe9ff, 1)
    g.fillRoundedRect(10, 64, 6, 24, 3)
    g.fillRoundedRect(w - 16, 64, 6, 24, 3)
    g.lineStyle(1.5, 0x7fb6cf, 0.9)
    g.strokeRoundedRect(10, 64, 6, 24, 3)
    g.strokeRoundedRect(w - 16, 64, 6, 24, 3)
    g.fillStyle(0x8a7a5c, 0.95)
    g.fillRoundedRect(16, 54, w - 32, 3, 2)
    g.fillRoundedRect(16, 60, w - 32, 3, 2)
    g.fillStyle(0xf5f0e2, 1)
    g.fillRoundedRect(16, 92, w - 32, 15, 5)
    g.fillStyle(0xd9cdb4, 1)
    g.fillRect(w / 2 - 1, 93, 2, 13)
  }
  if (kind === 'electric') {
    g.fillStyle(0x36c9f0, 0.95)
    g.fillRoundedRect(w / 2 - 3, 53, 6, 33, 3)
    // lightning bolt on the hood
    g.fillPoints(
      [
        { x: w / 2 + 3, y: 5 }, { x: w / 2 - 7, y: 17 }, { x: w / 2 - 1, y: 17 },
        { x: w / 2 - 5, y: 25 }, { x: w / 2 + 8, y: 13 }, { x: w / 2 + 1, y: 13 },
        { x: w / 2 + 6, y: 5 },
      ],
      true,
    )
  }
  if (kind === 'beetle') {
    // fat domed roof with twin black stripes over hood, roof and boot
    g.fillStyle(shade(roof, 12), 1)
    g.fillEllipse(w / 2, 70, w - 34, 44)
    g.fillStyle(0x23262d, 1)
    g.fillRoundedRect(w / 2 - 13, 5, 8, 19, 3)
    g.fillRoundedRect(w / 2 + 5, 5, 8, 19, 3)
    g.fillRoundedRect(w / 2 - 13, 53, 8, 32, 3)
    g.fillRoundedRect(w / 2 + 5, 53, 8, 32, 3)
    g.fillRoundedRect(w / 2 - 13, 89, 8, 18, 3)
    g.fillRoundedRect(w / 2 + 5, 89, 8, 18, 3)
    g.fillStyle(0x23262d, 0.9)
    g.fillRoundedRect(9, 84, 6, 18, 3)
    g.fillRoundedRect(w - 15, 84, 6, 18, 3)
  }
  if (kind === 'offroad') {
    // pickup bed, roof rack and bull bar
    g.fillStyle(0x2c3a3a, 1)
    g.fillRoundedRect(15, 90, w - 30, 22, 6)
    g.fillStyle(0x4a5c5c, 1)
    g.fillRoundedRect(18, 94, w - 36, 3, 1)
    g.fillRoundedRect(18, 101, w - 36, 3, 1)
    g.fillStyle(0x8a7a5c, 0.95)
    g.fillRoundedRect(16, 54, w - 32, 3, 2)
    g.fillRoundedRect(16, 61, w - 32, 3, 2)
    g.fillRoundedRect(w / 2 - 3, 54, 6, 10, 2)
    g.fillStyle(0xd8dee3, 1)
    g.fillRoundedRect(14, 17, w - 28, 5, 2)
    g.fillRoundedRect(18, 22, 4, 4, 1)
    g.fillRoundedRect(w - 22, 22, 4, 4, 1)
    g.fillStyle(0xffe36e, 1)
    g.fillCircle(24, 8, 3.2)
    g.fillCircle(34, 8, 3.2)
    g.fillCircle(w - 34, 8, 3.2)
    g.fillCircle(w - 24, 8, 3.2)
  }
  if (kind === 'sedan') {
    // gold beltline + glass sunroof + chrome grille
    g.fillStyle(0xcdb489, 1)
    g.fillRoundedRect(11, 52, 3, 42, 1)
    g.fillRoundedRect(w - 14, 52, 3, 42, 1)
    g.fillStyle(0x2b3a4a, 1)
    g.fillRoundedRect(w / 2 - 13, 58, 26, 22, 6)
    g.lineStyle(2, 0xe8dcc4, 0.9)
    g.strokeRoundedRect(w / 2 - 13, 58, 26, 22, 6)
    g.fillStyle(0xffffff, 0.85)
    g.fillRoundedRect(22, 18, w - 44, 2.5, 1)
    g.fillRoundedRect(22, 22.5, w - 44, 2.5, 1)
  }
  if (kind === 'racer') {
    g.fillStyle(0x36e2f5, 0.95)
    g.fillRoundedRect(w / 2 - 12, 5, 6, 19, 2)
    g.fillRoundedRect(w / 2 + 6, 5, 6, 19, 2)
    g.fillRoundedRect(w / 2 - 12, 53, 6, 31, 2)
    g.fillRoundedRect(w / 2 + 6, 53, 6, 31, 2)
    g.fillStyle(0x111318, 1)
    g.fillRoundedRect(9, 100, w - 18, 9, 4)
    g.fillRoundedRect(6, 96, 6, 14, 2)
    g.fillRoundedRect(w - 12, 96, 6, 14, 2)
  }
  if (kind === 'super') {
    g.fillStyle(0x5be0f0, 0.35)
    g.fillRoundedRect(w / 2 - 10, 52, 20, 36, 6)
    g.fillStyle(0x5be0f0, 1)
    g.fillRoundedRect(w / 2 - 3, 52, 6, 36, 3)
    g.fillRoundedRect(18, 5, w - 36, 4, 2)
    g.fillStyle(0x2b2f52, 0.95)
    g.fillRoundedRect(11, 16, 6, 14, 3)
    g.fillRoundedRect(w - 17, 16, 6, 14, 3)
    g.fillStyle(0xffffff, 0.5)
    g.fillRoundedRect(w / 2 - 2, 6, 4, 12, 2)
  }
  // headlights / taillights
  g.fillStyle(0xfff2b0, 1)
  g.fillCircle(17, 10, 5.5)
  g.fillCircle(w - 17, 10, 5.5)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(17, 9, 2.4)
  g.fillCircle(w - 17, 9, 2.4)
  g.fillStyle(0xe6352b, 1)
  g.fillRoundedRect(11, h - 10, 11, 6, 3)
  g.fillRoundedRect(w - 22, h - 10, 11, 6, 3)
  return { width: w, height: h }
}
