/**
 * Thali3D.tsx — the virtual puja thali: brass plate, orbiting diya, roli and
 * chawal mounds, and the selected mithai.
 *
 * The diya's position is driven from outside via `diyaAngle` so the brother's
 * circular drag gesture literally moves the flame around the plate — the
 * aarti motion is the interaction, not a canned animation.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MithaiId, RakhiSpec, ThaliSpec } from '../lib/payload'
import { ClayMat, HEX } from './clay'
import { Rakhi3D } from './Rakhi3D'

const PLATE_R = 2.2
const SURFACE = 0.07
export const DIYA_ORBIT = 1.2

/* ── plate ───────────────────────────────────────────────────────────────── */

function Plate() {
  const petals = useMemo(
    () =>
      [0.25, 0.85, 1.45, 2.05, 2.65, 3.25, 3.85, 4.45, 5.05, 5.65, 6.25].map((angle, i) => {
        const r = 1.82 + (i % 2) * 0.08
        return {
          position: [Math.cos(angle) * r, SURFACE + 0.005, Math.sin(angle) * r] as [number, number, number],
          rotation: angle,
          color: i % 3 === 0 ? HEX.marigold : i % 3 === 1 ? HEX.gulabi : 0xfffae6,
        }
      }),
    [],
  )

  const innerSpokes = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i * Math.PI) / 4
        return {
          position: [Math.cos(angle) * 1.38, SURFACE + 0.002, Math.sin(angle) * 1.38] as [number, number, number],
          rotation: angle,
        }
      }),
    [],
  )

  return (
    <group>
      {/* Base warm polished brass plate */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[PLATE_R, PLATE_R * 0.92, 0.14, 64]} />
        <meshStandardMaterial color={0xcaa048} roughness={0.42} metalness={0.45} />
      </mesh>
      {/* Raised rolled brass rim */}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLATE_R, 0.09, 16, 64]} />
        <meshStandardMaterial color={HEX.goldLight} roughness={0.32} metalness={0.55} />
      </mesh>
      {/* Outer engraved concentric ring */}
      <mesh position={[0, SURFACE + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.96, 2.02, 64]} />
        <meshStandardMaterial color={HEX.marigoldDeep} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Inner engraved concentric ring */}
      <mesh position={[0, SURFACE + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.41, 64]} />
        <meshStandardMaterial color={HEX.marigoldDeep} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Subtle traditional engravings along inner ring */}
      {innerSpokes.map((spoke, i) => (
        <mesh
          key={`spoke-${i}`}
          position={spoke.position}
          rotation={[0, spoke.rotation, 0]}
          scale={[0.08, 0.005, 0.04]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={HEX.marigoldDeep} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* Scattered flower petals on outer rim */}
      {petals.map((petal, i) => (
        <mesh
          key={`petal-${i}`}
          position={petal.position}
          rotation={[0, petal.rotation, 0.08]}
          scale={[0.15, 0.04, 0.09]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <ClayMat color={petal.color} roughness={0.92} metalness={0.02} />
        </mesh>
      ))}
    </group>
  )
}

/* ── diya ────────────────────────────────────────────────────────────────── */

export function Diya({
  angle,
  lit = true,
  intensity = 1,
  highlight = false,
}: {
  angle: number
  lit?: boolean
  intensity?: number
  highlight?: boolean
}) {
  const flame = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const halo = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const flicker = 1 + Math.sin(t * 11) * 0.07 + Math.sin(t * 6.3) * 0.05
    if (flame.current) {
      flame.current.scale.set(flicker * 0.95, flicker, flicker * 0.95)
      flame.current.rotation.z = Math.sin(t * 4.1) * 0.09
    }
    if (light.current) light.current.intensity = (lit ? 2.2 : 0) * intensity * flicker
    if (halo.current) {
      const s = (highlight ? 1.25 : 1) * (1 + Math.sin(t * 3) * 0.06)
      halo.current.scale.set(s, s, s)
    }
  })

  const x = Math.cos(angle) * DIYA_ORBIT
  const z = Math.sin(angle) * DIYA_ORBIT

  return (
    <group position={[x, SURFACE, z]}>
      {/* Terracotta clay bowl */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.34, 0.2, 0.22, 28]} />
        <ClayMat color={0xb84a1e} roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.05, 10, 28]} />
        <ClayMat color={0x993a12} roughness={0.92} metalness={0.02} />
      </mesh>
      {/* Pinched terracotta spout */}
      <mesh position={[0, 0.2, 0.26]} rotation={[0.4, 0, 0]} scale={[0.18, 0.1, 0.18]}>
        <sphereGeometry args={[1, 14, 10]} />
        <ClayMat color={0xb84a1e} roughness={0.92} metalness={0.02} />
      </mesh>
      {/* Glistening golden ghee */}
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.29, 28]} />
        <meshStandardMaterial color={0xffdf7a} roughness={0.2} metalness={0.15} />
      </mesh>
      {/* Cotton wick */}
      <mesh position={[0, 0.24, 0.18]} rotation={[0.45, 0, 0]}>
        <capsuleGeometry args={[0.025, 0.13, 3, 6]} />
        <ClayMat color={0x2b211b} roughness={0.95} />
      </mesh>

      {lit && (
        <group ref={flame} position={[0, 0.3, 0.18]}>
          {/* Outer glowing saffron flame */}
          <mesh position={[0, 0.16, 0]}>
            <coneGeometry args={[0.12, 0.44, 20]} />
            <meshStandardMaterial
              color={0xff6b00}
              emissive={0xff8c00}
              emissiveIntensity={2.5}
              roughness={0.4}
              transparent
              opacity={0.92}
              toneMapped={false}
            />
          </mesh>
          {/* Inner hot white-yellow core */}
          <mesh position={[0, 0.11, 0]}>
            <coneGeometry args={[0.06, 0.25, 14]} />
            <meshStandardMaterial
              color={0xfffae0}
              emissive={0xffffff}
              emissiveIntensity={3.5}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      <pointLight
        ref={light}
        color={0xff9520}
        intensity={lit ? 2.2 : 0}
        distance={3.2}
        decay={2}
        position={[0, 0.45, 0.18]}
      />

      {/* Grab affordance ring */}
      {highlight && (
        <mesh ref={halo} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.55, 32]} />
          <meshBasicMaterial color={HEX.marigold} transparent opacity={0.75} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

/* ── katoris for roli & chawal ───────────────────────────────────────────── */

function Katori({
  position,
  type,
}: {
  position: [number, number, number]
  type: 'roli' | 'chawal'
}) {
  const riceGrains = useMemo(
    () =>
      [0.2, 0.9, 1.6, 2.3, 3.0, 3.7, 4.4, 5.1, 5.8].map((angle, i) => {
        const r = 0.14 * (0.35 + (i % 3) * 0.25)
        return {
          pos: [Math.cos(angle) * r, 0.13 + (i % 2) * 0.03, Math.sin(angle) * r] as [number, number, number],
          rot: [0.1 * (i % 3), angle + 0.5, 0.3 * (i % 2)] as [number, number, number],
          isSaffron: i % 4 === 0,
        }
      }),
    [],
  )

  const roliSpecks = useMemo(
    () =>
      [0.4, 1.3, 2.2, 3.1, 4.0, 4.9, 5.8].map((angle, i) => {
        const r = 0.12 * (0.4 + (i % 3) * 0.2)
        return [Math.cos(angle) * r, 0.14 + (i % 2) * 0.02, Math.sin(angle) * r] as [number, number, number]
      }),
    [],
  )

  return (
    <group position={position}>
      {/* Miniature embossed brass katori cup */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.26, 0.18, 0.09, 28]} />
        <meshStandardMaterial color={0xdca434} roughness={0.35} metalness={0.52} />
      </mesh>
      {/* Golden rim */}
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.022, 10, 28]} />
        <meshStandardMaterial color={HEX.goldLight} roughness={0.3} metalness={0.6} />
      </mesh>

      {type === 'roli' ? (
        /* Sacred Kumkum / Roli crimson mound */
        <group>
          <mesh position={[0, 0.07, 0]} scale={[1, 0.65, 1]}>
            <sphereGeometry args={[0.23, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <ClayMat color={0xc71024} roughness={0.98} metalness={0.01} />
          </mesh>
          {roliSpecks.map((p, i) => (
            <mesh key={`roli-${i}`} position={p} scale={[0.03, 0.02, 0.03]}>
              <sphereGeometry args={[1, 8, 6]} />
              <ClayMat color={0xe62035} roughness={0.98} />
            </mesh>
          ))}
        </group>
      ) : (
        /* Sacred Akshat / Chawal pristine rice mound */
        <group>
          <mesh position={[0, 0.07, 0]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.23, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <ClayMat color={0xfffbf2} roughness={0.95} metalness={0.01} />
          </mesh>
          {riceGrains.map((g, i) => (
            <mesh key={`rice-${i}`} position={g.pos} rotation={g.rot}>
              <capsuleGeometry args={[0.018, 0.055, 3, 6]} />
              <ClayMat color={g.isSaffron ? 0xffdf70 : 0xffffff} roughness={0.88} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/* ── mithai ──────────────────────────────────────────────────────────────── */

function KajuBarfi({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* First diamond piece */}
      <group position={[-0.08, 0, 0.05]} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, 0.06, 0]} scale={[1, 0.35, 1]}>
          <boxGeometry args={[0.38, 0.22, 0.38]} />
          <ClayMat color={0xf2e6d2} roughness={0.88} metalness={0.02} />
        </mesh>
        {/* Crisp glistening silver varak leaf */}
        <mesh position={[0, 0.102, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.35, 0.35]} />
          <meshStandardMaterial
            color={0xf7f9fc}
            roughness={0.14}
            metalness={0.9}
            envMapIntensity={1.5}
          />
        </mesh>
      </group>

      {/* Second overlapping piece */}
      <group position={[0.1, 0.04, -0.06]} rotation={[0, Math.PI / 4 + 0.25, 0]}>
        <mesh position={[0, 0.06, 0]} scale={[1, 0.35, 1]}>
          <boxGeometry args={[0.36, 0.22, 0.36]} />
          <ClayMat color={0xf2e6d2} roughness={0.88} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.102, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.33, 0.33]} />
          <meshStandardMaterial
            color={0xf7f9fc}
            roughness={0.14}
            metalness={0.9}
            envMapIntensity={1.5}
          />
        </mesh>
      </group>
    </group>
  )
}

function Ladoo({ position }: { position: [number, number, number] }) {
  const bumps = useMemo(
    () =>
      [0.3, 1.1, 1.9, 2.7, 3.5, 4.3, 5.1, 5.9].map((angle, i) => {
        const tilt = 0.2 + (i % 3) * 0.35
        return [
          Math.cos(angle) * 0.19 * Math.cos(tilt),
          0.22 + Math.sin(tilt) * 0.12,
          Math.sin(angle) * 0.19 * Math.cos(tilt),
        ] as [number, number, number]
      }),
    [],
  )

  const pistachios = useMemo(
    () =>
      [
        { pos: [0.03, 0.38, 0.04] as [number, number, number], rot: [0.3, 0.8, 0.2] as [number, number, number], col: 0x2e7d32 },
        { pos: [-0.05, 0.36, -0.03] as [number, number, number], rot: [0.5, 1.2, 0] as [number, number, number], col: 0x43a047 },
        { pos: [0.06, 0.35, -0.05] as [number, number, number], rot: [-0.2, 0.4, 0.6] as [number, number, number], col: 0xfffae0 },
      ],
    [],
  )

  return (
    <group position={position}>
      {/* Rich golden-saffron motichoor ladoo base */}
      <mesh position={[0, 0.21, 0]}>
        <sphereGeometry args={[0.22, 24, 18]} />
        <ClayMat color={0xf2930d} roughness={0.95} metalness={0.02} />
      </mesh>
      {/* Boondi texture bumps */}
      {bumps.map((p, i) => (
        <mesh key={`bump-${i}`} position={p}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <ClayMat color={i % 2 === 0 ? 0xffaa17 : 0xe67e00} roughness={0.95} metalness={0.02} />
        </mesh>
      ))}
      {/* Pistachio & almond slivers garnish on top */}
      {pistachios.map((p, i) => (
        <mesh key={`pista-${i}`} position={p.pos} rotation={p.rot} scale={[0.04, 0.015, 0.06]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={p.col} roughness={0.6} />
        </mesh>
      ))}
      {/* Silver foil speck on top */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.06, 0.06, 0.06]}>
        <circleGeometry args={[1, 8]} />
        <meshStandardMaterial color={0xf4f6fa} roughness={0.2} metalness={0.85} />
      </mesh>
    </group>
  )
}

function Rasbari({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Glistening golden sugar syrup pool */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.32, 0.3, 0.05, 28]} />
        <meshStandardMaterial color={0xb86018} roughness={0.12} metalness={0.12} transparent opacity={0.88} />
      </mesh>
      {/* First juicy soft rasbari */}
      <mesh position={[-0.08, 0.16, 0]} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[0.17, 24, 18]} />
        <meshStandardMaterial color={0xf7f0e4} roughness={0.3} metalness={0.05} />
      </mesh>
      {/* Second soft rasbari */}
      <mesh position={[0.12, 0.15, 0.05]} scale={[1, 0.88, 1]}>
        <sphereGeometry args={[0.15, 24, 18]} />
        <meshStandardMaterial color={0xfff9ee} roughness={0.3} metalness={0.05} />
      </mesh>
      {/* Sliced pistachio garnish */}
      <mesh position={[-0.07, 0.32, 0.02]} rotation={[0.3, 0.5, 0]} scale={[0.035, 0.012, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={0x388e3c} roughness={0.5} />
      </mesh>
      <mesh position={[0.11, 0.29, 0.07]} rotation={[-0.2, 0.8, 0.3]} scale={[0.035, 0.012, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={0xfffae6} roughness={0.5} />
      </mesh>
    </group>
  )
}

const MITHAI_SLOTS: [number, number, number][] = [
  [0.98, SURFACE, 0.55],
  [1.32, SURFACE, -0.32],
  [0.48, SURFACE, -1.05],
]

function MithaiItem({ id, position }: { id: MithaiId; position: [number, number, number] }) {
  if (id === 'kaju') return <KajuBarfi position={position} />
  if (id === 'ladoo') return <Ladoo position={position} />
  return <Rasbari position={position} />
}

/* ── the thali ───────────────────────────────────────────────────────────── */

export interface Thali3DProps {
  thali: ThaliSpec
  rakhi?: RakhiSpec | null
  /** Radians around the plate centre — drive this from the aarti drag. */
  diyaAngle?: number
  diyaLit?: boolean
  /** Pulses a ring under the diya to advertise the gesture. */
  highlightDiya?: boolean
  /** Hides the rakhi once it has been lifted off the plate to be tied. */
  showRakhi?: boolean
  scale?: number
}

export function Thali3D({
  thali,
  rakhi,
  diyaAngle = -Math.PI / 2,
  diyaLit = true,
  highlightDiya = false,
  showRakhi = true,
  scale = 1,
}: Thali3DProps) {
  return (
    <group scale={scale}>
      <Plate />

      {thali.diya && (
        <Diya angle={diyaAngle} lit={diyaLit} highlight={highlightDiya} />
      )}

      {thali.roli && (
        <>
          <Katori position={[-0.68, SURFACE, 0.88]} type="roli" />
          <Katori position={[-0.02, SURFACE, 1.15]} type="chawal" />
        </>
      )}

      {thali.mithai.map((id, i) => (
        <MithaiItem key={`${id}-${i}`} id={id} position={MITHAI_SLOTS[i] ?? MITHAI_SLOTS[0]} />
      ))}

      {showRakhi && rakhi && (
        <group position={[-0.72, SURFACE + 0.05, -0.62]} rotation={[-Math.PI / 2, 0, 0.35]}>
          <Rakhi3D spec={rakhi} scale={0.54} showTails />
        </group>
      )}
    </group>
  )
}
