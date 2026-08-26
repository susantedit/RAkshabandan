/**
 * Stage.tsx — the shared 3D studio.
 *
 * Bright, flat, cheerful lighting so clay colours stay saturated everywhere on
 * the object, plus a soft circular shadow blob underneath so each toy reads as
 * resting on a real table instead of floating in a void.
 */

import { Canvas, useFrame, useThree, type CanvasProps } from '@react-three/fiber'
import {
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import * as THREE from 'three'
import { HEX, useShadowTexture } from './clay'

/* ── lighting ─────────────────────────────────────────────────────────────── */

export function StudioLights({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      {/* Pure soft daylight — keeps every face of the clay bright and readable. */}
      <ambientLight color={0xffffff} intensity={1.2 * intensity} />
      {/* Warm key light from above-right, casts the round drop shadow. */}
      <directionalLight color={HEX.ghee} intensity={1.8 * intensity} position={[3, 10, 5]} />
      {/* Cool fill from the opposite side so shadow sides don't go muddy. */}
      <directionalLight color={0xd8ecff} intensity={0.55 * intensity} position={[-6, 2, -4]} />
      {/* Gentle bounce from the cream tablecloth below. */}
      <hemisphereLight args={[0xffffff, HEX.claydrop, 0.5 * intensity]} />
    </>
  )
}

/** Fake contact shadow: a radial-gradient sprite laid flat on the ground. */
export function GroundShadow({
  y = -1.5,
  radius = 1.7,
  opacity = 0.15,
}: {
  y?: number
  radius?: number
  opacity?: number
}) {
  const texture = useShadowTexture()
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <circleGeometry args={[radius, 48]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * Aims the camera at a point and keeps position and FOV synchronized with props.
 * R3F only *positions* the camera from the `camera` prop on initial mount — it
 * never updates position or calls `lookAt` when props change dynamically.
 * Feeding `position`, `target`, and `fov` here ensures that switching modes
 * (such as moving from the Rakhi view to the Puja Thali view) properly repositions
 * and aims the camera down into the plate.
 */
function CameraRig({
  position,
  target,
  fov,
}: {
  position: [number, number, number]
  target?: [number, number, number]
  fov?: number
}) {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.position.set(position[0], position[1], position[2])
    const lookTarget = target ?? [0, 0, 0]
    camera.lookAt(lookTarget[0], lookTarget[1], lookTarget[2])
    if (fov && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov
    }
    camera.updateProjectionMatrix()
  }, [camera, position[0], position[1], position[2], target?.[0], target?.[1], target?.[2], fov])
  return null
}

/* ── motion helpers ──────────────────────────────────────────────────────── */

/** Gentle idle float, so nothing ever looks frozen. */
export function Bob({
  children,
  amount = 0.07,
  speed = 1.1,
  offset = 0,
}: PropsWithChildren<{ amount?: number; speed?: number; offset?: number }>) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime * speed + offset) * amount
    }
  })
  return <group ref={ref}>{children}</group>
}

export interface TurntableProps {
  /** Idle spin speed in radians/second. `0` disables it. */
  autoSpin?: number
  /** Blocks user rotation (e.g. while a gesture owns the screen). */
  locked?: boolean
  /** Allow vertical tilt as well as horizontal spin. */
  tilt?: boolean
  initialY?: number
  maxTilt?: number
}

/**
 * Drag-to-rotate with flick inertia. Hand-rolled rather than OrbitControls so
 * touch behaviour stays predictable next to the app's own gestures (circular
 * aarti drag, long-press, rapid tapping) and so the camera never wanders.
 */
export function Turntable({
  children,
  autoSpin = 0.25,
  locked = false,
  tilt = true,
  initialY = 0,
  maxTilt = 0.5,
}: PropsWithChildren<TurntableProps>) {
  const group = useRef<THREE.Group>(null)
  const gl = useThree((state) => state.gl)

  const state = useRef({
    y: initialY,
    x: 0,
    vy: 0,
    vx: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    idle: 0,
  })

  useEffect(() => {
    state.current.y = initialY
    state.current.x = 0
    state.current.vy = 0
    state.current.vx = 0
    state.current.idle = 0
  }, [initialY])

  useEffect(() => {
    const el = gl.domElement
    const s = state.current

    const down = (event: PointerEvent) => {
      if (locked) return
      s.dragging = true
      s.idle = 0
      s.lastX = event.clientX
      s.lastY = event.clientY
      s.vy = 0
      s.vx = 0
      try {
        el.setPointerCapture(event.pointerId)
      } catch {
        /* not all pointer types support capture */
      }
    }

    const move = (event: PointerEvent) => {
      if (!s.dragging || locked) return
      const dx = event.clientX - s.lastX
      const dy = event.clientY - s.lastY
      s.lastX = event.clientX
      s.lastY = event.clientY
      s.y += dx * 0.011
      s.vy = dx * 0.011
      if (tilt) {
        s.x = THREE.MathUtils.clamp(s.x + dy * 0.008, -maxTilt, maxTilt)
        s.vx = dy * 0.008
      }
    }

    const up = (event: PointerEvent) => {
      s.dragging = false
      try {
        el.releasePointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('pointerleave', up)

    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('pointerleave', up)
    }
  }, [gl, locked, tilt, maxTilt])

  useFrame((_, delta) => {
    const s = state.current
    const step = Math.min(delta, 0.05)

    if (!s.dragging) {
      // Flick inertia, then hand back to the idle turntable spin.
      s.y += s.vy
      s.x += s.vx
      s.vy *= 0.92
      s.vx *= 0.9
      s.idle += step
      if (Math.abs(s.vy) < 0.0015 && s.idle > 0.6 && autoSpin) {
        s.y += autoSpin * step
      }
      s.x *= 0.97 // settle back toward level
    }

    if (group.current) {
      group.current.rotation.y = s.y
      group.current.rotation.x = s.x
    }
  })

  return <group ref={group}>{children}</group>
}

/* ── the canvas shell ─────────────────────────────────────────────────────── */

export interface StageProps {
  children: ReactNode
  /** Sizing classes for the wrapper. The canvas always fills it. */
  className?: string
  /** `none` = the canvas owns all gestures. `pan-y` lets the page scroll over it. */
  touch?: 'none' | 'pan-y' | 'auto'
  cameraPosition?: [number, number, number]
  /** Point the camera looks at. Needed whenever the camera is raised above the
   *  subject, since R3F never aims the camera on its own. */
  target?: [number, number, number]
  fov?: number
  lights?: boolean
  lightIntensity?: number
  onCreated?: CanvasProps['onCreated']
  /** Render on demand instead of every frame — for static previews. */
  frameloop?: 'always' | 'demand'
}

export function Stage({
  children,
  className,
  touch = 'none',
  cameraPosition = [0, 0.4, 5.4],
  target,
  fov = 38,
  lights = true,
  lightIntensity = 1,
  onCreated,
  frameloop = 'always',
}: StageProps) {
  const dpr = useMemo<[number, number]>(
    () => [1, Math.min(2.5, typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2)],
    [],
  )

  // The Canvas hard-codes width/height:100% inline, so sizing lives on a wrapper
  // where Tailwind height classes actually win.
  return (
    <div className={className}>
      <Canvas
        style={{ touchAction: touch }}
        dpr={dpr}
        frameloop={frameloop}
        camera={{ position: cameraPosition, fov, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={onCreated}
      >
        {lights && <StudioLights intensity={lightIntensity} />}
        <CameraRig position={cameraPosition} target={target} fov={fov} />
        {children}
      </Canvas>
    </div>
  )
}
