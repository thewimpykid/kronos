/**
 * Generates build/icon.ico for the Windows installer.
 * Run automatically via "predev" / "prebuild" npm scripts.
 * No extra dependencies — uses Node built-ins only.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'
import { fileURLToPath } from 'url'
import path from 'path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ─── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii')
  const lenB  = Buffer.allocUnsafe(4); lenB.writeUInt32BE(data.length)
  const crcB  = Buffer.allocUnsafe(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([lenB, typeB, data, crcB])
}

function pixelsToPNG(size, pixels) {
  const stride = size * 4
  const raw = Buffer.alloc(size * (1 + stride))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + stride)] = 0
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride)
      .copy(raw, y * (1 + stride) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function blend(pixels, size, x, y, alpha, r, g, b) {
  const xi = Math.round(x), yi = Math.round(y)
  if (xi < 0 || xi >= size || yi < 0 || yi >= size) return
  const i = (yi * size + xi) * 4
  const a = alpha / 255, ea = pixels[i + 3] / 255
  const oa = a + ea * (1 - a)
  if (oa < 0.001) return
  pixels[i]     = Math.round((r * a + pixels[i]     * ea * (1 - a)) / oa)
  pixels[i + 1] = Math.round((g * a + pixels[i + 1] * ea * (1 - a)) / oa)
  pixels[i + 2] = Math.round((b * a + pixels[i + 2] * ea * (1 - a)) / oa)
  pixels[i + 3] = Math.round(oa * 255)
}

function fillCircle(pixels, size, cx, cy, R, r, g, b) {
  for (let y = Math.floor(cy - R) - 1; y <= Math.ceil(cy + R) + 1; y++) {
    for (let x = Math.floor(cx - R) - 1; x <= Math.ceil(cx + R) + 1; x++) {
      const d = Math.sqrt((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2)
      const alpha = Math.max(0, Math.min(255, (R + 0.5 - d) * 255))
      if (alpha > 0) blend(pixels, size, x, y, alpha, r, g, b)
    }
  }
}

function drawLine(pixels, size, x1, y1, x2, y2, thickness, r, g, b) {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  if (len < 0.01) return
  const steps = Math.ceil(len * 2), half = thickness / 2, margin = Math.ceil(half) + 1
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = x1 + t * (x2 - x1), py = y1 + t * (y2 - y1)
    for (let dy = -margin; dy <= margin; dy++) {
      for (let dx = -margin; dx <= margin; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy)
        const alpha = Math.max(0, Math.min(255, (half + 0.5 - d) * 255))
        if (alpha > 0) blend(pixels, size, Math.round(px + dx), Math.round(py + dy), alpha, r, g, b)
      }
    }
  }
}

function drawKronosIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  const cx = size / 2, cy = size / 2
  const R = size * 0.46, tw = size * 0.07

  fillCircle(pixels, size, cx, cy, R, 79, 70, 229)

  const tickOuter = R * 0.86, tickInner = R * 0.70
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 - Math.PI / 2
    drawLine(pixels, size,
      cx + Math.cos(angle) * tickOuter, cy + Math.sin(angle) * tickOuter,
      cx + Math.cos(angle) * tickInner, cy + Math.sin(angle) * tickInner,
      tw, 255, 255, 255)
  }

  drawLine(pixels, size, cx, cy, cx, cy - R * 0.62, tw, 255, 255, 255)
  drawLine(pixels, size, cx, cy, cx + R * 0.42, cy, tw, 255, 255, 255)
  fillCircle(pixels, size, cx, cy, tw, 255, 255, 255)

  return pixels
}

// ─── ICO ─────────────────────────────────────────────────────────────────────
function buildICO(pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6 + 16 * count
  let offset = headerSize
  const offsets = pngBuffers.map(p => { const o = offset; offset += p.length; return o })

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4)
  pngBuffers.forEach((png, i) => {
    const base = 6 + i * 16
    header[base] = 0; header[base + 1] = 0; header[base + 2] = 0; header[base + 3] = 0
    header.writeUInt16LE(1, base + 4); header.writeUInt16LE(32, base + 6)
    header.writeUInt32LE(png.length, base + 8); header.writeUInt32LE(offsets[i], base + 12)
  })
  return Buffer.concat([header, ...pngBuffers])
}

// ─── Run ─────────────────────────────────────────────────────────────────────
const sizes = [256, 64, 32, 16]
const pngs  = sizes.map(s => pixelsToPNG(s, drawKronosIcon(s)))
const ico   = buildICO(pngs)

mkdirSync(path.join(ROOT, 'build'), { recursive: true })
writeFileSync(path.join(ROOT, 'build', 'icon.ico'), ico)
console.log(`[kronos] Generated build/icon.ico (${sizes.join(', ')}px)`)
