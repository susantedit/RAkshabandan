/**
 * clay.tsx — the "cute collectible plasticine" material language.
 *
 * The whole 3D look hinges on two moves: kill metallic glare (metalness ≈ 0.05)
 * and push roughness high (≈ 0.85) so light wraps softly instead of glinting.
 * Individual thread types then break the rule *slightly* — zari gets a little
 * metalness, neon gets emissive, crystal gets transparency — while staying
 * inside the toybox rather than drifting toward photoreal metal.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { GemId, ThreadId } from '../lib/payload'

export const HEX = {
  kesar: 0xfff8f0,
  marigold: 0xffb703,
  marigoldDeep: 0xe09a00,
  gulabi: 0xff4d6d,
  gulabiDeep: 0xd93a56,
  pista: 0x2ec4b6,
  pistaDeep: 0x22a498,
  sky: 0x3a86ff,
  espresso: 0x2b2523,
  puffy: 0xffffff,
  clayline: 0xf0e6da,
  claydrop: 0xeaddcf,
  gold: 0xe8a83c,
  goldLight: 0xffd98a,
  ghee: 0xfff3e0,
  flame: 0xff8a1f,
  syrup: 0x8a4b2a,
  cream: 0xfdf1df,
} as const

/** Base clay material — everything in the scene starts here. */
export function ClayMat({
  color,
  roughness = 0.85,
  metalness = 0.05,
  ...rest
}: {
  color: THREE.ColorRepresentation
  roughness?: number
  metalness?: number
} & Omit<JSX.IntrinsicElements['meshStandardMaterial'], 'color'>) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      flatShading={false}
      {...rest}
    />
  )
}

/* ── thread looks ─────────────────────────────────────────────────────────── */

export interface ThreadLook {
  cord: number
  cordAlt: number
  bead: number
  ring: number
  roughness: number
  metalness: number
  emissive: number
  emissiveIntensity: number
  transparent: boolean
  opacity: number
  /** Crystal swaps round beads for faceted ones. */
  faceted: boolean
  /** Neon adds a coloured glow light at the centre. */
  glow: number | null
}

export const THREAD_LOOK: Record<ThreadId, ThreadLook> = {
  gold: {
    cord: HEX.gold,
    cordAlt: HEX.goldLight,
    bead: 0xffc65c,
    ring: HEX.marigold,
    roughness: 0.44,
    metalness: 0.5,
    emissive: 0x000000,
    emissiveIntensity: 0,
    transparent: false,
    opacity: 1,
    faceted: false,
    glow: null,
  },
  neon: {
    cord: 0x00e5ff,
    cordAlt: 0xff4df0,
    bead: 0x7cf9ff,
    ring: 0x00e5ff,
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x00d6f5,
    emissiveIntensity: 0.85,
    transparent: false,
    opacity: 1,
    faceted: false,
    glow: 0x00e5ff,
  },
  crimson: {
    cord: 0xe03150,
    cordAlt: 0xff7e93,
    bead: HEX.marigold,
    ring: 0xc32241,
    roughness: 0.92,
    metalness: 0.03,
    emissive: 0x000000,
    emissiveIntensity: 0,
    transparent: false,
    opacity: 1,
    faceted: false,
    glow: null,
  },
  crystal: {
    cord: 0xbfe9ff,
    cordAlt: 0xffffff,
    bead: 0xe8f7ff,
    ring: 0xd9f3ff,
    roughness: 0.18,
    metalness: 0.22,
    emissive: 0x9fdcff,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.86,
    faceted: true,
    glow: null,
  },
}

export interface GemLook {
  core: number
  accent: number
  emissive: number
  emissiveIntensity: number
  roughness: number
  metalness: number
}

export const GEM_LOOK: Record<GemId, GemLook> = {
  mandala: {
    core: HEX.marigold,
    accent: HEX.gulabi,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.8,
    metalness: 0.06,
  },
  ruby: {
    core: 0xe0113a,
    accent: 0xff7089,
    emissive: 0xff1f4d,
    emissiveIntensity: 0.75,
    roughness: 0.3,
    metalness: 0.15,
  },
  coin: {
    core: 0xf2a93b,
    accent: 0xfff0c9,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.62,
  },
  monogram: {
    core: 0xffffff,
    accent: HEX.gulabi,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.72,
    metalness: 0.08,
  },
}

/* ── canvas textures ─────────────────────────────────────────────────────── */

function makeTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}

/**
 * Monogram plate. Drawing the glyph to a texture rather than extruding real 3D
 * text keeps us off a runtime font fetch — important for an app that must work
 * from a link with no network round-trip.
 */
export function useMonogramTexture(letter: string, fg = '#FF4D6D', bg = '#FFFFFF') {
  return useMemo(
    () =>
      makeTexture((ctx, size) => {
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = fg
        ctx.lineWidth = size * 0.045
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = fg
        ctx.font = `700 ${size * 0.5}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText((letter || 'R').slice(0, 2).toUpperCase(), size / 2, size * 0.54)
      }),
    [letter, fg, bg],
  )
}

/** Tech-coin face: ₿ over a milled edge. */
export function useCoinTexture() {
  return useMemo(
    () =>
      makeTexture((ctx, size) => {
        const c = size / 2
        ctx.fillStyle = '#F5B942'
        ctx.beginPath()
        ctx.arc(c, c, c, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFE0A3'
        ctx.beginPath()
        ctx.arc(c, c, c * 0.84, 0, Math.PI * 2)
        ctx.fill()

        // milled ticks
        ctx.strokeStyle = '#D9922B'
        ctx.lineWidth = size * 0.012
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(c + Math.cos(a) * c * 0.86, c + Math.sin(a) * c * 0.86)
          ctx.lineTo(c + Math.cos(a) * c * 0.97, c + Math.sin(a) * c * 0.97)
          ctx.stroke()
        }

        ctx.fillStyle = '#8A5A12'
        ctx.font = `700 ${size * 0.56}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('₿', c, c * 1.06)
      }),
    [],
  )
}

/** Soft radial blob used as a fake contact shadow. */
export function useShadowTexture() {
  return useMemo(
    () =>
      makeTexture((ctx, size) => {
        const c = size / 2
        const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
        gradient.addColorStop(0, 'rgba(43,37,35,0.95)')
        gradient.addColorStop(0.45, 'rgba(43,37,35,0.45)')
        gradient.addColorStop(1, 'rgba(43,37,35,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, size, size)
      }, 256),
    [],
  )
}

/** Rolled-up label texture for the vault door / contract seal. */
export function useLabelTexture(text: string, fg = '#1A1412', bg = '#FFB703') {
  return useMemo(
    () =>
      makeTexture((ctx, size) => {
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, size, size)

        // subtle golden shine gradient on nameplate
        const grad = ctx.createLinearGradient(0, 0, size, size)
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, size, size)

        // dark inset border
        ctx.strokeStyle = '#1A1412'
        ctx.lineWidth = size * 0.035
        ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96)

        ctx.fillStyle = fg
        ctx.font = `900 ${size * 0.22}px Fredoka, "Arial Black", Nunito, ui-rounded, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const words = text.toUpperCase().split(' ')
        const lines: string[] = []
        let line = ''
        for (const word of words) {
          const attempt = line ? `${line} ${word}` : word
          if (ctx.measureText(attempt).width > size * 0.82 && line) {
            lines.push(line)
            line = word
          } else line = attempt
        }
        if (line) lines.push(line)
        const lh = size * 0.25
        lines.slice(0, 3).forEach((l, i) => {
          ctx.fillText(l, size / 2, size / 2 + (i - (lines.length - 1) / 2) * lh)
        })
      }, 1024),
    [text, fg, bg],
  )
}
