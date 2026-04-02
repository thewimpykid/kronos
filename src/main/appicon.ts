/**
 * Programmatic icon generator for Kronos.
 * Builds PNG pixel data using canvas-style drawing, then encodes as a valid
 * PNG (CRC32 + zlib deflate from Node builtins — no extra dependencies).
 */
import zlib from 'zlib'
import { nativeImage, NativeImage } from 'electron'

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeB = Buffer.from(type, 'ascii')
  const lenB  = Buffer.allocUnsafe(4); lenB.writeUInt32BE(data.length)
  const crcB  = Buffer.allocUnsafe(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([lenB, typeB, data, crcB])
}

export function pixelsToPNG(size: number, pixels: Uint8Array): Buffer {
  const stride = size * 4
  const raw = Buffer.alloc(size * (1 + stride))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + stride)] = 0 // filter: None
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride)
      .copy(raw, y * (1 + stride) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// ─── ICO encoder (for electron-builder build/icon.ico) ───────────────────────

export function pngToICO(pngBuffers: Buffer[]): Buffer {
  // Modern ICO with embedded PNGs
  const count = pngBuffers.length
  const headerSize = 6 + 16 * count
  const offsets: number[] = []
  let offset = headerSize
  for (const png of pngBuffers) {
    offsets.push(offset)
    offset += png.length
  }

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type: ICO
  header.writeUInt16LE(count, 4) // count

  pngBuffers.forEach((png, i) => {
    const base = 6 + i * 16
    // Width/height: 0 = 256
    header[base]     = 0  // width (0 = 256 for 256px images)
    header[base + 1] = 0  // height
    header[base + 2] = 0  // color count
    header[base + 3] = 0  // reserved
    header.writeUInt16LE(1,  base + 4)  // planes
    header.writeUInt16LE(32, base + 6)  // bit count
    header.writeUInt32LE(png.length,    base + 8)   // size
    header.writeUInt32LE(offsets[i],    base + 12)  // offset
  })

  return Buffer.concat([header, ...pngBuffers])
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

function blendPixel(pixels: Uint8Array, size: number, x: number, y: number, alpha: number, r: number, g: number, b: number) {
  const xi = Math.round(x), yi = Math.round(y)
  if (xi < 0 || xi >= size || yi < 0 || yi >= size) return
  const i = (yi * size + xi) * 4
  const a  = alpha / 255
  const ea = pixels[i + 3] / 255
  const oa = a + ea * (1 - a)
  if (oa < 0.001) return
  pixels[i]     = Math.round((r * a + pixels[i]     * ea * (1 - a)) / oa)
  pixels[i + 1] = Math.round((g * a + pixels[i + 1] * ea * (1 - a)) / oa)
  pixels[i + 2] = Math.round((b * a + pixels[i + 2] * ea * (1 - a)) / oa)
  pixels[i + 3] = Math.round(oa * 255)
}

function fillCircle(pixels: Uint8Array, size: number, cx: number, cy: number, radius: number, r: number, g: number, b: number) {
  for (let y = Math.floor(cy - radius) - 1; y <= Math.ceil(cy + radius) + 1; y++) {
    for (let x = Math.floor(cx - radius) - 1; x <= Math.ceil(cx + radius) + 1; x++) {
      const d = Math.sqrt((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2)
      const alpha = Math.max(0, Math.min(255, (radius + 0.5 - d) * 255))
      if (alpha > 0) blendPixel(pixels, size, x, y, alpha, r, g, b)
    }
  }
}

function drawLine(pixels: Uint8Array, size: number, x1: number, y1: number, x2: number, y2: number, thickness: number, r: number, g: number, b: number) {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  if (len < 0.01) return
  const steps  = Math.ceil(len * 2)
  const half   = thickness / 2
  const margin = Math.ceil(half) + 1
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = x1 + t * (x2 - x1)
    const py = y1 + t * (y2 - y1)
    for (let dy = -margin; dy <= margin; dy++) {
      for (let dx = -margin; dx <= margin; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy)
        const alpha = Math.max(0, Math.min(255, (half + 0.5 - d) * 255))
        if (alpha > 0) blendPixel(pixels, size, Math.round(px + dx), Math.round(py + dy), alpha, r, g, b)
      }
    }
  }
}

// ─── Icon design ──────────────────────────────────────────────────────────────

function drawKronosIcon(size: number, style: 'color' | 'white'): Uint8Array {
  const pixels = new Uint8Array(size * size * 4) // fully transparent
  const cx = size / 2
  const cy = size / 2
  const R  = size * 0.46    // outer circle radius
  const tw = size * 0.07    // stroke/tick width

  if (style === 'color') {
    // Filled indigo background circle: #4f46e5
    fillCircle(pixels, size, cx, cy, R, 79, 70, 229)
  } else {
    // Tray: thin white ring
    const ring = size * 0.055
    for (let y = Math.floor(cy - R) - 1; y <= Math.ceil(cy + R) + 1; y++) {
      for (let x = Math.floor(cx - R) - 1; x <= Math.ceil(cx + R) + 1; x++) {
        const d = Math.sqrt((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2)
        const inner = R - ring
        const alpha = Math.max(0, Math.min(255, Math.min((R + 0.5 - d), (d - inner + 0.5)) * 255))
        if (alpha > 0) blendPixel(pixels, size, x, y, alpha, 255, 255, 255)
      }
    }
  }

  const fg = style === 'color' ? ([255, 255, 255] as const) : ([255, 255, 255] as const)

  // Tick marks at 12, 3, 6, 9
  const tickOuter = R * 0.86
  const tickInner = R * 0.70
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 - Math.PI / 2
    drawLine(pixels, size,
      cx + Math.cos(angle) * tickOuter, cy + Math.sin(angle) * tickOuter,
      cx + Math.cos(angle) * tickInner, cy + Math.sin(angle) * tickInner,
      tw, ...fg)
  }

  // Minute hand — pointing straight up (12 o'clock)
  drawLine(pixels, size, cx, cy, cx, cy - R * 0.62, tw, ...fg)

  // Hour hand — pointing right (3 o'clock), shorter
  drawLine(pixels, size, cx, cy, cx + R * 0.42, cy, tw, ...fg)

  // Center dot
  fillCircle(pixels, size, cx, cy, tw, ...fg)

  return pixels
}

// ─── Public API ───────────────────────────────────────────────────────────────

let _appIcon:  NativeImage | null = null
let _trayIcon: NativeImage | null = null

export function getAppIcon(): NativeImage {
  if (!_appIcon) {
    const png = pixelsToPNG(64, drawKronosIcon(64, 'color'))
    _appIcon = nativeImage.createFromBuffer(png)
  }
  return _appIcon
}

export function getTrayIcon(): NativeImage {
  if (!_trayIcon) {
    const png = pixelsToPNG(22, drawKronosIcon(22, 'white'))
    _trayIcon = nativeImage.createFromBuffer(png)
  }
  return _trayIcon
}

/** Called by scripts/generate-icons.mjs at build time — returns ICO buffer */
export function buildIconICO(): Buffer {
  const sizes = [256, 64, 32, 16]
  const pngs  = sizes.map(s => pixelsToPNG(s, drawKronosIcon(s, 'color')))
  return pngToICO(pngs)
}
