/**
 * Burst.tsx — gold particle explosions for the payoff moments (rakhi tied,
 * vault cracked, jackpot hit).
 *
 * A single THREE.Points with hand-integrated velocities. Re-fires whenever the
 * `trigger` value changes, so callers just bump a counter.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function makeSpriteTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = size / 2
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,240,200,0.85)')
    gradient.addColorStop(1, 'rgba(255,200,90,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export interface BurstProps {
  /** Change this value to fire. `0` never fires. */
  trigger: number
  count?: number
  origin?: [number, number, number]
  /** Initial speed magnitude. */
  power?: number
  gravity?: number
  life?: number
  size?: number
  colors?: number[]
  onDone?: () => void
}

export function Burst({
  trigger,
  count = 170,
  origin = [0, 0, 0],
  power = 3.4,
  gravity = -2.6,
  life = 1.5,
  size = 0.15,
  colors = [0xffb703, 0xffe3a3, 0xffffff, 0xff4d6d],
  onDone,
}: BurstProps) {
  const points = useRef<THREE.Points>(null)
  const texture = useMemo(makeSpriteTexture, [])

  const buffers = useMemo(
    () => ({
      positions: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      colorAttr: new Float32Array(count * 3),
      seeds: new Float32Array(count),
    }),
    [count],
  )

  const state = useRef({ age: Infinity, running: false })

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(buffers.colorAttr, 3))
    return g
  }, [buffers])

  // Fire on trigger change.
  useEffect(() => {
    if (!trigger) return

    const palette = colors.map((hex) => new THREE.Color(hex))
    const { positions, velocities, colorAttr, seeds } = buffers

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = origin[0]
      positions[i3 + 1] = origin[1]
      positions[i3 + 2] = origin[2]

      // Even-ish spherical spread, biased upward so it arcs like a firework.
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = power * (0.35 + Math.random() * 0.85)
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i3 + 1] = Math.abs(Math.cos(phi)) * speed * 0.9 + power * 0.35
      velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed * 0.7

      const tint = palette[i % palette.length]
      colorAttr[i3] = tint.r
      colorAttr[i3 + 1] = tint.g
      colorAttr[i3 + 2] = tint.b

      seeds[i] = 0.6 + Math.random() * 0.7
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    state.current.age = 0
    state.current.running = true
    if (points.current) points.current.visible = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  useFrame((_, delta) => {
    const s = state.current
    if (!s.running) return

    const step = Math.min(delta, 0.05)
    s.age += step

    const { positions, velocities, seeds } = buffers
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      velocities[i3 + 1] += gravity * step
      // Mild drag so particles ease into a float rather than shooting off.
      const drag = 1 - 0.9 * step * seeds[i]
      velocities[i3] *= drag
      velocities[i3 + 2] *= drag
      positions[i3] += velocities[i3] * step
      positions[i3 + 1] += velocities[i3 + 1] * step
      positions[i3 + 2] += velocities[i3 + 2] * step
    }
    geometry.attributes.position.needsUpdate = true

    const material = points.current?.material as THREE.PointsMaterial | undefined
    if (material) {
      material.opacity = Math.max(0, 1 - s.age / life)
      material.size = size * (1 + s.age * 0.35)
    }

    if (s.age >= life) {
      s.running = false
      if (points.current) points.current.visible = false
      onDone?.()
    }
  })

  return (
    <points ref={points} geometry={geometry} visible={false} frustumCulled={false}>
      <pointsMaterial
        size={size}
        map={texture}
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

/**
 * Continuous ambient sparkle — used to make the vault and jackpot slot feel
 * alive between interactions.
 */
export function Sparkles({
  count = 26,
  radius = 2.2,
  color = 0xffb703,
  size = 0.1,
  speed = 0.35,
}: {
  count?: number
  radius?: number
  color?: number
  size?: number
  speed?: number
}) {
  const points = useRef<THREE.Points>(null)
  const texture = useMemo(makeSpriteTexture, [])

  const { geometry, base, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const phaseArr = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 * 3.1
      const r = radius * (0.4 + ((i * 37) % 100) / 160)
      positions[i * 3] = Math.cos(theta) * r
      positions[i * 3 + 1] = (((i * 53) % 100) / 100 - 0.5) * radius * 1.1
      positions[i * 3 + 2] = Math.sin(theta) * r * 0.5
      phaseArr[i] = (i * 0.7) % (Math.PI * 2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: g, base: Float32Array.from(positions), phases: phaseArr }
  }, [count, radius])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed
    const attr = geometry.attributes.position as THREE.BufferAttribute
    const array = attr.array as Float32Array
    for (let i = 0; i < count; i++) {
      array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 2 + phases[i]) * 0.22
    }
    attr.needsUpdate = true
    const material = points.current?.material as THREE.PointsMaterial | undefined
    if (material) material.opacity = 0.55 + Math.sin(t * 3) * 0.25
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={size}
        map={texture}
        color={color}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}
