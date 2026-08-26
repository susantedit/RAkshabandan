/**
 * AudioToggle.tsx — Floating audio toggle button for background music & effects
 */

import { useState } from 'react'
import { isAudioMuted, playBackgroundMusic, toggleMute } from '../lib/audio'

export function AudioToggle({ className = '' }: { className?: string }) {
  const [muted, setMuted] = useState(isAudioMuted())

  const handleClick = () => {
    const nextMuted = toggleMute()
    setMuted(nextMuted)
    if (!nextMuted) {
      playBackgroundMusic()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={muted ? 'Unmute music' : 'Mute music'}
      className={`fixed top-3 right-3 z-50 p-2.5 rounded-full bg-puffy/90 backdrop-blur-md border-2 border-clayline shadow-lg text-lg flex items-center justify-center transition-transform active:scale-95 ${className}`}
    >
      {muted ? '🔇' : '🎵'}
    </button>
  )
}
