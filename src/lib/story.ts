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
  photoImage?: string
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

function loadPhoto(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/* ── the card ─────────────────────────────────────────────────────────────── */

export async function renderStoryCard(spec: StorySpec): Promise<Blob> {
  await fontsReady()
  const logoImg = await loadLogo()
  const photoImg = await loadPhoto(spec.photoImage)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  // 1. Royal Deep Crimson & Obsidian Radial Background Gradient
  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.35, 100, W / 2, H / 2, W * 0.85)
  bgGrad.addColorStop(0, '#30050B')
  bgGrad.addColorStop(0.5, '#170205')
  bgGrad.addColorStop(1, '#0D0103')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Double Gold Ornate Border Frame
  ctx.strokeStyle = '#D4AF37'
  ctx.lineWidth = 6
  roundRect(ctx, 24, 24, W - 48, H - 48, 36)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)'
  ctx.lineWidth = 3
  roundRect(ctx, 36, 36, W - 72, H - 72, 28)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let y = 90

  // 2. Ornate Header Badge — SIBLING AGREEMENT
  const badgeText = 'SIBLING AGREEMENT'
  ctx.font = '700 24px Cinzel, serif'
  const badgeW = ctx.measureText(badgeText).width + 80
  const badgeH = 54
  const badgeX = W / 2 - badgeW / 2

  ctx.fillStyle = '#500812'
  roundRect(ctx, badgeX, y, badgeW, badgeH, 27)
  ctx.fill()
  ctx.strokeStyle = '#D4AF37'
  ctx.lineWidth = 4
  roundRect(ctx, badgeX, y, badgeW, badgeH, 27)
  ctx.stroke()

  ctx.fillStyle = '#F3E5AB'
  ctx.fillText(`☸   ${badgeText}   ☸`, W / 2, y + badgeH / 2 + 1)
  y += badgeH + 40

  // 3. Sibling Names Row: Sujita ❤️ Susant
  ctx.font = body(32, 700)
  const sisterText = `♥ ${spec.sisterName || 'Sister'}`
  const brotherText = `${spec.brotherName || 'Brother'} ♥`
  const sw = ctx.measureText(sisterText).width + 48
  const bw = ctx.measureText(brotherText).width + 48
  const gap = 70
  const totalW = sw + gap + bw
  const startX = W / 2 - totalW / 2

  // Sister Pill
  ctx.fillStyle = '#A81B34'
  roundRect(ctx, startX, y, sw, 56, 28)
  ctx.fill()
  ctx.strokeStyle = '#E63946'
  ctx.lineWidth = 3
  roundRect(ctx, startX, y, sw, 56, 28)
  ctx.stroke()
  ctx.fillStyle = '#FFFDF8'
  ctx.fillText(sisterText, startX + sw / 2, y + 28)

  // Brother Pill
  ctx.fillStyle = '#0D6E6E'
  roundRect(ctx, startX + sw + gap, y, bw, 56, 28)
  ctx.fill()
  ctx.strokeStyle = '#2EC4B6'
  ctx.lineWidth = 3
  roundRect(ctx, startX + sw + gap, y, bw, 56, 28)
  ctx.stroke()
  ctx.fillStyle = '#E0F2F1'
  ctx.fillText(brotherText, startX + sw + gap + bw / 2, y + 28)

  // Heart Knot Circle
  ctx.fillStyle = '#170205'
  ctx.beginPath()
  ctx.arc(startX + sw + gap / 2, y + 28, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#D4AF37'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#D4AF37'
  ctx.font = '700 20px "Plus Jakarta Sans"'
  ctx.fillText('♥', startX + sw + gap / 2, y + 29)

  y += 85

  ctx.fillStyle = '#C5A059'
  ctx.font = '700 20px Cinzel, serif'
  ctx.fillText('◆ THE BOND IS REAL. THE BANTER IS LEGENDARY. ◆', W / 2, y)
  y += 45

  // 4. Hero Centerpiece — Custom Photo or Rakhi Emblem (540px × 440px)
  const heroW = 580
  const heroH = 460
  const heroX = W / 2 - heroW / 2

  ctx.fillStyle = 'rgba(212,175,55,0.2)'
  roundRect(ctx, heroX - 10, y - 10, heroW + 20, heroH + 20, 36)
  ctx.fill()
  ctx.strokeStyle = '#D4AF37'
  ctx.lineWidth = 5
  roundRect(ctx, heroX, y, heroW, heroH, 30)
  ctx.stroke()

  ctx.save()
  roundRect(ctx, heroX + 6, y + 6, heroW - 12, heroH - 12, 24)
  ctx.clip()
  if (photoImg) {
    ctx.drawImage(photoImg, heroX + 6, y + 6, heroW - 12, heroH - 12)
  } else if (logoImg) {
    ctx.fillStyle = '#1C0307'
    ctx.fillRect(heroX + 6, y + 6, heroW - 12, heroH - 12)
    ctx.drawImage(logoImg, W / 2 - 110, y + heroH / 2 - 110, 220, 220)
  } else {
    ctx.fillStyle = '#1C0307'
    ctx.fillRect(heroX + 6, y + 6, heroW - 12, heroH - 12)
    rakhiEmblem(ctx, W / 2, y + heroH / 2, 110, '#D4AF37')
  }
  ctx.restore()

  y += heroH + 50

  // 5. Result Section — THE WHEEL HAS SPOKEN & ₹51
  ctx.fillStyle = '#F3E5AB'
  ctx.font = '700 24px Cinzel, serif'
  ctx.fillText('◆ THE WHEEL HAS SPOKEN ◆', W / 2, y)
  y += 65

  if (spec.amount != null) {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 120px Cinzel, serif'
    ctx.fillText(inr(spec.amount), W / 2, y)
    y += 75

    ctx.fillStyle = '#800A1D'
    const bannerW = 340
    roundRect(ctx, W / 2 - bannerW / 2, y - 24, bannerW, 44, 10)
    ctx.fill()
    ctx.fillStyle = '#F3E5AB'
    ctx.font = '700 22px Cinzel, serif'
    ctx.fillText('FINAL SHAGUN', W / 2, y)
    y += 40

    ctx.fillStyle = '#D4AF37'
    ctx.font = body(22, 600)
    ctx.fillText('~ decided by fate ~', W / 2, y)
    y += 55
  }

  // 6. Shagun Negotiation Receipt Card
  if (spec.lines && spec.lines.length > 0) {
    const cardW = W - 180
    const cardX = W / 2 - cardW / 2
    const displayLines = spec.lines.slice(0, 4)
    const rowH = 64
    const cardH = displayLines.length * rowH + 60

    ctx.fillStyle = '#FFFBF2'
    roundRect(ctx, cardX, y, cardW, cardH, 28)
    ctx.fill()
    ctx.strokeStyle = '#D4AF37'
    ctx.lineWidth = 4
    roundRect(ctx, cardX, y, cardW, cardH, 28)
    ctx.stroke()

    // Receipt Header
    ctx.fillStyle = '#660C1C'
    ctx.font = '700 24px Cinzel, serif'
    ctx.fillText('👑 SHAGUN NEGOTIATION 👑', W / 2, y + 36)

    let rowY = y + 70
    for (let i = 0; i < displayLines.length; i++) {
      const line = displayLines[i]
      const isFinal = i === displayLines.length - 1

      if (isFinal) {
        ctx.fillStyle = '#FCE8B3'
        roundRect(ctx, cardX + 4, rowY, cardW - 8, rowH + 12, 16)
        ctx.fill()
      }

      ctx.textAlign = 'left'
      ctx.fillStyle = isFinal ? '#660C1C' : '#4A3525'
      ctx.font = body(26, isFinal ? 700 : 600)
      ctx.fillText(line.label, cardX + 40, rowY + rowH / 2)

      ctx.textAlign = 'right'
      ctx.font = display(isFinal ? 34 : 30, isFinal ? 900 : 700)
      ctx.fillStyle = isFinal ? '#660C1C' : '#2B1810'
      ctx.fillText(line.value, cardX + cardW - 40, rowY + rowH / 2)

      rowY += rowH
    }

    // Rubber Stamp Seal over receipt
    if (spec.stamp) {
      ctx.save()
      ctx.translate(cardX + cardW - 140, y + cardH - 10)
      ctx.rotate(-0.14)
      ctx.fillStyle = '#FFFDF8'
      roundRect(ctx, -120, -28, 240, 56, 10)
      ctx.fill()
      ctx.strokeStyle = '#990011'
      ctx.lineWidth = 5
      roundRect(ctx, -120, -28, 240, 56, 10)
      ctx.stroke()
      ctx.fillStyle = '#990011'
      ctx.font = '900 24px Cinzel, serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${spec.stamp.toUpperCase()} ❤`, 0, 2)
      ctx.restore()
    }

    y += cardH + 45
  }

  // 7. Playful Reaction
  if (spec.quote) {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#F3E5AB'
    ctx.font = body(26, 600)
    ctx.fillText(`“${spec.quote}”`, W / 2, y)
    y += 45
  }

  // 8. Footer Area
  ctx.textAlign = 'center'
  ctx.fillStyle = '#F3E5AB'
  ctx.font = '700 32px Cinzel, serif'
  ctx.fillText('anithor bond', W / 2, H - 140)

  ctx.fillStyle = '#A38B95'
  ctx.font = body(22, 500)
  ctx.fillText('A bond that protects, a love that connects.', W / 2, H - 98)

  ctx.fillStyle = '#D4AF37'
  ctx.font = body(20, 600)
  ctx.fillText('</> Made by Kanta Raj Luitel / Susant Luitel ❤', W / 2, H - 60)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Story card export failed'))),
      'image/png',
    )
  })
}
