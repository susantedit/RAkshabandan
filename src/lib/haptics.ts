/**
 * haptics.ts — vibration feedback for the tactile moments (tying the rakhi,
 * cracking the vault, the wheel ticking past a segment). Silently inert on
 * hardware or browsers that don't support it, which includes all of iOS Safari.
 */

const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

function buzz(pattern: number | number[]): void {
  if (!supported) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* some browsers throw when the page is backgrounded */
  }
}

/** Light click — chip selection, wheel tick. */
export const tap = () => buzz(12)

/** Medium thud — button commit, vault tap. */
export const thud = () => buzz(28)

/** Celebratory triple — rakhi tied, vault cracked, jackpot. */
export const celebrate = () => buzz([34, 46, 34, 46, 90])

/** Long single — ceremony complete. */
export const heavy = () => buzz(160)

/** Descending error pattern. */
export const nope = () => buzz([18, 60, 18])

export const hapticsSupported = supported
