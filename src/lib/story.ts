/**
 * story.ts — renders the "Sibling Agreement Story Card" as a 1080×1920 PNG on a
 * plain 2D canvas, so it can be downloaded or pushed straight into the OS share
 * sheet for Instagram. No server-side image service, no html2canvas.
 */

import { inr, inrPlain } from './money'
import { THREAD_META, type ThreadId } from './payload'

export interface StoryLine {
  label: string
  value: string
  /** Draws the row struck through in audit red. */
  struck?: boolean
}

export interface StorySpec {
  eyebrow: string
  headline: string
  sisterName: string
  brotherName: string
  thread: ThreadId
  /** Big hero number. Pass `null` to hide the amount block entirely. */
  amount: number | null
  amountCaption: string
  lines: StoryLine[]
  stamp?: string
  quote?: string
  accent: 'gulabi' | 'pista' | 'marigold' | 'sky'
}

const W = 1080
const H = 1920

const PALETTE = {
  kesar: '#FFF8F0',
  marigold: '#FFB703',
  gulabi: '#FF4D6D',
  pista: '#2EC4B6',
  sky: '#3A86FF',
  espresso: '#2B2523',
  puffy: '#FFFFFF',
  clayline: '#F0E6DA',
  claydrop: '#EADDCF',
  auditRed: '#D93A56',
}

const display = (size: number, weight = 700) =>
  `${weight} ${size}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
const body = (size: number, weight = 600) =>
  `${weight} ${size}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`
const numeric = (size: number) => `900 ${size}px Nunito, Fredoka, ui-rounded, system-ui, sans-serif`

/* ── primitives ───────────────────────────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Puffy clay card: hard bottom shadow + 3px border, same language as the UI. */
function clayCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 44,
  fill = PALETTE.puffy,
): void {
  ctx.fillStyle = PALETTE.claydrop
  roundRect(ctx, x, y + 16, w, h, r)
  ctx.fill()

  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()

  ctx.strokeStyle = PALETTE.clayline
  ctx.lineWidth = 5
  roundRect(ctx, x, y, w, h, r)
  ctx.stroke()
}

function pill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  bg: string,
  fg: string,
  size = 30,
): number {
  ctx.font = display(size, 700)
  const padX = 26
  const w = ctx.measureText(text).width + padX * 2
  const h = size + 26
  const x = cx - w / 2

  ctx.fillStyle = bg
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = PALETTE.espresso
  ctx.lineWidth = 5
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.stroke()

  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, y + h / 2 + 1)
  return h
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = attempt
    }
  }
  if (line) lines.push(line)
  return lines
}

function dotGrid(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(255,183,3,0.16)'
  for (let y = 24; y < H; y += 44) {
    for (let x = 24; x < W; x += 44) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** A flat cartoon rakhi: petal ring, thread band, centre gem. */
function rakhiEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  threadColor: string,
): void {
  // thread tails
  ctx.strokeStyle = threadColor
  ctx.lineWidth = 22
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.85, cy + r * 0.2)
  ctx.quadraticCurveTo(cx - r * 2.1, cy + r * 0.5, cx - r * 2.5, cy - r * 0.3)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + r * 0.85, cy + r * 0.2)
  ctx.quadraticCurveTo(cx + r * 2.1, cy + r * 0.5, cx + r * 2.5, cy - r * 0.3)
  ctx.stroke()

  // petals
  ctx.fillStyle = PALETTE.gulabi
  const petals = 12
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, r * 0.3, r * 0.19, a, 0, Math.PI * 2)
    ctx.fill()
  }

  // body
  ctx.fillStyle = threadColor
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = PALETTE.espresso
  ctx.lineWidth = 6
  ctx.stroke()

  ctx.fillStyle = PALETTE.marigold
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = PALETTE.espresso
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.fillStyle = PALETTE.espresso
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2)
  ctx.fill()
}

async function fontsReady(): Promise<void> {
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ])
  } catch {
    /* fall back to whatever is loaded */
  }
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
}

/* ── the card ─────────────────────────────────────────────────────────────── */

export async function renderStoryCard(spec: StorySpec): Promise<Blob> {
  await fontsReady()
  const logoImg = await loadLogo()

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  const accent = PALETTE[spec.accent]
  const threadColor = THREAD_META[spec.thread]?.swatch ?? PALETTE.marigold

  // backdrop
  ctx.fillStyle = PALETTE.kesar
  ctx.fillRect(0, 0, W, H)
  dotGrid(ctx)

  // festive top and bottom bands
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, W, 18)
  ctx.fillRect(0, H - 18, W, 18)

  let y = 96
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  y += pill(ctx, spec.eyebrow.toUpperCase(), W / 2, y, PALETTE.marigold, PALETTE.espresso, 28)
  y += 54

  // emblem
  rakhiEmblem(ctx, W / 2, y + 118, 118, threadColor)
  y += 268

  // headline
  ctx.fillStyle = PALETTE.espresso
  ctx.font = display(76, 700)
  const headlineLines = wrap(ctx, spec.headline, W - 170).slice(0, 3)
  for (const line of headlineLines) {
    ctx.fillText(line, W / 2, y)
    y += 88
  }
  y += 12

  // names — sister ⟷ brother
  ctx.font = display(30, 700)
  const sisterText = spec.sisterName || 'Sister'
  const brotherText = spec.brotherName || 'Brother'
  const sw = ctx.measureText(sisterText).width + 52
  const bw = ctx.measureText(brotherText).width + 52
  const gap = 76
  const totalW = sw + gap + bw
  const startX = W / 2 - totalW / 2

  pill(ctx, sisterText, startX + sw / 2, y, PALETTE.gulabi, '#FFFFFF', 30)
  pill(ctx, brotherText, startX + sw + gap + bw / 2, y, PALETTE.pista, '#06322E', 30)

  ctx.strokeStyle = threadColor
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(startX + sw + 12, y + 28)
  ctx.lineTo(startX + sw + gap - 12, y + 28)
  ctx.stroke()

  y += 90

  // amount hero readout
  if (spec.amount != null) {
    ctx.fillStyle = PALETTE.espresso
    ctx.font = display(116, 700)
    ctx.fillText(inr(spec.amount), W / 2, y)
    y += 78

    ctx.fillStyle = '#6F6058'
    ctx.font = body(32, 600)
    ctx.fillText(spec.amountCaption, W / 2, y)
    y += 68
  }

  // key-value breakdown card
  if (spec.lines && spec.lines.length > 0) {
    const cardW = W - 160
    const cardX = W / 2 - cardW / 2
    const rowH = 68
    const cardH = spec.lines.length * rowH + 40

    ctx.fillStyle = PALETTE.puffy
    ctx.strokeStyle = PALETTE.clayline
    ctx.lineWidth = 6
    roundRect(ctx, cardX, y, cardW, cardH, 28)
    ctx.fill()
    ctx.stroke()

    let rowY = y + 42
    for (const line of spec.lines) {
      ctx.textAlign = 'left'
      ctx.fillStyle = PALETTE.espresso
      ctx.font = body(32, 600)
      ctx.fillText(line.label, cardX + 44, rowY + rowH / 2)

      ctx.textAlign = 'right'
      ctx.font = display(34, 700)
      ctx.fillText(line.value, cardX + cardW - 44, rowY + rowH / 2)

      rowY += rowH
    }

    y += cardH + 40
  }

  // quote
  if (spec.quote) {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#6F6058'
    ctx.font = body(34, 600)
    for (const line of wrap(ctx, `“${spec.quote}”`, W - 220).slice(0, 3)) {
      ctx.fillText(line, W / 2, y)
      y += 48
    }
    y += 20
  }

  // rubber stamp, tilted
  if (spec.stamp) {
    ctx.save()
    ctx.translate(W / 2, Math.min(y + 40, H - 320))
    ctx.rotate(-0.13)
    ctx.font = display(56, 700)
    const text = spec.stamp.toUpperCase()
    const tw = ctx.measureText(text).width
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = PALETTE.auditRed
    ctx.lineWidth = 8
    roundRect(ctx, -tw / 2 - 34, -54, tw + 68, 108, 18)
    ctx.stroke()
    ctx.fillStyle = PALETTE.auditRed
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 4)
    ctx.restore()
  }

  // footer
  ctx.globalAlpha = 1
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (logoImg) {
    ctx.drawImage(logoImg, W / 2 - 50, H - 240, 100, 100)
  }

  ctx.fillStyle = PALETTE.marigold
  ctx.font = display(38, 700)
  ctx.fillText('anithor bond · Rakhi with Digital Love', W / 2, H - 128)

  ctx.fillStyle = '#9C8B7E'
  ctx.font = body(26, 600)
  ctx.fillText('A bond that protects, a love that connects · Don\'t forget to tag @susantgamerz in insta 📸', W / 2, H - 76)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Story card export failed'))),
      'image/png',
    )
  })
}
