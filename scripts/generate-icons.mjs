#!/usr/bin/env node
/**
 * Generate the PWA app icons (public/icons/icon-192.png and icon-512.png)
 * with no image-library dependencies — just Node's zlib. Draws a coral heart
 * on the app's dark background, matching the "for Dad" theme.
 *
 * Run:  node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const BG = [11, 16, 32] // #0b1020
const HEART = [251, 113, 133] // #fb7185
const RING = [14, 165, 164] // #0ea5a4

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function inHeart(nx, ny) {
  // Normalized heart implicit curve. ny flipped so the point faces down.
  const x = nx
  const y = -ny
  const a = x * x + y * y - 1
  return a * a * a - x * x * y * y * y <= 0
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const cx = size / 2
  const cy = size / 2
  const scale = size * 0.34
  const r = size * 0.46 // background rounded-square radius

  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filter byte
    for (let x = 0; x < size; x++) {
      let color = BG

      // Rounded square corners -> leave as background (transparent-ish dark).
      const dxc = Math.abs(x - cx) - (size / 2 - r)
      const dyc = Math.abs(y - cy) - (size / 2 - r)
      const outsideCorner =
        dxc > 0 && dyc > 0 && Math.hypot(dxc, dyc) > r

      const nx = (x - cx) / scale
      const ny = (y - cy * 0.92) / scale
      if (!outsideCorner) {
        if (inHeart(nx, ny)) {
          color = HEART
        } else if (inHeart(nx * 0.82, ny * 0.82) === false && inHeart(nx * 1.12, ny * 1.12)) {
          color = RING // subtle outer glow ring of the heart
        }
      }

      const off = y * (size * 3 + 1) + 1 + x * 3
      raw[off] = color[0]
      raw[off + 1] = color[1]
      raw[off + 2] = color[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT, { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), png(size))
  console.log(`wrote icon-${size}.png`)
}
