/** money.ts — Indian-format currency helpers. */

const INR = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

/** `1500` → `Rs. 1,500` */
export function inr(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `Rs. ${INR.format(n)}`
}

export const npr = inr

/** `1500` → `1,500` */
export function inrPlain(amount: number): string {
  return INR.format(Number.isFinite(amount) ? Math.round(amount) : 0)
}

/** Strips everything non-numeric — for lenient amount inputs. */
export function parseAmount(text: string, max = 9_999_999): number {
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return 0
  return Math.min(max, parseInt(digits, 10))
}
