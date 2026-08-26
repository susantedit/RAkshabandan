/**
 * rng.ts — deterministic randomness.
 *
 * The roulette outcome must be *fixed by the link*, not by the moment of the
 * spin: otherwise the loser just reloads the page until they like the result.
 * So the sender embeds a seed, and both siblings' devices derive the identical
 * outcome from it.
 */

import type { WheelSlot } from './payload'

/** mulberry32 — tiny, fast, good enough distribution for a prize wheel. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function freshSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1
}

/** Weighted pick. Returns the index of the winning slot. */
export function pickWeighted(slots: WheelSlot[], rand: () => number): number {
  const total = slots.reduce((sum, s) => sum + s.weight, 0)
  let roll = rand() * total
  for (let i = 0; i < slots.length; i++) {
    roll -= slots[i].weight
    if (roll <= 0) return i
  }
  return slots.length - 1
}

/**
 * A genuinely fair wheel: ten distinct outcomes, one equal wedge each, so every
 * result — including her full demand — lands 10% of the time. No slot is
 * weighted, duplicated or shrunk.
 *
 * The rupee amounts are the traditional shagun ladder (₹101, ₹251, ₹501…) rather
 * than fractions of the demand, capped so no wedge can ever pay out more than
 * she asked for. One consequence: against a very small demand several wedges cap
 * to the same figure and the wheel shows repeated labels. The odds per wedge are
 * still exactly equal — it just means "₹40" can win from more than one wedge.
 */
export function buildWheel(demandAmt: number): WheelSlot[] {
  const ceiling = Math.max(10, Math.round(demandAmt))
  const cap = (n: number) => Math.min(n, ceiling)

  // Tiers only decide wedge colour, so they alternate for readability.
  return [
    { label: '₹10', amt: 10, weight: 1, tier: 1 },
    { label: 'Blessings ✨', amt: 0, weight: 1, tier: 0 },
    { label: `₹${cap(101)}`, amt: cap(101), weight: 1, tier: 2 },
    { label: `₹${cap(21)}`, amt: cap(21), weight: 1, tier: 1 },
    { label: `₹${cap(251)}`, amt: cap(251), weight: 1, tier: 2 },
    { label: 'JACKPOT', amt: ceiling, weight: 1, tier: 3 },
    { label: `₹${cap(51)}`, amt: cap(51), weight: 1, tier: 1 },
    { label: 'Half of it', amt: Math.round(ceiling / 2), weight: 1, tier: 2 },
    { label: `₹${cap(151)}`, amt: cap(151), weight: 1, tier: 1 },
    { label: `₹${cap(501)}`, amt: cap(501), weight: 1, tier: 2 },
  ]
}

/** Odds of any single wedge, as a display string like "10%". */
export function slotOdds(slots: WheelSlot[]): string {
  const total = slots.reduce((sum, s) => sum + s.weight, 0)
  if (total === 0 || slots.length === 0) return '0%'
  const pct = (slots[0].weight / total) * 100
  return `${pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%`
}

/** Odds of the jackpot slot, as a display string like "10%". */
export function jackpotOdds(slots: WheelSlot[]): string {
  const total = slots.reduce((sum, s) => sum + s.weight, 0)
  const jackpot = slots.find((s) => s.tier === 3)
  if (!jackpot || total === 0) return '0%'
  const pct = (jackpot.weight / total) * 100
  return `${pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%`
}
