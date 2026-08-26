/**
 * storage.ts — the Duty Voucher wallet.
 *
 * Vouchers are the one thing that outlives a link: once a sister opens her
 * brother's voucher deck we persist it to *her own* localStorage so she can
 * redeem the coupons later. Still zero-server — this never leaves her device.
 */

import type { Voucher } from './payload'

const WALLET_KEY = 'rakhiforge.wallet.v1'

export interface WalletVoucher extends Voucher {
  /** Stable dedupe key so reopening the same link doesn't clone the deck. */
  key: string
  from: string
  addedAt: number
  redeemed: boolean
  redeemedAt: number | null
}

function read(): WalletVoucher[] {
  try {
    const raw = localStorage.getItem(WALLET_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WalletVoucher[]) : []
  } catch {
    return []
  }
}

function write(list: WalletVoucher[]): WalletVoucher[] {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(list.slice(0, 60)))
  } catch {
    /* private mode / quota — the UI still works for this session */
  }
  return list
}

export function loadWallet(): WalletVoucher[] {
  return read().sort((a, b) => Number(a.redeemed) - Number(b.redeemed) || b.addedAt - a.addedAt)
}

/** Idempotent: adding the same `from:id` pair twice is a no-op. */
export function addVouchers(vouchers: Voucher[], from: string, stamp: number): WalletVoucher[] {
  const existing = read()
  const seen = new Set(existing.map((v) => v.key))

  for (const voucher of vouchers) {
    const key = `${from.toLowerCase().trim()}:${voucher.id}`
    if (seen.has(key)) continue
    seen.add(key)
    existing.push({
      ...voucher,
      key,
      from,
      addedAt: stamp,
      redeemed: false,
      redeemedAt: null,
    })
  }

  write(existing)
  return loadWallet()
}

export function redeemVoucher(key: string, stamp: number): WalletVoucher[] {
  const list = read().map((v) =>
    v.key === key ? { ...v, redeemed: true, redeemedAt: stamp } : v,
  )
  write(list)
  return loadWallet()
}

export function unredeemVoucher(key: string): WalletVoucher[] {
  const list = read().map((v) =>
    v.key === key ? { ...v, redeemed: false, redeemedAt: null } : v,
  )
  write(list)
  return loadWallet()
}

export function removeVoucher(key: string): WalletVoucher[] {
  write(read().filter((v) => v.key !== key))
  return loadWallet()
}

export function clearWallet(): WalletVoucher[] {
  try {
    localStorage.removeItem(WALLET_KEY)
  } catch {
    /* ignore */
  }
  return []
}

export function walletCount(): number {
  return read().filter((v) => !v.redeemed).length
}
