/**
 * route.ts — hash-driven routing. There is no server, so the fragment IS the app
 * state. Capsule routes look like `#s=<capsule>`; plain screens are bare words.
 */

import { useEffect, useState } from 'react'

export const CAPSULE_PREFIXES = ['s', 'br', 'b', 'sr'] as const
export type CapsulePrefix = (typeof CAPSULE_PREFIXES)[number]

export type Route =
  | { name: 'home' }
  | { name: 'sister-build' }
  | { name: 'brother-defend' }
  | { name: 'wallet' }
  | { name: 'privacy' }
  | { name: 'blog' }
  | { name: 'capsule'; prefix: CapsulePrefix; capsule: string }

const SCREENS: Record<string, Route['name']> = {
  '': 'home',
  'make-rakhi': 'sister-build',
  defend: 'brother-defend',
  wallet: 'wallet',
  privacy: 'privacy',
  blog: 'blog',
  'blog/anithor-bond-3d-rakhi-digital-love': 'blog',
}

export function parseHash(raw: string): Route {
  const hash = raw.replace(/^#/, '')

  const eq = hash.indexOf('=')
  if (eq > 0) {
    const prefix = hash.slice(0, eq)
    const capsule = hash.slice(eq + 1)
    if ((CAPSULE_PREFIXES as readonly string[]).includes(prefix) && capsule.length > 8) {
      return { name: 'capsule', prefix: prefix as CapsulePrefix, capsule }
    }
  }

  const screen = SCREENS[hash]
  if (screen && screen !== 'capsule') return { name: screen } as Route
  return { name: 'home' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export function go(hash: string): void {
  const next = hash.startsWith('#') ? hash : `#${hash}`
  if (window.location.hash === next) {
    // Same hash: no `hashchange` fires, so nudge the listeners by hand.
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = next
}

export function goHome(): void {
  // Wipe the capsule out of the address bar entirely rather than leaving `#`.
  history.replaceState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Absolute shareable link for a capsule. */
export function buildLink(prefix: CapsulePrefix, capsule: string): string {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}#${prefix}=${capsule}`
}

/** Chat apps get unhappy past a few thousand characters — warn before they do. */
export function linkHealth(link: string): { ok: boolean; length: number; note: string } {
  const length = link.length
  if (length < 2000) return { ok: true, length, note: 'Comfortably shareable anywhere.' }
  if (length < 4000)
    return { ok: true, length, note: 'Long but fine for WhatsApp, Instagram and SMS.' }
  return {
    ok: false,
    length,
    note: 'Very long link — trim your message or a few invoice rows to be safe.',
  }
}
