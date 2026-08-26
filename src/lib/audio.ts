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
  if (muted || currentEffectAudio) return
  audio.play().catch(() => {
    // Autoplay restrictions handle on user interaction
  })
}

export function toggleMute(): boolean {
  muted = !muted
  const bg = getBgAudio()
  bg.muted = muted
  if (muted) {
    bg.pause()
  } else {
    // Only resume background music if no meme effect audio is currently playing
    if (!currentEffectAudio && bg.paused) {
      bg.play().catch(() => {})
    }
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
 * Plays a specific meme song when sister or brother opens vault / reveals:
 * - 'paisa' -> /paisa hi paisa hoga.m4a
 * - 'nahi' / 'nothing' -> /nothing.m4a
 * - 'blessing' / 'bless' -> /bless.m4a
 * - default ('sad', 'custom', etc.) -> /brother.m4a
 */
export function playMemeSong(mode: string, meme?: string): void {
  stopEffectAudio()

  let src = '/brother.m4a'
  const key = meme || mode
  if (key === 'paisa') {
    src = '/paisa hi paisa hoga.m4a'
  } else if (key === 'nahi' || key === 'nothing') {
    src = '/nothing.m4a'
  } else if (key === 'blessing' || key === 'bless') {
    src = '/bless.m4a'
  } else {
    src = '/brother.m4a'
  }

  // PAUSE background music while meme plays so they never overlap
  if (bgAudio) {
    bgAudio.pause()
  }

  const effect = new Audio(src)
  effect.volume = 1.0
  // Meme sound should NOT be muted even if background music is unmuted/muted
  effect.muted = false
  currentEffectAudio = effect

  const resumeBg = () => {
    if (currentEffectAudio === effect) {
      currentEffectAudio = null
    }
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
 * Plays blessing song (/bless.m4a).
 */
export function playBlessSong(): void {
  playMemeSong('blessing', 'blessing')
}

