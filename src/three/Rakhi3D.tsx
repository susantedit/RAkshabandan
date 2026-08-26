/**
 * Rakhi3D.tsx — the parametric rakhi.
 *
 * Built procedurally rather than loaded as a GLTF so that every combination of
 * thread × gem × monogram exists without shipping a single binary asset. That
 * matters here: the whole app has to boot instantly from a pasted link.
 *
 * Local axes: the rakhi lies in the XY plane facing +Z, so it reads face-on to
 * the camera by default and still looks right when a Turntable spins it.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { RakhiSpec } from '../lib/payload'
import {
  ClayMat,
  GEM_LOOK,
  HEX,
  THREAD_LOOK,
  useCoinTexture,
  useMonogramTexture,
} from './clay'

/* ── geometry builders ───────────────────────────────────────────────────── */

/** A single strand spiralling around the wristband circle — three make a braid. */
function useBraidGeometry(radius: number, wobble: number, turns: number, phase: number, tube: number) {
  return useMemo(() => {
    const points: THREE.Vector3[] = []
    const steps = 200
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2
      const twist = angle * turns + phase
      const r = radius + Math.cos(twist) * wobble
      points.push(
        new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, Math.sin(twist) * wobble),
      )
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)
    return new THREE.TubeGeometry(curve, 220, tube, 7, true)
  }, [radius, wobble, turns, phase, tube])
}

/** One dangling thread tail. Returns the curve too, for placing beads on it. */
function useTail(dir: 1 | -1) {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(dir * 0.82, -0.42, 0),
      new THREE.Vector3(dir * 1.28, -0.72, 0.12),
      new THREE.Vector3(dir * 1.52, -1.24, -0.06),
      new THREE.Vector3(dir * 1.74, -1.78, 0.06),
    ])
    return { curve, geometry: new THREE.TubeGeometry(curve, 48, 0.05, 6, false) }
  }, [dir])
}

/* ── sub-assemblies ──────────────────────────────────────────────────────── */

function Bead({
  position,
  size,
  color,
  faceted,
  look,
}: {
  position: THREE.Vector3 | [number, number, number]
  size: number
  color: number
  faceted: boolean
  look: (typeof THREAD_LOOK)[keyof typeof THREAD_LOOK]
}) {
  return (
    <mesh position={position as unknown as THREE.Vector3}>
      {faceted ? (
        <icosahedronGeometry args={[size, 0]} />
      ) : (
        <sphereGeometry args={[size, 18, 14]} />
      )}
      <ClayMat
        color={color}
        roughness={look.roughness}
        metalness={look.metalness}
        emissive={look.emissive}
        emissiveIntensity={look.emissiveIntensity * 0.6}
        transparent={look.transparent}
        opacity={look.opacity}
      />
    </mesh>
  )
}

function Tassel({ dir, color, look }: { dir: 1 | -1; color: number; look: (typeof THREAD_LOOK)[keyof typeof THREAD_LOOK] }) {
  const strands = useMemo(() => [-0.055, -0.018, 0.018, 0.055], [])
  return (
    <group position={[dir * 1.74, -1.82, 0.06]}>
      <mesh>
        <sphereGeometry args={[0.1, 16, 12]} />
        <ClayMat color={look.bead} roughness={0.7} metalness={look.metalness} />
      </mesh>
      {strands.map((offset, i) => (
        <mesh key={i} position={[offset, -0.2, offset * 0.7]} rotation={[0, 0, offset * 2.4]}>
          <capsuleGeometry args={[0.022, 0.28, 3, 6]} />
          <ClayMat
            color={color}
            roughness={look.roughness}
            metalness={look.metalness}
            emissive={look.emissive}
            emissiveIntensity={look.emissiveIntensity * 0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

/** The petal collar that sits behind every centrepiece. */
function PetalRing({ count = 12, radius = 0.66, color }: { count?: number; radius?: number; color: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2
        return { angle, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
      }),
    [count, radius],
  )
  return (
    <group position={[0, 0, -0.02]}>
      {petals.map((petal, i) => (
        <mesh
          key={i}
          position={[petal.x, petal.y, 0]}
          rotation={[0, 0, petal.angle]}
          scale={[0.27, 0.15, 0.11]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <ClayMat color={color} roughness={0.86} metalness={0.04} />
        </mesh>
      ))}
    </group>
  )
}

function MandalaGem({ look }: { look: (typeof GEM_LOOK)['mandala'] }) {
  const inner = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return [Math.cos(angle) * 0.27, Math.sin(angle) * 0.27, 0.14] as [number, number, number]
      }),
    [],
  )
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.46, 0.48, 0.14, 40]} />
        <ClayMat color={look.core} roughness={look.roughness} metalness={look.metalness} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.33, 0.35, 0.1, 32]} />
        <ClayMat color={look.accent} roughness={0.84} metalness={0.04} />
      </mesh>
      {inner.map((position, i) => (
        <mesh key={i} position={position} scale={[0.09, 0.06, 0.05]}>
          <sphereGeometry args={[1, 12, 8]} />
          <ClayMat color={HEX.cream} roughness={0.8} metalness={0.03} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.22]}>
        <sphereGeometry args={[0.12, 20, 16]} />
        <ClayMat color={HEX.marigoldDeep} roughness={0.6} metalness={0.12} />
      </mesh>
    </group>
  )
}

function RubyGem({ look }: { look: (typeof GEM_LOOK)['ruby'] }) {
  const glint = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (glint.current) {
      glint.current.rotation.y = clock.elapsedTime * 0.9
      glint.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.18
    }
  })
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
        <cylinderGeometry args={[0.44, 0.46, 0.12, 36]} />
        <ClayMat color={HEX.gold} roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh ref={glint} position={[0, 0, 0.2]}>
        <octahedronGeometry args={[0.3, 0]} />
        <ClayMat
          color={look.core}
          roughness={look.roughness}
          metalness={look.metalness}
          emissive={look.emissive}
          emissiveIntensity={look.emissiveIntensity}
        />
      </mesh>
      <pointLight color={look.emissive} intensity={2.4} distance={1.8} decay={2} position={[0, 0, 0.45]} />
    </group>
  )
}

function CoinGem() {
  const texture = useCoinTexture()
  const look = GEM_LOOK.coin
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.46, 0.46, 0.16, 44]} />
        <ClayMat color={look.core} roughness={look.roughness} metalness={look.metalness} />
      </mesh>
      <mesh position={[0, 0, 0.185]}>
        <circleGeometry args={[0.455, 44]} />
        <meshStandardMaterial map={texture} roughness={0.42} metalness={0.35} />
      </mesh>
    </group>
  )
}

function MonogramGem({ letter }: { letter: string }) {
  const texture = useMonogramTexture(letter)
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.09]}>
        <cylinderGeometry args={[0.47, 0.47, 0.15, 40]} />
        <ClayMat color={HEX.gulabi} roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, 0.175]}>
        <circleGeometry args={[0.42, 40]} />
        <meshStandardMaterial map={texture} roughness={0.65} metalness={0.04} />
      </mesh>
    </group>
  )
}

/* ── the rakhi ───────────────────────────────────────────────────────────── */

export interface Rakhi3DProps {
  spec: RakhiSpec
  scale?: number
  showTails?: boolean
  /** Slow self-rotation on the Z axis, independent of any Turntable. */
  idleSpin?: number
}

export function Rakhi3D({ spec, scale = 0.72, showTails = true, idleSpin = 0 }: Rakhi3DProps) {
  const look = THREAD_LOOK[spec.thread]
  const gemLook = GEM_LOOK[spec.gem]
  const root = useRef<THREE.Group>(null)

  const strandA = useBraidGeometry(0.92, 0.062, 9, 0, 0.045)
  const strandB = useBraidGeometry(0.92, 0.062, 9, (Math.PI * 2) / 3, 0.045)
  const strandC = useBraidGeometry(0.92, 0.062, 9, (Math.PI * 4) / 3, 0.045)

  const left = useTail(-1)
  const right = useTail(1)

  const tailBeads = useMemo(() => {
    const spots: { position: THREE.Vector3; size: number }[] = []
    for (const tail of [left, right]) {
      for (const t of [0.3, 0.58, 0.84]) {
        spots.push({ position: tail.curve.getPointAt(t), size: 0.085 })
      }
    }
    return spots
  }, [left, right])

  useFrame((_, delta) => {
    if (idleSpin && root.current) root.current.rotation.z += idleSpin * delta
  })

  const braidMaterialProps = {
    roughness: look.roughness,
    metalness: look.metalness,
    emissive: look.emissive,
    emissiveIntensity: look.emissiveIntensity,
    transparent: look.transparent,
    opacity: look.opacity,
  }

  return (
    <group ref={root} scale={scale}>
      {/* wristband braid — three interleaved strands */}
      <mesh geometry={strandA}>
        <ClayMat color={look.cord} {...braidMaterialProps} />
      </mesh>
      <mesh geometry={strandB}>
        <ClayMat color={look.cordAlt} {...braidMaterialProps} />
      </mesh>
      <mesh geometry={strandC}>
        <ClayMat color={look.cord} {...braidMaterialProps} />
      </mesh>

      {/* beads spaced around the band */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2 + 0.15
        return (
          <Bead
            key={i}
            position={[Math.cos(angle) * 0.92, Math.sin(angle) * 0.92, 0]}
            size={0.075}
            color={look.bead}
            faceted={look.faceted}
            look={look}
          />
        )
      })}

      {/* tails, beads and tassels */}
      {showTails && (
        <>
          <mesh geometry={left.geometry}>
            <ClayMat color={look.cord} {...braidMaterialProps} />
          </mesh>
          <mesh geometry={right.geometry}>
            <ClayMat color={look.cordAlt} {...braidMaterialProps} />
          </mesh>
          {tailBeads.map((bead, i) => (
            <Bead
              key={i}
              position={bead.position}
              size={bead.size}
              color={look.bead}
              faceted={look.faceted}
              look={look}
            />
          ))}
          <Tassel dir={-1} color={look.cord} look={look} />
          <Tassel dir={1} color={look.cordAlt} look={look} />
        </>
      )}

      {/* centrepiece */}
      <PetalRing color={spec.gem === 'mandala' ? gemLook.accent : look.ring} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.56, 0.58, 0.12, 40]} />
        <ClayMat color={HEX.cream} roughness={0.88} metalness={0.03} />
      </mesh>

      {spec.gem === 'mandala' && <MandalaGem look={GEM_LOOK.mandala} />}
      {spec.gem === 'ruby' && <RubyGem look={GEM_LOOK.ruby} />}
      {spec.gem === 'coin' && <CoinGem />}
      {spec.gem === 'monogram' && <MonogramGem letter={spec.monogram} />}

      {look.glow !== null && (
        <pointLight color={look.glow} intensity={3.2} distance={3} decay={2} position={[0, 0, 0.7]} />
      )}
    </group>
  )
}
