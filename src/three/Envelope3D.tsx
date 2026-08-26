/**
 * Envelope3D.tsx — the holographic envelope that delivers the Duty Voucher deck.
 *
 * Iridescence is faked by cycling the material hue over time on a low-roughness,
 * high-metalness clay body: cheaper than a real thin-film shader and it keeps the
 * toybox look instead of drifting photoreal.
 */

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Voucher } from '../lib/payload'
import { ClayMat, HEX } from './clay'

/**
 * The voucher face.
 *
 * Portrait, and typeset by fitting rather than by fixed size — both for the same
 * reason. Three cards fanned across a phone-width canvas can never be wider than
 * a third of the screen, whatever the camera does (the pixel width of a card
 * works out to `screenWidth / 3` regardless of distance, fov or canvas height),
 * so ~110px per card is the hard ceiling. A landscape card spends that budget on
 * a long line of text and lands at ~15px lettering; a portrait one spends it on
 * four or five short lines and lands at ~18px. The auto-fit then guarantees the
 * title fits whatever the brother typed, instead of being clipped mid-word.
 *
 * Mipmaps are off for the same reason the roulette face has them off — minified
 * mipmaps smeared the lettering into an unreadable grey.
 */
const TEX_W = 640
const TEX_H = 1024
/** Vertical band the title gets to live in. */
const TITLE_TOP = 306
const TITLE_BOTTOM = 800
const TITLE_MAX_LINES = 5

/** Largest font size at which `title` wraps to `maxLines` or fewer inside `maxWidth`. */
function fitTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number) {
  const words = title.split(/\s+/).filter(Boolean)
  for (let size = 118; size >= 62; size -= 2) {
    ctx.font = `700 ${size}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
    // A single word wider than the card can never be wrapped out of trouble.
    if (words.some((word) => ctx.measureText(word).width > maxWidth)) continue
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word
      if (line && ctx.measureText(attempt).width > maxWidth) {
        lines.push(line)
        line = word
      } else line = attempt
    }
    if (line) lines.push(line)
    if (lines.length <= TITLE_MAX_LINES) return { size, lines }
  }
  return { size: 62, lines: [title] }
}

function useCardTexture(voucher: Voucher, brotherName: string) {
  return useMemo(() => {
    const w = TEX_W
    const h = TEX_H
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 16
    if (!ctx) return texture

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#FFB703'
      ctx.fillRect(0, 0, w, 26)
      ctx.fillStyle = '#FF4D6D'
      ctx.fillRect(0, h - 26, w, 26)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      ctx.font = '184px serif'
      ctx.fillText(voucher.emoji, w / 2, 66)

      ctx.fillStyle = '#A2938A'
      ctx.font = '700 36px Fredoka, Nunito, ui-rounded, system-ui, sans-serif'
      ctx.fillText('DUTY VOUCHER', w / 2, 258)

      // Title — the whole reason the card is this shape.
      const { size, lines } = fitTitle(ctx, voucher.title, w - 76)
      const lineHeight = size * 1.14
      const band = TITLE_BOTTOM - TITLE_TOP
      const startY = TITLE_TOP + Math.max(0, (band - lines.length * lineHeight) / 2)
      ctx.fillStyle = '#2B2523'
      ctx.font = `700 ${size}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
      lines.forEach((text, i) => {
        ctx.fillText(text, w / 2, startY + i * lineHeight)
      })

      ctx.strokeStyle = '#EFE4D8'
      ctx.lineWidth = 6
      ctx.setLineDash([18, 18])
      ctx.beginPath()
      ctx.moveTo(44, h - 148)
      ctx.lineTo(w - 44, h - 148)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#2B2523'
      ctx.font = 'italic 700 74px Fredoka, Nunito, ui-rounded, system-ui, sans-serif'
      ctx.fillText(brotherName || 'Bhai', w / 2, h - 122)

      texture.needsUpdate = true
    }

    draw()
    // Re-bake once Fredoka lands, or the deck keeps the fallback face forever.
    if (typeof document !== 'undefined' && document.fonts?.load) {
      document.fonts.load('700 104px Fredoka').then(draw).catch(() => {})
    }
    return texture
  }, [voucher, brotherName])
}

/**
 * Card size and spacing, in world units. The three cards are laid out *edge to
 * edge with a hairline gap* rather than overlapped: an overlapping fan looks
 * better but it covers the right-hand end of every title but the frontmost, and
 * a title you can read half of is worse than a slightly duller layout.
 */
const CARD_W = 1.26
const CARD_H = 2.016
/**
 * Spread wide enough that three portrait cards clear each other, narrow enough
 * that the outer two stay on a 375px screen — narrower than that and the deck
 * scales itself down to fit (see `Envelope3D`). `CARD_W + 0.06` keeps a visible
 * gap between neighbours without the fan overlap that hid their titles.
 */
const CARD_SPREAD = CARD_W + 0.06
/** Half the horizontal reach of a card once its small fan tilt is applied. */
const CARD_HALF_X = (CARD_W / 2) * Math.cos(0.05) + (CARD_H / 2) * Math.sin(0.05)

function VoucherCard({
  voucher,
  brotherName,
  index,
  total,
  progress,
}: {
  voucher: Voucher
  brotherName: string
  index: number
  total: number
  progress: number
}) {
  const texture = useCardTexture(voucher, brotherName)
  const card = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!card.current) return
    // Cards stagger out of the envelope and fan into a spread.
    const delay = index * 0.16
    const local = THREE.MathUtils.clamp((progress - delay) / (1 - delay || 1), 0, 1)
    const eased = 1 - Math.pow(1 - local, 3)
    const offset = index - (total - 1) / 2

    card.current.position.x = offset * CARD_SPREAD * eased
    card.current.position.y = -0.5 + eased * (0.81 - offset * offset * 0.09)
    // Each card gets its own depth so the fan always stacks in the same order.
    // Without this they shared a plane and whichever won the depth test chopped
    // a neighbour's title in half.
    card.current.position.z = 0.35 + eased * 0.75 + index * 0.05
    // The tilt is small: on a card this tall, a fan-style rotation swings the
    // corners far enough sideways to push the outer two off a narrow screen.
    card.current.rotation.z = (1 - eased) * 0.9 + offset * 0.05
    card.current.rotation.y = (1 - eased) * -1.1 + Math.sin(clock.elapsedTime * 0.7 + index) * 0.04
    card.current.scale.setScalar(0.3 + eased * 0.7)
    card.current.visible = local > 0.001
  })

  return (
    <group ref={card}>
      <mesh>
        <boxGeometry args={[CARD_W, CARD_H, 0.035]} />
        <ClayMat color={HEX.puffy} roughness={0.72} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[CARD_W - 0.04, CARD_H - 0.04]} />
        <meshStandardMaterial map={texture} roughness={0.68} metalness={0.04} toneMapped={false} />
      </mesh>
    </group>
  )
}

export interface Envelope3DProps {
  vouchers: Voucher[]
  brotherName: string
  /** 0 = sealed, 1 = flap fully open and cards fanned out. */
  open: number
}

export function Envelope3D({ vouchers, brotherName, open }: Envelope3DProps) {
  const flap = useRef<THREE.Group>(null)
  const holoA = useRef<THREE.MeshStandardMaterial>(null)
  const holoB = useRef<THREE.MeshStandardMaterial>(null)
  const body = useRef<THREE.Group>(null)
  const deck = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const shown = Math.min(3, Math.max(1, vouchers.length))

  // Flat triangular flap, extruded just enough to catch the light.
  const flapGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-1.25, 0)
    shape.lineTo(1.25, 0)
    shape.lineTo(0, -0.74)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false })
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // hue cycle → holographic sheen
    const hue = (t * 0.12) % 1
    holoA.current?.color.setHSL(hue, 0.62, 0.72)
    holoA.current?.emissive.setHSL((hue + 0.5) % 1, 0.7, 0.28)
    holoB.current?.color.setHSL((hue + 0.33) % 1, 0.6, 0.68)
    holoB.current?.emissive.setHSL((hue + 0.8) % 1, 0.7, 0.24)

    if (flap.current) flap.current.rotation.x = -open * 2.5
    if (body.current) {
      body.current.rotation.y = Math.sin(t * 0.45) * 0.16
      body.current.position.y = -open * 0.5 + Math.sin(t * 0.8) * 0.04
    }

    // Shrink the whole deck to whatever the frustum can actually hold. A fixed
    // spread that fits a 375px phone runs the outer two cards off a 320px one,
    // and the cards' whole job is being legible — better slightly smaller than
    // half off-screen. `fov` is vertical, so the horizontal room depends on the
    // canvas aspect and has to be measured rather than assumed.
    if (deck.current) {
      const cam = camera as THREE.PerspectiveCamera
      const dist = Math.max(0.2, cam.position.z - 1.1)
      const halfW =
        dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * (size.width / size.height)
      const reach = ((shown - 1) / 2) * CARD_SPREAD + CARD_HALF_X
      deck.current.scale.setScalar(THREE.MathUtils.clamp(halfW / reach, 0.45, 1))
    }
  })

  return (
    <group ref={body}>
      {/* envelope back */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[2.5, 1.62, 0.09]} />
        <meshStandardMaterial ref={holoA} roughness={0.22} metalness={0.72} />
      </mesh>
      {/* front pocket */}
      <mesh position={[0, -0.24, 0.06]}>
        <boxGeometry args={[2.5, 1.14, 0.07]} />
        <meshStandardMaterial ref={holoB} roughness={0.26} metalness={0.66} />
      </mesh>
      {/* flap, hinged along the top edge */}
      <group ref={flap} position={[0, 0.81, 0.02]}>
        <mesh geometry={flapGeometry}>
          <meshStandardMaterial
            color={HEX.gulabi}
            roughness={0.34}
            metalness={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* wax seal */}
      <mesh position={[0, 0.16, 0.12]} rotation={[Math.PI / 2, 0, 0]} visible={open < 0.15}>
        <cylinderGeometry args={[0.22, 0.24, 0.08, 22]} />
        <ClayMat color={HEX.marigold} roughness={0.6} metalness={0.24} />
      </mesh>

      <group ref={deck}>
        {vouchers.slice(0, 3).map((voucher, i) => (
          <VoucherCard
            key={voucher.id}
            voucher={voucher}
            brotherName={brotherName}
            index={i}
            total={shown}
            progress={open}
          />
        ))}
      </group>

      <pointLight color={0xffffff} intensity={4} distance={5} decay={2} position={[0, 1, 2]} />
    </group>
  )
}
