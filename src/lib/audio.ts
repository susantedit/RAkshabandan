/**
 * audio.ts — Background music & meme sound effects manager.
 */

let bgAudio: HTMLAudioElement | null = null
let currentEffectAudio: HTMLAudioElement | null = null
let muted = false

export function getBgAudio(): HTMLAudioElement {
  if (!bgAudio) {
    bgAudio = new Audio('/videoplayback.m4a')
    bgAudio.loop = true
    bgAudio.volume = 0.45
  }
  return bgAudio
}

export function playBackgroundMusic(): void {
  const audio = getBgAudio()
  if (muted) return
  audio.play().catch(() => {
    // Autoplay restrictions handle on user interaction
  })
}

export function toggleMute(): boolean {
  muted = !muted
  const bg = getBgAudio()
  bg.muted = muted
  if (currentEffectAudio) {
    currentEffectAudio.muted = muted
  }
  if (!muted && bg.paused) {
    bg.play().catch(() => {})
  }
  return muted
}

export function isAudioMuted(): boolean {
  return muted
}

export function stopEffectAudio(): void {
  if (currentEffectAudio) {
    currentEffectAudio.pause()
    currentEffectAudio.currentTime = 0
    currentEffectAudio = null
  }
}

/**
 * Plays a specific meme song when sister opens vault:
 * - 'paisa' -> /paisa hi paisa hoga.m4a
 * - 'nothing' -> /nothing.m4a
 * - default -> /brother.m4a
 */
export function playMemeSong(mode: string, meme?: string): void {
  stopEffectAudio()

  let src = '/brother.m4a'
  if (meme === 'paisa' || mode === 'paisa') {
    src = '/paisa hi paisa hoga.m4a'
  } else if (meme === 'nothing' || mode === 'nothing' || (mode === 'meme' && meme === 'custom')) {
    src = '/nothing.m4a'
  }

  // PAUSE background music while meme plays so they never overlap
  if (bgAudio) {
    bgAudio.pause()
  }

  const effect = new Audio(src)
  effect.volume = 1.0
  effect.muted = muted
  currentEffectAudio = effect

  const resumeBg = () => {
    currentEffectAudio = null
    if (bgAudio && !muted) {
      bgAudio.play().catch(() => {})
    }
  }

  effect.onended = resumeBg
  effect.onerror = resumeBg

  effect.play().catch(() => {
    resumeBg()
  })
}

/**
 * Plays blessing sound effect / song (/bless.m4a).
 */
export function playBlessSong(): void {
  stopEffectAudio()

  // PAUSE background music while blessing song plays
  if (bgAudio) {
    bgAudio.pause()
  }

  const effect = new Audio('/bless.m4a')
  effect.volume = 1.0
  effect.muted = muted
  currentEffectAudio = effect

  const resumeBg = () => {
    currentEffectAudio = null
    if (bgAudio && !muted) {
      bgAudio.play().catch(() => {})
    }
  }

  effect.onended = resumeBg
  effect.onerror = resumeBg

  effect.play().catch(() => {
    resumeBg()
  })
}
