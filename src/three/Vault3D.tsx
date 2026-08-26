/**
 * Vault3D.tsx — the Shagun Vault the sister has to tap open.
 *
 * Progress drives three simultaneous channels so the crack feels earned: the
 * dial spins, a marigold arc closes around it, and the whole body shakes harder
 * the closer it gets. The reward itself is revealed in the DOM overlay above —
 * gift-card codes need to be legible and copyable, which 3D text is not.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ClayMat, HEX, useLabelTexture } from './clay'
import { Sparkles } from './Burst'

const BODY = { w: 3.1, h: 2.75, d: 1.35 }
const DOOR = { w: 2.66, h: 2.33, d: 0.24 }
const HINGE_X = -DOOR.w / 2

function useRounded(w: number, h: number, d: number, radius = 0.14, segments = 4) {
  return useMemo(() => new RoundedBoxGeometry(w, h, d, segments, radius), [w, h, d, radius, segments])
}

function useEmojiTexture(emoji: string, caption: string) {
  return useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFF8F0'
      ctx.fillRect(0, 0, size, size)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${size * 0.44}px serif`
      ctx.fillText(emoji, size / 2, size * 0.42)
      ctx.fillStyle = '#2B2523'
      ctx.font = `700 ${size * 0.075}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`
      const words = caption.toUpperCase().split(' ')
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
      lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, size / 2, size * 0.76 + i * size * 0.09))
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [emoji, caption])
}

export interface Vault3DProps {
  /** 0 → 1 crack progress. */
  progress: number
  open: boolean
  /** Increment on every tap to kick the shake impulse. */
  tapPulse: number
  label: string
  rewardEmoji: string
  rewardCaption: string
  /** Draws the seal the sister must drop her rakhi onto. */
  sealed?: boolean
}

export function Vault3D({
  progress,
  open,
  tapPulse,
  label,
  rewardEmoji,
  rewardCaption,
  sealed = false,
}: Vault3DProps) {
  const body = useRounded(BODY.w, BODY.h, BODY.d, 0.16)
  const doorGeo = useRounded(DOOR.w, DOOR.h, DOOR.d, 0.12)
  const plate = useRounded(1.5, 0.42, 0.12, 0.08)

  const labelTexture = useLabelTexture(label || 'SHAGUN VAULT')
  const rewardTexture = useEmojiTexture(rewardEmoji, rewardCaption)

  const shell = useRef<THREE.Group>(null)
  const doorPivot = useRef<THREE.Group>(null)
  const dial = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)

  const impulse = useRef(0)
  const doorAngle = useRef(0)

  useEffect(() => {
    if (tapPulse > 0) impulse.current = Math.min(1, impulse.current + 0.55)
  }, [tapPulse])

  // Rebuild the progress arc geometry as it fills. Cheap: ~200 verts.
  const arcGeometry = useMemo(() => {
    const arc = Math.max(0.001, progress) * Math.PI * 2
    return new THREE.TorusGeometry(0.62, 0.055, 8, 44, arc)
  }, [progress])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    // Shake: a floor tied to progress plus a decaying per-tap impulse.
    impulse.current *= 0.88
    const stress = open ? 0 : progress * 0.55 + impulse.current
    if (shell.current) {
      shell.current.position.x = Math.sin(t * 43) * 0.035 * stress
      shell.current.position.y = Math.sin(t * 37 + 1.1) * 0.03 * stress
      shell.current.rotation.z = Math.sin(t * 31) * 0.012 * stress
      const squash = 1 - impulse.current * 0.035
      shell.current.scale.set(1 / squash, squash, 1)
    }

    if (dial.current) {
      // Spins through five full turns across the whole tap sequence.
      dial.current.rotation.z = -progress * Math.PI * 10 - impulse.current * 0.5
    }

    if (ring.current) {
      const material = ring.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.35 + progress * 1.4 + impulse.current
    }

    // Door swing.
    const target = open ? -2.05 : 0
    doorAngle.current += (target - doorAngle.current) * 0.055
    if (doorPivot.current) doorPivot.current.rotation.y = doorAngle.current
  })

  return (
    <group ref={shell}>
      {/* ── carcass ── */}
      <mesh geometry={body}>
        <ClayMat color={0x1f6f68} roughness={0.66} metalness={0.24} />
      </mesh>
      {/* hollow interior */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[DOOR.w - 0.12, DOOR.h - 0.12, BODY.d - 0.3]} />
        <ClayMat color={0x14413d} roughness={0.95} metalness={0.02} side={THREE.BackSide} />
      </mesh>

      {/* reward panel, visible once the door swings clear */}
      <group position={[0, 0.12, 0.18]}>
        <mesh>
          <planeGeometry args={[1.5, 1.5]} />
          <meshStandardMaterial
            map={rewardTexture}
            roughness={0.7}
            emissive={0xfff3e0}
            emissiveIntensity={open ? 0.45 : 0}
          />
        </mesh>
        {open && (
          <>
            <pointLight color={HEX.marigold} intensity={7} distance={4} decay={2} position={[0, 0, 1.1]} />
            <Sparkles count={22} radius={1.3} color={HEX.marigold} size={0.13} />
          </>
        )}
      </group>

      {/* corner bolts on the carcass */}
      {[
        [-1.38, 1.2],
        [1.38, 1.2],
        [-1.38, -1.2],
        [1.38, -1.2],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, BODY.d / 2 - 0.02]}>
          <cylinderGeometry args={[0.11, 0.11, 0.1, 12]} />
          <ClayMat color={HEX.claydrop} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}

      {/* ── door (hinged on the left edge) ── */}
      <group ref={doorPivot} position={[HINGE_X, 0, BODY.d / 2 - 0.02]}>
        <group position={[-HINGE_X, 0, DOOR.d / 2]}>
          <mesh geometry={doorGeo}>
            <ClayMat color={0x2a8b82} roughness={0.6} metalness={0.28} />
          </mesh>

          {/* rivets */}
          {Array.from({ length: 16 }, (_, i) => {
            const side = Math.floor(i / 4)
            const step = (i % 4) / 3
            const inset = 0.16
            const x = DOOR.w / 2 - inset
            const y = DOOR.h / 2 - inset
            const spot: [number, number] =
              side === 0
                ? [-x + step * 2 * x, y]
                : side === 1
                  ? [x, y - step * 2 * y]
                  : side === 2
                    ? [x - step * 2 * x, -y]
                    : [-x, -y + step * 2 * y]
            return (
              <mesh key={i} position={[spot[0], spot[1], DOOR.d / 2]}>
                <sphereGeometry args={[0.055, 10, 8]} />
                <ClayMat color={HEX.claydrop} roughness={0.45} metalness={0.45} />
              </mesh>
            )
          })}

          {/* nameplate */}
          <mesh geometry={plate} position={[0, DOOR.h / 2 - 0.42, DOOR.d / 2 + 0.02]}>
            <meshStandardMaterial map={labelTexture} roughness={0.72} metalness={0.1} />
          </mesh>

          {/* progress arc */}
          <mesh
            ref={ring}
            geometry={arcGeometry}
            position={[0, -0.16, DOOR.d / 2 + 0.06]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <meshStandardMaterial
              color={progress >= 1 ? HEX.pista : HEX.marigold}
              emissive={progress >= 1 ? HEX.pista : HEX.marigold}
              emissiveIntensity={0.6}
              roughness={0.5}
              metalness={0.1}
              toneMapped={false}
            />
          </mesh>
          {/* arc track */}
          <mesh position={[0, -0.16, DOOR.d / 2 + 0.045]}>
            <torusGeometry args={[0.62, 0.05, 8, 44]} />
            <ClayMat color={0x123f3b} roughness={0.9} />
          </mesh>

          {/* combination dial */}
          <group ref={dial} position={[0, -0.16, DOOR.d / 2 + 0.08]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.44, 0.46, 0.16, 32]} />
              <ClayMat color={HEX.claydrop} roughness={0.42} metalness={0.44} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0, 0, 0.12]} rotation={[0, 0, (i * Math.PI) / 3]}>
                <boxGeometry args={[1.16, 0.11, 0.1]} />
                <ClayMat color={HEX.puffy} roughness={0.4} metalness={0.35} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.19]}>
              <sphereGeometry args={[0.16, 18, 14]} />
              <ClayMat color={HEX.gulabi} roughness={0.55} metalness={0.15} />
            </mesh>
          </group>

          {/* wax seal that must be broken with a rakhi */}
          {sealed && (
            <group position={[DOOR.w / 2 - 0.34, -DOOR.h / 2 + 0.4, DOOR.d / 2 + 0.06]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.28, 0.3, 0.1, 24]} />
                <ClayMat color={HEX.gulabiDeep} roughness={0.75} metalness={0.06} />
              </mesh>
              <mesh position={[0, 0, 0.07]}>
                <torusGeometry args={[0.17, 0.045, 8, 20]} />
                <ClayMat color={HEX.marigold} roughness={0.6} metalness={0.2} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  )
}
