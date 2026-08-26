/**
 * App.tsx — the whole router. The fragment is the state (see route.ts), so this
 * is just: read the hash, and for capsule routes decrypt on-device, normalise
 * defensively, and hand the payload to the right screen. Everything is wrapped
 * in the WebGL capability gate; a browser without Web Crypto can't run any of it
 * and is told so plainly.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useRoute, goHome, type CapsulePrefix } from './lib/route'
import { cryptoSupported, decryptCapsule } from './lib/crypto'
import {
  normalizeBrother,
  normalizeBrotherReply,
  normalizeSister,
  normalizeSisterReply,
} from './lib/payload'
import { Home } from './screens/Home'
import { SisterBuild } from './screens/SisterBuild'
import { BrotherDefend } from './screens/BrotherDefend'
import { BrotherReceive } from './screens/BrotherReceive'
import { SisterVerdict } from './screens/SisterVerdict'
import { SisterChallenge } from './screens/SisterChallenge'
import { BrotherSettle } from './screens/BrotherSettle'
import { Wallet } from './screens/Wallet'
import { Privacy } from './screens/Privacy'
import { BackBtn, Btn, Card, Screen, Spinner, Toaster, TopBar, WebGLGate, Well } from './ui/kit'

/* ── capsule decode ──────────────────────────────────────────────────────── */

function renderCapsule(prefix: CapsulePrefix, raw: unknown): ReactNode {
  // Prefix is the source of truth for which screen to show; the normaliser
  // coerces whatever came out of the link into that screen's expected shape.
  return prefix === 's' ? (
    <BrotherReceive sister={normalizeSister(raw)} />
  ) : prefix === 'br' ? (
    <SisterVerdict reply={normalizeBrotherReply(raw)} />
  ) : prefix === 'b' ? (
    <SisterChallenge brother={normalizeBrother(raw)} />
  ) : (
    <BrotherSettle reply={normalizeSisterReply(raw)} />
  )
}

type DecodeState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; node: ReactNode }

function CapsuleScreen({ prefix, capsule }: { prefix: CapsulePrefix; capsule: string }) {
  const [state, setState] = useState<DecodeState>({ phase: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ phase: 'loading' })
    decryptCapsule(capsule)
      .then((raw) => {
        if (!alive) return
        if (raw == null) setState({ phase: 'error' })
        else setState({ phase: 'ready', node: renderCapsule(prefix, raw) })
      })
      .catch(() => alive && setState({ phase: 'error' }))
    return () => {
      alive = false
    }
  }, [prefix, capsule])

  if (state.phase === 'loading') {
    return (
      <Screen header={<TopBar title="Opening your link" left={<BackBtn onClick={goHome} />} />}>
        <div className="max-w-md mx-auto">
          <Spinner label="Decrypting on your device…" />
          <p className="text-center text-[0.78rem] text-espresso/45 leading-snug px-6">
            This happens entirely in your browser. Nothing is sent anywhere.
          </p>
        </div>
      </Screen>
    )
  }

  if (state.phase === 'error') return <CapsuleError />

  return <>{state.node}</>
}

function CapsuleError() {
  return (
    <Screen header={<TopBar title="Couldn't open this link" left={<BackBtn onClick={goHome} />} />}>
      <div className="max-w-md mx-auto min-h-full flex flex-col justify-center pb-10">
        <div className="text-center">
          <div className="text-7xl mb-3">🔒</div>
          <h2 className="text-[1.5rem] leading-tight">This link won't unlock</h2>
          <p className="text-[0.9rem] text-espresso/60 leading-snug mt-2 px-4">
            It was cut off, edited, or copied incompletely. Because everything is encrypted and
            tamper-checked on your device, a link that isn't intact simply won't open — there's no
            half-version to show.
          </p>
        </div>
        <Well className="mt-6">
          <p className="text-[0.8rem] text-espresso/60 leading-snug">
            Ask your sibling to paste the <strong className="text-espresso">whole</strong> link again —
            the part after the <span className="num">#</span> matters, and chat apps sometimes trim
            long links.
          </p>
        </Well>
        <Btn tone="pink" block size="lg" className="mt-6" onClick={goHome}>
          Go to the home screen →
        </Btn>
      </div>
    </Screen>
  )
}

/* ── unsupported browser ─────────────────────────────────────────────────── */

function Unsupported() {
  return (
    <div className="min-h-full max-w-md mx-auto px-5 flex flex-col justify-center py-10 text-center">
      <div className="text-7xl mb-3">😕</div>
      <h1 className="text-[1.8rem] leading-tight">This browser is a bit too old</h1>
      <p className="text-[0.92rem] text-espresso/60 leading-snug mt-3">
        Rakhi Forge encrypts everything on your device using the Web Crypto API, and this browser
        doesn't provide it. Please open the link in a current version of Chrome, Safari, Firefox or
        Edge.
      </p>
      <Card className="mt-6 !p-4">
        <p className="text-[0.8rem] text-espresso/55 leading-snug">
          Nothing is lost — the link still holds all its data. It just needs a browser that can do the
          decryption locally.
        </p>
      </Card>
    </div>
  )
}

/* ── router ──────────────────────────────────────────────────────────────── */

function RouteView() {
  const route = useRoute()

  useEffect(() => {
    // Keep long capsule screens from starting scrolled halfway down.
    window.scrollTo(0, 0)
  }, [route])

  switch (route.name) {
    case 'sister-build':
      return <SisterBuild />
    case 'brother-defend':
      return <BrotherDefend />
    case 'wallet':
      return <Wallet />
    case 'privacy':
      return <Privacy />
    case 'capsule':
      return <CapsuleScreen key={`${route.prefix}:${route.capsule}`} prefix={route.prefix} capsule={route.capsule} />
    case 'home':
    default:
      return <Home />
  }
}

import { playBackgroundMusic } from './lib/audio'
import { AudioToggle } from './ui/AudioToggle'

export default function App() {
  useEffect(() => {
    const handleFirstInteraction = () => {
      playBackgroundMusic()
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
    window.addEventListener('click', handleFirstInteraction)
    window.addEventListener('touchstart', handleFirstInteraction)
    window.addEventListener('keydown', handleFirstInteraction)
    return () => {
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [])

  if (!cryptoSupported()) return <Unsupported />
  return (
    <WebGLGate>
      <AudioToggle />
      <RouteView />
      <Toaster />
    </WebGLGate>
  )
}
