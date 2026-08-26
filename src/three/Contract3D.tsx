/**
 * Contract3D.tsx — the Pre-emptive Budget Contract as a physical object.
 *
 * A stiff clay document with the clauses printed onto it via canvas texture, a
 * wax seal, and a stamped budget cap. The sister drags her rakhi onto the seal
 * to break it, so the seal exposes its world position through a ref callback.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { inrPlain } from '../lib/money'
import { ClayMat, HEX } from './clay'

function useContractTexture(brotherName: string, budgetCap: number, terms: string[]) {
  return useMemo(() => {
    const w = 1536
    const h = 2048
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.CanvasTexture(canvas)

    ctx.fillStyle = '#FFFDF7'
    ctx.fillRect(0, 0, w, h)

    // faint ruled paper
    ctx.strokeStyle = 'rgba(43,37,35,0.07)'
    ctx.lineWidth = 3
    for (let y = 240; y < h - 120; y += 68) {
      ctx.beginPath()
      ctx.moveTo(100, y)
      ctx.lineTo(w - 100, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#FFB703'
    ctx.fillRect(0, 0, w, 28)
    ctx.fillRect(0, h - 28, w, 28)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = '#1A1412'
    ctx.font = '900 100px Fredoka, "Arial Black", Nunito, sans-serif'
    ctx.fillText('SHAGUN BUDGET', w / 2, 175)
    ctx.font = '900 76px Fredoka, "Arial Black", Nunito, sans-serif'
    ctx.fillText('CONTRACT', w / 2, 275)

    ctx.fillStyle = '#7A6A5E'
    ctx.font = '700 48px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(`ISSUED BY ${(brotherName || 'YOUR BROTHER').toUpperCase()}`, w / 2, 375)

    // the cap, big
    ctx.fillStyle = '#14B8A6'
    ctx.beginPath()
    ctx.roundRect(w / 2 - 420, 440, 840, 260, 48)
    ctx.fill()
    ctx.strokeStyle = '#1A1412'
    ctx.lineWidth = 10
    ctx.stroke()

    ctx.fillStyle = '#042F2E'
    ctx.font = '800 46px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
    ctx.fillText('MAXIMUM, FINAL, NON-NEGOTIABLE', w / 2, 510)
    ctx.font = '900 148px Nunito, Fredoka, "Arial Black", sans-serif'
    ctx.fillText(`₹${inrPlain(budgetCap)}`, w / 2, 625)

    // clauses
    ctx.textAlign = 'left'
    ctx.fillStyle = '#1A1412'
    ctx.font = '900 58px Fredoka, "Arial Black", Nunito, sans-serif'
    ctx.fillText('BINDING CLAUSES', 120, 810)

    ctx.font = '700 48px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
    let y = 910
    terms.slice(0, 6).forEach((term, i) => {
      ctx.fillStyle = '#FF3366'
      ctx.fillText(`${i + 1}.`, 120, y)
      ctx.fillStyle = '#2E2724'
      // wrap each clause to the sheet width
      const words = term.split(/\s+/)
      let line = ''
      let lineY = y
      for (const word of words) {
        const attempt = line ? `${line} ${word}` : word
        if (ctx.measureText(attempt).width > w - 340) {
          ctx.fillText(line, 200, lineY)
          line = word
          lineY += 60
        } else line = attempt
      }
      ctx.fillText(line, 200, lineY)
      y = lineY + 95
    })

    // signature line
    ctx.strokeStyle = '#1A1412'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(120, h - 250)
    ctx.lineTo(700, h - 250)
    ctx.stroke()
    ctx.fillStyle = '#1A1412'
    ctx.font = 'italic 700 68px Fredoka, Nunito, sans-serif'
    ctx.fillText(brotherName || 'Bhai', 140, h - 290)
    ctx.fillStyle = '#7A6A5E'
    ctx.font = '700 40px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
    ctx.fillText('SIGNED, THE BROTHER', 120, h - 195)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 16
    texture.needsUpdate = true
    return texture
  }, [brotherName, budgetCap, terms])
}

export interface Contract3DProps {
  brotherName: string
  budgetCap: number
  terms: string[]
  /** Seal breaks open once the rakhi lands on it. */
  sealBroken?: boolean
  /** Pulses the seal to advertise the drop target. */
  highlightSeal?: boolean
  /** Tilts the sheet gently as if held. */
  sway?: boolean
}

export function Contract3D({
  brotherName,
  budgetCap,
  terms,
  sealBroken = false,
  highlightSeal = false,
  sway = true,
}: Contract3DProps) {
  const texture = useContractTexture(brotherName, budgetCap, terms)
  const sheet = useRef<THREE.Group>(null)
  const seal = useRef<THREE.Group>(null)
  const crackAmount = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (sheet.current && sway) {
      sheet.current.rotation.y = Math.sin(t * 0.5) * 0.11
      sheet.current.rotation.x = Math.sin(t * 0.37 + 1) * 0.05
    }
    if (seal.current) {
      crackAmount.current += ((sealBroken ? 1 : 0) - crackAmount.current) * 0.08
      const pulse = highlightSeal && !sealBroken ? 1 + Math.sin(t * 5) * 0.11 : 1
      const s = pulse * (1 - crackAmount.current * 0.55)
      seal.current.scale.set(s, s, s)
      seal.current.rotation.z = crackAmount.current * 1.3
      seal.current.position.z = 0.13 + crackAmount.current * 0.5
    }
  })

  return (
    <group ref={sheet}>
      {/* backing board gives the paper some clay heft */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[2.42, 3.22, 0.1]} />
        <ClayMat color={HEX.claydrop} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[2.34, 3.12]} />
        <meshStandardMaterial map={texture} roughness={0.82} metalness={0.02} />
      </mesh>

      {/* corner staple */}
      <mesh position={[-1.0, 1.4, 0.06]} rotation={[0, 0, 0.7]}>
        <boxGeometry args={[0.22, 0.06, 0.03]} />
        <ClayMat color={HEX.claydrop} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* wax seal — the rakhi drop target */}
      <group ref={seal} position={[0.72, -1.16, 0.13]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.33, 0.11, 26]} />
          <ClayMat color={HEX.gulabiDeep} roughness={0.72} metalness={0.06} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <torusGeometry args={[0.18, 0.05, 8, 22]} />
          <ClayMat color={HEX.marigold} roughness={0.55} metalness={0.22} />
        </mesh>
        {highlightSeal && !sealBroken && (
          <mesh position={[0, 0, 0.02]}>
            <ringGeometry args={[0.4, 0.5, 30]} />
            <meshBasicMaterial color={HEX.marigold} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  )
}
