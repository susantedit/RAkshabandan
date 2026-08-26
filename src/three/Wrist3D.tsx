/**
 * Wrist3D.tsx — the brother's forearm, and the rakhi being tied onto it.
 *
 * Two things here are deliberate, because the obvious version of each read
 * wrong on a phone:
 *
 * 1. **The arm is not a tube.** A constant-radius cylinder with a blob stuck on
 *    the end looks like plumbing. So the forearm is a lathed profile that swells
 *    at the elbow and pinches at the wrist, and the hand is a flattened palm
 *    with four fingers of *different* lengths carrying a relaxed curl. The curl
 *    matters most — straight parallel fingers are what made it read as a pipe.
 *
 * 2. **Nothing is pre-tied.** At `tie = 0` there is no band on the wrist at all;
 *    the rakhi hovers loose in front of the hand with its two threads dangling.
 *    As `tie` climbs the rakhi settles onto the forearm, the thread *winds* its
 *    way around (a tube revealed progressively via `setDrawRange`, so you watch
 *    it travel rather than watching a finished ring appear), a knot cinches
 *    underneath, and only then do the threads uncoil and fall straight.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { RakhiSpec } from '../lib/payload'
import { ClayMat, HEX, THREAD_LOOK, type ThreadLook } from './clay'
import { Rakhi3D } from './Rakhi3D'

const SKIN = 0xe8b48c
const SKIN_SHADE = 0xd79b73

/** Where along +X the forearm hands over to the palm. */
const WRIST_X = 0.42
/** Where the rakhi ends up — a little up the forearm from the wrist crease. */
const BAND_X = 0.02
/** Forearm radius at `BAND_X`, read off the profile below. */
const BAND_R = 0.325

/**
 * Forearm silhouette, as `[radius, distance from the wrist]`. Lathed rather than
 * extruded so the muscle belly and the wrist pinch are real geometry — that
 * single change is most of the difference between "arm" and "pipe".
 */
const FOREARM_PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.145, 0.0],
  [0.23, 0.035],
  [0.285, 0.11],
  [0.3, 0.24],
  [0.325, 0.4],
  [0.352, 0.62],
  [0.39, 0.95],
  [0.428, 1.35],
  [0.452, 1.75],
  [0.462, 2.1],
  [0.45, 2.5],
]
const FOREARM_LEN = 2.5

/**
 * Fingers, thumb-side first. The staggered `x` traces the knuckle arc and the
 * lengths are all different on purpose: four identical stubs is the other half
 * of the pipe problem.
 */
const FINGERS = [
  { z: -0.285, x: 1.15, l1: 0.26, l2: 0.2, r: 0.07, splay: 0.22, curl: 0.15 },
  { z: -0.095, x: 1.2, l1: 0.3, l2: 0.23, r: 0.075, splay: 0.07, curl: 0.1 },
  { z: 0.095, x: 1.17, l1: 0.27, l2: 0.21, r: 0.07, splay: -0.09, curl: 0.17 },
  { z: 0.285, x: 1.06, l1: 0.21, l2: 0.16, r: 0.061, splay: -0.26, curl: 0.26 },
]

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/* ── the winding thread ───────────────────────────────────────────────────── */

/** Helix around the arm axis: one clean turn, so the two ends meet at the knot. */
class WrapCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private sweep: number,
    private drift: number,
    private start: number,
  ) {
    super()
  }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = this.start + t * this.sweep
    return target.set(
      -this.drift / 2 + t * this.drift,
      this.radius * Math.cos(a),
      this.radius * Math.sin(a),
    )
  }
}

const WRAP_TUBULAR = 240
const WRAP_RADIAL = 8
/** Two turns, so you actually watch it go round rather than catching one pass. */
const WRAP_TURNS = 2
/** How far the thread travels along the arm across those turns. */
const WRAP_DRIFT = 0.3
/**
 * Cord thickness, and how far its centre line sits off the arm axis. Both are
 * deliberately chunky: at a realistic thread gauge the only part of the wrap that
 * clears the forearm silhouette is a ~10px sliver, which reads as nothing at all
 * on a phone. This is a clay toy, so the cord gets to be rope.
 *
 * At this gauge the two turns touch and the band reads as one solid cuff rather
 * than as separated coils. That was tried the other way — 0.058 with more drift,
 * so the turns sit apart — and at the size the wrist is actually drawn (~55px
 * across) the gap is indistinguishable, while the thinner cord costs real
 * visibility during the winding itself, which is the part worth watching.
 */
const WRAP_CORD = 0.072
const WRAP_R = BAND_R + 0.062
/**
 * Where the thread starts (and, two turns later, ends) around the arm, as an
 * angle with 0 = top of the wrist and +π/2 = the side facing the camera.
 *
 * This is chosen for *visibility*, not tradition. From a side-on camera only the
 * near face and the two silhouette edges of the arm can be seen at all, and the
 * decorative disc already covers roughly a ∈ [0, 1.2]. Starting low on the near
 * side means the last thing you watch is the thread coming down the near side
 * straight into the knot — so the cinch reads as the consequence of the winding
 * rather than as a separate event.
 */
const WRAP_START = 2.6
/** Radius the knot sits at, and the angle it shares with the thread's two ends. */
const KNOT_R = BAND_R + 0.075
const KNOT_Y = KNOT_R * Math.cos(WRAP_START)
const KNOT_Z = KNOT_R * Math.sin(WRAP_START)

/* ── a dangling thread ────────────────────────────────────────────────────── */

const TAIL_SEGMENTS = 6
const TAIL_LEN = 0.125

/**
 * One of the rakhi's two threads, as a short articulated chain. Posed per frame
 * instead of rebuilt, so it can coil while the rakhi is loose in the air and
 * fall almost straight once the knot is pulled tight.
 */
function Tail({ dir, look, tie }: { dir: 1 | -1; look: ThreadLook; tie: number }) {
  const joints = useRef<(THREE.Group | null)[]>([])
  // The two threads are never cut to the same length in real life, and matching
  // them here made the pair read as a set of legs with little brass shoes.
  const seg = dir === 1 ? TAIL_LEN : TAIL_LEN * 0.84

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const settled = smooth(0.62, 1, tie)
    // Loose: the thread has some slack and drifts. Tied: it hangs almost
    // straight, with a small sway. Keep the loose curl gentle — wound tighter
    // than this it stops reading as thread and starts reading as bent wire.
    const curl = THREE.MathUtils.lerp(0.19, 0.085, settled)
    const sway = THREE.MathUtils.lerp(0.06, 0.03, settled)
    for (let i = 0; i < TAIL_SEGMENTS; i++) {
      const joint = joints.current[i]
      if (!joint) continue
      const depth = (i + 1) / TAIL_SEGMENTS
      // Both threads bow the *same* way. Mirroring the curl per thread made them
      // arc back toward each other and close into a ring — which is exactly the
      // pre-tied-band silhouette this component exists to avoid.
      joint.rotation.z = curl * depth + Math.sin(t * 1.5 + i * 0.62 + dir) * sway * depth
    }
  })

  const cord = (
    <ClayMat
      color={look.cord}
      roughness={look.roughness}
      metalness={look.metalness}
      emissive={look.emissive}
      emissiveIntensity={look.emissiveIntensity}
      transparent={look.transparent}
      opacity={look.opacity}
    />
  )

  const link = (i: number): JSX.Element => (
    <group
      key={i}
      ref={(el) => {
        joints.current[i] = el
      }}
      position={i === 0 ? [0, 0, 0] : [seg, 0, 0]}
    >
      <mesh position={[seg / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <capsuleGeometry args={[0.042 - i * 0.004, seg, 3, 7]} />
        {cord}
      </mesh>
      {i < TAIL_SEGMENTS - 1 ? (
        link(i + 1)
      ) : (
        <group position={[seg, 0, 0]}>
          {/* tassel: bead, then a flare that widens downward */}
          <mesh>
            <sphereGeometry args={[0.05, 12, 10]} />
            <ClayMat color={look.bead} roughness={0.5} metalness={look.metalness} />
          </mesh>
          <mesh position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.038, 0.072, 0.16, 12, 1, true]} />
            <ClayMat
              color={look.cordAlt}
              roughness={0.72}
              metalness={look.metalness}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  )

  // Root points the chain down (+X → −Y). The lean is mostly *sideways* on
  // purpose: splaying the two threads only in depth left them projecting onto
  // each other from a side-on camera, so they read as one fat cord.
  return <group rotation={[-dir * 0.2, 0, -Math.PI / 2 - dir * 0.3]}>{link(0)}</group>
}

/* ── the arm ──────────────────────────────────────────────────────────────── */

function Finger({
  spec,
  shade,
}: {
  spec: (typeof FINGERS)[number]
  shade: number
}) {
  return (
    <group position={[spec.x, -0.02, spec.z]} rotation={[0, spec.splay, 0]}>
      {/* knuckle */}
      <mesh>
        <sphereGeometry args={[spec.r * 1.12, 12, 10]} />
        <ClayMat color={shade} roughness={0.92} metalness={0.02} />
      </mesh>
      <group rotation={[0, 0, -spec.curl]}>
        <mesh position={[spec.l1 / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <capsuleGeometry args={[spec.r, spec.l1, 3, 10]} />
          <ClayMat color={shade} roughness={0.92} metalness={0.02} />
        </mesh>
        <group position={[spec.l1, 0, 0]} rotation={[0, 0, -spec.curl * 1.5]}>
          <mesh position={[spec.l2 / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <capsuleGeometry args={[spec.r * 0.88, spec.l2, 3, 10]} />
            <ClayMat color={shade} roughness={0.92} metalness={0.02} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export interface Wrist3DProps {
  rakhi: RakhiSpec
  /** 0 → 1. Drives the rakhi travelling in, the thread winding and the knot. */
  tie: number
  /** Gentle idle motion of the arm. */
  alive?: boolean
}

export function Wrist3D({ rakhi, tie, alive = true }: Wrist3DProps) {
  const look = THREAD_LOOK[rakhi.thread]
  const arm = useRef<THREE.Group>(null)
  const rig = useRef<THREE.Group>(null)
  const tilt = useRef<THREE.Group>(null)
  const wrap = useRef<THREE.Mesh>(null)
  const knot = useRef<THREE.Group>(null)
  const face = useRef<THREE.Group>(null)

  const forearm = useMemo(() => {
    const points = FOREARM_PROFILE.map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(points, 32)
  }, [])

  const wrapGeometry = useMemo(() => {
    const curve = new WrapCurve(WRAP_R, Math.PI * 2 * WRAP_TURNS, WRAP_DRIFT, WRAP_START)
    const geometry = new THREE.TubeGeometry(curve, WRAP_TUBULAR, WRAP_CORD, WRAP_RADIAL, false)
    geometry.setDrawRange(0, 0)
    return geometry
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (arm.current && alive) {
      arm.current.rotation.z = -0.1 + Math.sin(t * 0.7) * 0.03
      arm.current.position.y = Math.sin(t * 0.9) * 0.04
    }

    // Three overlapping beats: travel, wind, cinch.
    const travel = smooth(0, 0.6, tie)
    const winding = smooth(0.34, 0.88, tie)
    const cinch = smooth(0.86, 1, tie)

    if (rig.current) {
      // The float spot is deliberately close to the arm plane: pushed further
      // toward the camera, perspective magnifies the disc enough to shove it
      // out of frame on a phone.
      rig.current.position.set(
        THREE.MathUtils.lerp(0.16, BAND_X, travel),
        THREE.MathUtils.lerp(1.02, 0, travel) + (1 - travel) * Math.sin(t * 1.3) * 0.06,
        THREE.MathUtils.lerp(0.6, 0, travel),
      )
    }

    if (tilt.current) {
      // Unwinding this rotation is what lays the face down onto the wrist: at
      // rest the disc is tilted back for the camera, at 1 it lies on the arm.
      tilt.current.rotation.x = (1 - travel) * 0.95
      tilt.current.rotation.y = (1 - travel) * (0.3 + Math.sin(t * 0.9) * 0.22)
      tilt.current.rotation.z = (1 - travel) * (-0.35 + Math.sin(t * 0.7) * 0.12)
    }

    if (wrap.current) {
      const per = WRAP_RADIAL * 6
      const segments = Math.round(winding * WRAP_TUBULAR)
      wrap.current.geometry.setDrawRange(0, segments * per)
      wrap.current.visible = segments > 0
    }

    if (knot.current) {
      knot.current.visible = cinch > 0.01
      // Overshoot on the way in, so the knot lands with a tug.
      knot.current.scale.setScalar(cinch * (1 + Math.sin(cinch * Math.PI) * 0.24))
    }

    if (face.current) {
      face.current.scale.setScalar(1 + Math.sin(cinch * Math.PI) * 0.09)
    }
  })

  const cordMat = (
    <ClayMat
      color={look.cord}
      roughness={look.roughness}
      metalness={look.metalness}
      emissive={look.emissive}
      emissiveIntensity={look.emissiveIntensity}
      transparent={look.transparent}
      opacity={look.opacity}
    />
  )

  return (
    <group ref={arm} rotation={[0, 0, -0.1]}>
      {/* forearm — lathe runs +Y from the wrist, rotated so +Y becomes −X */}
      <mesh geometry={forearm} position={[WRIST_X, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ClayMat color={SKIN} roughness={0.92} metalness={0.02} />
      </mesh>
      {/* plugs the lathe's open elbow end, which the cuff then hides */}
      <mesh position={[WRIST_X - FOREARM_LEN + 0.04, 0, 0]}>
        <sphereGeometry args={[0.445, 20, 14]} />
        <ClayMat color={SKIN_SHADE} roughness={0.92} metalness={0.02} />
      </mesh>

      {/* sleeve */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.98, 0, 0]}>
        <cylinderGeometry args={[0.53, 0.55, 0.46, 28]} />
        <ClayMat color={HEX.sky} roughness={0.88} metalness={0.03} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-2.22, 0, 0]}>
        <cylinderGeometry args={[0.56, 0.57, 0.12, 28]} />
        <ClayMat color={0x2f6ddb} roughness={0.86} metalness={0.03} />
      </mesh>

      {/* wrist crease */}
      <mesh position={[WRIST_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.276, 0.024, 8, 26]} />
        <ClayMat color={SKIN_SHADE} roughness={0.94} metalness={0.02} />
      </mesh>

      {/* hand */}
      <group position={[0, -0.01, 0]} rotation={[0, 0, 0.07]}>
        {/* palm: a flattened capsule, so it has parallel sides like a hand and
            not the egg silhouette a scaled sphere gives */}
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.68, 0.98, 1]}>
          <capsuleGeometry args={[0.31, 0.3, 5, 22]} />
          <ClayMat color={SKIN} roughness={0.92} metalness={0.02} />
        </mesh>
        {/* fleshy underside pad */}
        <mesh position={[0.86, -0.13, 0.02]} rotation={[0, 0, -Math.PI / 2]} scale={[0.4, 0.82, 0.86]}>
          <capsuleGeometry args={[0.29, 0.22, 4, 18]} />
          <ClayMat color={SKIN_SHADE} roughness={0.94} metalness={0.02} />
        </mesh>

        {FINGERS.map((spec) => (
          <Finger key={spec.z} spec={spec} shade={SKIN} />
        ))}

        {/* thumb — opposed, angled forward and toward the camera */}
        <group position={[0.62, -0.02, 0.3]} rotation={[0, -0.62, -0.58]}>
          <mesh>
            <sphereGeometry args={[0.115, 14, 12]} />
            <ClayMat color={SKIN_SHADE} roughness={0.92} metalness={0.02} />
          </mesh>
          <mesh position={[0.13, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <capsuleGeometry args={[0.098, 0.22, 4, 12]} />
            <ClayMat color={SKIN_SHADE} roughness={0.92} metalness={0.02} />
          </mesh>
          <group position={[0.27, 0, 0]} rotation={[0, 0, -0.42]}>
            <mesh position={[0.09, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <capsuleGeometry args={[0.086, 0.17, 4, 12]} />
              <ClayMat color={SKIN_SHADE} roughness={0.92} metalness={0.02} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── the rakhi: one rig that travels from mid-air onto the arm ──────── */}
      <group ref={rig}>
        {/* Everything that is *part of the disc* tilts as one. The threads
            deliberately live outside this group: gravity does not care how the
            rakhi is being held, so they hang from the rig instead of swinging
            around with the tilt (which read as a stray squiggle of wire). */}
        <group ref={tilt}>
          {/* the thread winding around the forearm */}
          <mesh ref={wrap} geometry={wrapGeometry}>
            {cordMat}
          </mesh>

          {/* the knot, exactly where the thread's two ends meet */}
          <group ref={knot} position={[0, KNOT_Y, KNOT_Z]} visible={false}>
            <mesh scale={[1.2, 0.85, 1]} rotation={[WRAP_START, 0, 0]}>
              <sphereGeometry args={[0.088, 14, 12]} />
              {cordMat}
            </mesh>
            <mesh rotation={[WRAP_START, 0, 0.5]}>
              <torusGeometry args={[0.078, 0.03, 8, 18]} />
              <ClayMat color={look.cordAlt} roughness={look.roughness} metalness={look.metalness} />
            </mesh>
          </group>

          {/* the decorative face. Tilted first, *then* pushed out along its own
              normal — clear of the wound cord, not just of the arm — so it reads
              as threaded onto the band instead of sunk through it. */}
          <group rotation={[-0.95, 0, 0]}>
            <group ref={face} position={[0, 0, WRAP_R + WRAP_CORD + 0.03]}>
              <Rakhi3D spec={rakhi} scale={0.38} showTails={false} />
            </group>
          </group>
        </group>

        {/* the two threads, hanging off the knot */}
        <group position={[0.03, KNOT_Y - 0.06, KNOT_Z + 0.02]}>
          <Tail dir={-1} look={look} tie={tie} />
        </group>
        <group position={[-0.03, KNOT_Y - 0.06, KNOT_Z + 0.02]}>
          <Tail dir={1} look={look} tie={tie} />
        </group>
      </group>
    </group>
  )
}
