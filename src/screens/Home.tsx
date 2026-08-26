/**
 * Home.tsx — the fork in the road. Two paths, one rakhi spinning between them,
 * and the privacy claim stated plainly because it is the whole architecture.
 */

import { useEffect, useState } from 'react'
import { go } from '../lib/route'
import { walletCount } from '../lib/storage'
import { defaultRakhi, THREADS, THREAD_META, type ThreadId } from '../lib/payload'
import { Stage, GroundShadow, Turntable, Bob } from '../three/Stage'
import { Rakhi3D } from '../three/Rakhi3D'
import { Sparkles } from '../three/Burst'
import { Btn, Card, Tag, useNoWebGL } from '../ui/kit'
import { CreatorFooter } from '../ui/CreatorFooter'

function HeroRakhi({ thread }: { thread: ThreadId }) {
  const noWebGL = useNoWebGL()

  if (noWebGL) {
    return (
      <div className="h-56 grid place-items-center text-7xl animate-bob" aria-hidden>
        🪢
      </div>
    )
  }

  return (
    <Stage className="h-56" cameraPosition={[0, 0.2, 4.6]} fov={40} touch="none">
      <Turntable autoSpin={0.4} tilt initialY={-0.3}>
        <Bob amount={0.06}>
          <Rakhi3D spec={{ ...defaultRakhi(), thread, gem: 'mandala' }} scale={0.92} />
        </Bob>
      </Turntable>
      <Sparkles count={26} radius={2.5} />
      <GroundShadow y={-1.35} radius={1.5} opacity={0.15} />
    </Stage>
  )
}

export function Home() {
  const [thread, setThread] = useState<ThreadId>('gold')
  const [vouchers, setVouchers] = useState(0)

  useEffect(() => setVouchers(walletCount()), [])

  // Cycle the hero thread so all four looks get seen before anyone picks one.
  useEffect(() => {
    const id = window.setInterval(() => {
      setThread((current) => THREADS[(THREADS.indexOf(current) + 1) % THREADS.length])
    }, 4200)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-full max-w-md mx-auto px-4 pt-8 pb-10 safe-b">
      <header className="text-center flex flex-col items-center">
        <img src="/logo.png" alt="anithor bond logo" className="w-20 h-20 object-contain mb-2 block" />
        <Tag tone="gold" className="mb-2">
          anithor.site
        </Tag>
        <h1 className="text-[2.5rem] leading-[1.05] font-display font-black">
          anithor <span className="text-gulabi">bond</span>
        </h1>
        <p className="font-display font-bold text-[1.1rem] text-espresso mt-1">
          Rakhi with Digital Love
        </p>
        <p className="text-[0.85rem] text-espresso/70 italic mt-0.5">
          A bond that protects, a love that connects
        </p>
      </header>

      <HeroRakhi thread={thread} />

      <div className="space-y-4 mt-2">
        {/* Flow 1: Sister initiates */}
        <Card className="!p-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🧵</span>
            <div className="min-w-0 flex-1">
              <Tag tone="sister">Flow 1 · Sister First</Tag>
              <h2 className="text-[1.3rem] leading-tight mt-1.5">I am the sister</h2>
              <p className="text-[0.85rem] text-espresso/60 leading-snug mt-1">
                Forge a 3D rakhi, choose your sweets, write your demand and send him the invoice.
              </p>
            </div>
          </div>
          <Btn tone="pink" block size="lg" className="mt-4" onClick={() => go('build')}>
            Forge a Rakhi →
          </Btn>
        </Card>

        {/* Flow 2: Brother initiates */}
        <Card className="!p-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🛡️</span>
            <div className="min-w-0 flex-1">
              <Tag tone="brother">Flow 2 · Pre-emptive Defense</Tag>
              <h2 className="text-[1.3rem] leading-tight mt-1.5">I am the brother</h2>
              <p className="text-[0.85rem] text-espresso/60 leading-snug mt-1">
                Lock your gift in a troll vault, force her into a signed contract, or let a
                fair-odds wheel decide before she can name a number.
              </p>
            </div>
          </div>
          <Btn tone="mint" block size="lg" className="mt-4" onClick={() => go('defend')}>
            Build a Defense →
          </Btn>
        </Card>
      </div>

      <button
        type="button"
        onClick={() => go('privacy')}
        className="w-full mt-5 text-left toy-card-flat !p-4 flex items-center gap-3 active:translate-y-[2px] transition-transform"
      >
        <span className="text-2xl">🔒</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-[0.95rem]">
            100% Encrypted &amp; Private
          </span>
          <span className="block text-[0.76rem] text-espresso/55 leading-snug">
            AES-GCM in your browser. No database, no login, no server ever sees it.
          </span>
        </span>
        <span className="text-espresso/35">›</span>
      </button>

      {vouchers > 0 && (
        <Btn tone="cream" block className="mt-4" onClick={() => go('wallet')}>
          🎟️ My Voucher Wallet ({vouchers})
        </Btn>
      )}

      <CreatorFooter />
    </div>
  )
}
