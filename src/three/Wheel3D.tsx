/**
 * Wheel3D.tsx — the Shagun Roulette.
 *
 * The face is one canvas texture rather than N textured segment meshes: it keeps
 * the label typography crisp at any wheel size and collapses the whole disc into
 * a single draw call, which matters on the phones this will actually run on.
 *
 * Angle convention: THREE.CanvasTexture renders the canvas un-mirrored, so canvas
 * y-down maps to world y-up. A segment drawn at canvas angle θ therefore lands at
 * world angle −θ. `targetRotation()` below is the only place that has to care.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WheelSlot } from '../lib/payload'
import { ClayMat, HEX } from './clay'

const TIER_FILL = ['#2563EB', '#FFF8F0', '#0D9488', '#FFB703']
const TIER_TEXT = ['#FFFFFF', '#1A1412', '#FFFFFF', '#1A1412']

function useWheelTexture(slots: WheelSlot[]) {
  return useMemo(() => {
    // 2048 gives real pixels to spare even when the wheel fills a phone screen;
    // the crispness win over 1024 is the whole point of this fix.
    const size = 2048
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    const texture = new THREE.CanvasTexture(canvas)
    // No mipmaps + linear sampling: mipmap minification was smearing the labels
    // into an unreadable blur. sRGB + max anisotropy keep the print sharp at the
    // grazing angles the spinning wheel is viewed from.
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 16
    if (!ctx || slots.length === 0) return texture

    const c = size / 2
    const R = c - size * 0.01
    const seg = (Math.PI * 2) / slots.length
    const stroke = size * 0.0045

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      slots.forEach((slot, i) => {
        const start = i * seg
        ctx.beginPath()
        ctx.moveTo(c, c)
        ctx.arc(c, c, R, start, start + seg)
        ctx.closePath()
        ctx.fillStyle = TIER_FILL[slot.tier]
        ctx.fill()

        if (slot.tier === 3) {
          // Make the jackpot wedge glow so the 0.1% slot is visibly the prize.
          const gradient = ctx.createRadialGradient(c, c, R * 0.2, c, c, R)
          gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
          gradient.addColorStop(1, 'rgba(255,77,109,0.4)')
          ctx.fillStyle = gradient
          ctx.fill()
        }

        ctx.strokeStyle = '#2B2523'
        ctx.lineWidth = stroke * 2.2
        ctx.stroke()
      })

      slots.forEach((slot, i) => {
        ctx.save()
        ctx.translate(c, c)
        ctx.rotate(i * seg + seg / 2)
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        const isJackpot = slot.tier === 3
        const fontSize = isJackpot
          ? size * 0.068
          : slot.label.length > 10
            ? size * 0.052
            : size * 0.064
        ctx.font = `900 ${fontSize}px Fredoka, "Arial Black", Nunito, ui-rounded, sans-serif`
        ctx.lineJoin = 'round'

        // Clean subtle outline for light text on dark backgrounds or jackpot
        if (slot.tier === 0 || slot.tier === 2) {
          ctx.lineWidth = fontSize * 0.14
          ctx.strokeStyle = '#0f172a'
          ctx.strokeText(slot.label, R - size * 0.05, 0)
        } else if (isJackpot) {
          ctx.lineWidth = fontSize * 0.14
          ctx.strokeStyle = '#ffffff'
          ctx.strokeText(slot.label, R - size * 0.05, 0)
        }

        ctx.fillStyle = TIER_TEXT[slot.tier]
        ctx.fillText(slot.label, R - size * 0.05, 0)
        ctx.restore()
      })

      // hub cut-out ring
      ctx.beginPath()
      ctx.arc(c, c, R * 0.17, 0, Math.PI * 2)
      ctx.fillStyle = '#FFF8F0'
      ctx.fill()
      ctx.strokeStyle = '#2B2523'
      ctx.lineWidth = stroke * 2
      ctx.stroke()

      texture.needsUpdate = true
    }

    draw()
    // The labels are typeset in Fredoka, a web font that may still be loading on
    // first paint. Bake once now (fallback face) then re-bake when the real font
    // arrives, otherwise the wheel freezes with mismatched, muddy glyphs.
    if (typeof document !== 'undefined' && document.fonts?.load) {
      document.fonts
        .load(`900 ${Math.round(size * 0.064)}px Fredoka`)
        .then(draw)
        .catch(() => {})
    }
    return texture
  }, [slots])
}

/** Where the wheel must stop for `index` to sit under the top pointer. */
function targetRotation(index: number, count: number, turns: number): number {
  const seg = (Math.PI * 2) / count
  return Math.PI / 2 + (index + 0.5) * seg + Math.PI * 2 * turns
}

export interface Wheel3DProps {
  slots: WheelSlot[]
  /** Slot that must win. Predetermined by the link's seed, never by the spin. */
  targetIndex: number
  /** Increment to launch a spin. */
  spinToken: number
  radius?: number
  onSettled?: () => void
  /** Fires each time a peg passes the pointer, for tick haptics/sound. */
  onTick?: () => void
  showLever?: boolean
}

export function Wheel3D({
  slots,
  targetIndex,
  spinToken,
  radius = 1.95,
  onSettled,
  onTick,
  showLever = true,
}: Wheel3DProps) {
  const texture = useWheelTexture(slots)
  const disc = useRef<THREE.Group>(null)
  const lever = useRef<THREE.Group>(null)
  const pointer = useRef<THREE.Group>(null)

  const anim = useRef({
    from: 0,
    to: 0,
    t: 0,
    duration: 0,
    running: false,
    settled: true,
    lastSegment: -1,
  })

  useEffect(() => {
    if (!spinToken || slots.length === 0) return
    const a = anim.current
    const current = disc.current?.rotation.z ?? 0
    // Normalise so the wheel never unwinds backwards to reach its target.
    const base = current % (Math.PI * 2)
    a.from = base
    a.to = targetRotation(targetIndex, slots.length, 5 + (spinToken % 3))
    while (a.to < a.from + Math.PI * 8) a.to += Math.PI * 2
    a.t = 0
    a.duration = 4.6
    a.running = true
    a.settled = false
    a.lastSegment = -1
    if (disc.current) disc.current.rotation.z = base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken])

  useFrame((_, delta) => {
    const a = anim.current
    const step = Math.min(delta, 0.05)

    if (a.running && disc.current) {
      a.t = Math.min(1, a.t + step / a.duration)
      // Quintic ease-out: fast launch, long believable coast to a stop.
      const eased = 1 - Math.pow(1 - a.t, 5)
      const z = a.from + (a.to - a.from) * eased
      disc.current.rotation.z = z

      if (onTick && slots.length) {
        const seg = (Math.PI * 2) / slots.length
        const segment = Math.floor(z / seg)
        if (segment !== a.lastSegment) {
          a.lastSegment = segment
          onTick()
        }
      }

      // Pointer flicks as each peg shoves past it.
      if (pointer.current) {
        const wobble = (1 - a.t) * 0.4
        pointer.current.rotation.z = Math.sin(a.t * 90) * wobble
      }

      if (a.t >= 1) {
        a.running = false
        a.settled = true
        if (pointer.current) pointer.current.rotation.z = 0
        onSettled?.()
      }
    }

    // Lever springs back after being pulled.
    if (lever.current) {
      const pulled = a.running && a.t < 0.16
      const target = pulled ? 0.95 : 0
      lever.current.rotation.x += (target - lever.current.rotation.x) * Math.min(1, step * 12)
    }
  })

  const pegs = useMemo(
    () =>
      slots.map((_, i) => {
        const angle = (i / slots.length) * Math.PI * 2
        return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.13] as [number, number, number]
      }),
    [slots.length, radius],
  )

  return (
    <group>
      {/* back post so the wheel reads as standing on something */}
      <mesh position={[0, -radius - 0.75, -0.35]}>
        <boxGeometry args={[0.5, 1.3, 0.4]} />
        <ClayMat color={HEX.espresso} roughness={0.9} />
      </mesh>
      <mesh position={[0, -radius - 1.4, -0.35]}>
        <boxGeometry args={[2.1, 0.28, 1.1]} />
        <ClayMat color={0x3d3532} roughness={0.9} />
      </mesh>

      <group ref={disc}>
        {/* disc body */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.09]}>
          <cylinderGeometry args={[radius, radius, 0.2, 64]} />
          <ClayMat color={HEX.claydrop} roughness={0.9} metalness={0.03} />
        </mesh>
        {/* printed face — unlit so the labels read at full contrast instead of
            being dimmed into the disc by the studio lights */}
        <mesh position={[0, 0, 0.015]}>
          <circleGeometry args={[radius, 96]} />
          <meshBasicMaterial map={texture} toneMapped={false} transparent />
        </mesh>
        {/* rim */}
        <mesh position={[0, 0, -0.02]}>
          <torusGeometry args={[radius + 0.02, 0.09, 12, 72]} />
          <ClayMat color={HEX.espresso} roughness={0.8} />
        </mesh>
        {pegs.map((position, i) => (
          <mesh key={i} position={position}>
            <sphereGeometry args={[0.075, 12, 10]} />
            <ClayMat color={HEX.puffy} roughness={0.5} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* hub cap, does not spin */}
      <mesh position={[0, 0, 0.16]}>
        <sphereGeometry args={[0.2, 22, 18]} />
        <ClayMat color={HEX.gulabi} roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.12, 28]} />
        <ClayMat color={HEX.marigold} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* pointer */}
      <group ref={pointer} position={[0, radius + 0.24, 0.22]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.17, 0.46, 4]} />
          <ClayMat color={HEX.gulabi} roughness={0.7} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <ClayMat color={HEX.espresso} roughness={0.8} />
        </mesh>
      </group>

      {/* 3D lever the sister actually pulls */}
      {showLever && (
        <group position={[radius + 0.62, -0.35, 0]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.2, 0.5, 20]} />
            <ClayMat color={HEX.espresso} roughness={0.85} />
          </mesh>
          <group ref={lever} position={[0, 0.2, 0]}>
            <mesh position={[0, 0.42, 0]}>
              <cylinderGeometry args={[0.06, 0.07, 0.9, 14]} />
              <ClayMat color={0xd9d3cc} roughness={0.4} metalness={0.35} />
            </mesh>
            <mesh position={[0, 0.94, 0]}>
              <sphereGeometry args={[0.19, 20, 16]} />
              <ClayMat color={HEX.gulabi} roughness={0.55} metalness={0.12} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  )
}
