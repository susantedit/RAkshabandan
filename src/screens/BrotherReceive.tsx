/**
 * BrotherReceive.tsx — Flow 1, Step 2. He opens `#s=`.
 *
 * Gesture-gated on purpose: the aarti must be performed and the rakhi actually
 * tied before the invoice is even visible. The bill is the punchline, and you
 * don't get the punchline for free.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { goHome } from '../lib/route'
import { inr } from '../lib/money'
import {
  DEFAULT_DEDUCTIONS,
  sumApplied,
  THREAD_META,
  VOUCHER_DECK,
  type BrotherReplyPayload,
  type Deduction,
  type ResponseType,
  type SisterPayload,
  type Voucher,
} from '../lib/payload'
import { buildWheel, freshSeed, jackpotOdds, mulberry32, pickWeighted, slotOdds } from '../lib/rng'
import { useCircularDrag, useLongPress } from '../lib/gestures'
import { celebrate, heavy, nope, thud, tap as hapticTap } from '../lib/haptics'
import { GroundShadow, Stage, Turntable } from '../three/Stage'
import { Thali3D } from '../three/Thali3D'
import { Wrist3D } from '../three/Wrist3D'
import { Wheel3D } from '../three/Wheel3D'
import { Burst, Sparkles } from '../three/Burst'
import {
  AmountField,
  BackBtn,
  Btn,
  Card,
  Confetti,
  Field,
  HintPill,
  Meter,
  Screen,
  Sheet,
  Tag,
  toast,
  TopBar,
  useNoWebGL,
  Well,
} from '../ui/kit'
import { BillTable, QrUploadPanel, StatCard, VoiceNote } from '../ui/bits'
import { Handoff, useCapsuleLink } from '../ui/Handoff'
import { CreatorFooter } from '../ui/CreatorFooter'

type Phase = 'intro' | 'aarti' | 'tie' | 'reveal' | 'choose' | 'compose'

/* ── the aarti: drag the diya in a circle ────────────────────────────────── */

function AartiStage({ sister, onDone }: { sister: SisterPayload; onDone: () => void }) {
  const noWebGL = useNoWebGL()
  const drag = useCircularDrag({
    turns: 2.5,
    minRadius: 30,
    onRevolution: () => thud(),
    onComplete: () => {
      celebrate()
      toast('Aarti complete 🪔')
      window.setTimeout(onDone, 900)
    },
  })

  return (
    <div className="relative">
      {noWebGL ? (
        <div className="h-[19rem] grid place-items-center text-7xl" aria-hidden>
          🪔
        </div>
      ) : (
        <Stage
          className="h-[19rem]"
          cameraPosition={[0, 4.8, 4.6]}
          target={[0, 0.05, 0]}
          fov={34}
        >
          <Thali3D
            thali={sister.thali}
            rakhi={sister.rakhi}
            diyaAngle={-drag.angle}
            diyaLit
            highlightDiya={!drag.active && !drag.complete}
            scale={0.78}
          />
          <GroundShadow y={-0.42} radius={2} opacity={0.14} />
        </Stage>
      )}

      {/* Transparent gesture surface, centred on the plate. */}
      <div
        {...drag.bind}
        className="absolute inset-0 no-select"
        style={{ touchAction: 'none', cursor: drag.active ? 'grabbing' : 'grab' }}
        role="slider"
        aria-label="Drag in a circle to perform the aarti"
        aria-valuenow={Math.round(drag.progress * 100)}
      >
        {/* guide ring */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none">
          <circle
            cx="100"
            cy="100"
            r="62"
            fill="none"
            stroke="#2B2523"
            strokeOpacity={drag.complete ? 0 : 0.12}
            strokeWidth="2"
            strokeDasharray="5 6"
          />
          <circle
            cx="100"
            cy="100"
            r="62"
            fill="none"
            stroke="#FFB703"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${drag.progress * 389.5} 389.5`}
            transform="rotate(-90 100 100)"
            opacity={drag.complete ? 0 : 0.9}
          />
        </svg>
      </div>

      <div className="absolute left-0 right-0 bottom-1 flex justify-center pointer-events-none">
        {!drag.complete && (
          <HintPill tone="ink" pulse={!drag.active}>
            {drag.active ? 'Keep circling…' : '👆 Drag the diya in a circle'}
          </HintPill>
        )}
      </div>
    </div>
  )
}

/* ── the tie: long press ─────────────────────────────────────────────────── */

function TieStage({ sister, onDone }: { sister: SisterPayload; onDone: () => void }) {
  const noWebGL = useNoWebGL()
  const [burst, setBurst] = useState(0)
  const press = useLongPress({
    duration: 1600,
    onStart: () => hapticTap(),
    onComplete: () => {
      heavy()
      celebrate()
      setBurst((n) => n + 1)
      toast('Rakhi tied. It is legally binding now.')
      window.setTimeout(onDone, 1500)
    },
  })

  return (
    <div className="relative">
      {noWebGL ? (
        <div className="h-[20rem] grid place-items-center text-7xl" aria-hidden>
          🤝
        </div>
      ) : (
        /* Framed to hold the whole gesture: the rakhi starts in mid-air above
           the hand and its threads end up hanging a full unit below the wrist,
           so a tighter frustum clipped either the approach or the tails. */
        <Stage className="h-[20rem]" cameraPosition={[-0.15, 0.2, 4.95]} target={[-0.15, 0.2, 0]} fov={42}>
          <group>
            <Wrist3D rakhi={sister.rakhi} tie={press.complete ? 1 : press.progress} />
            <Burst
              trigger={burst}
              origin={[0.05, 0.31, 0.25]}
              count={190}
              power={3.6}
              colors={[0xffb703, 0xffe3a3, 0xffffff, 0xff4d6d]}
            />
            {press.complete && <Sparkles count={30} radius={2.2} />}
          </group>
          <GroundShadow y={-1.55} radius={1.9} opacity={0.11} />
        </Stage>
      )}

      <div
        {...press.bind}
        className="absolute inset-0 no-select"
        style={{ touchAction: 'none' }}
        role="button"
        aria-label="Press and hold to tie the rakhi"
      />

      {/* The hint and meter sit *below* the canvas, not floated over its bottom
          edge. The rakhi's threads hang the better part of a world unit under the
          wrist once it is tied, and overlaying the pill there cut them in half. */}
      <div className="px-6 pt-1 pointer-events-none">
        {!press.complete ? (
          <>
            <div className="flex justify-center mb-2">
              <HintPill tone="gold" pulse={!press.active}>
                {press.active ? 'Hold it…' : '👆 Press & hold to tie'}
              </HintPill>
            </div>
            <Meter value={press.progress} tone="gold" height={14} />
          </>
        ) : (
          <div className="flex justify-center">
            <HintPill tone="mint">Tied ✔</HintPill>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── the flip: rakhi turns over into the invoice ─────────────────────────── */

function FlipReveal({ sister, onFlipped }: { sister: SisterPayload; onFlipped: () => void }) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setFlipped(true)
      thud()
      window.setTimeout(onFlipped, 900)
    }, 1100)
    return () => window.clearTimeout(id)
  }, [onFlipped])

  return (
    <div className="py-6" style={{ perspective: '1200px' }}>
      <div
        className="relative mx-auto w-full max-w-xs h-52"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 900ms cubic-bezier(0.5, 0, 0.3, 1)',
          transform: `rotateY(${flipped ? 180 : 0}deg)`,
        }}
      >
        <div
          className="absolute inset-0 toy-card grid place-items-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <div className="text-5xl mb-2">{THREAD_META[sister.rakhi.thread].emoji}</div>
            <p className="font-display font-bold text-[1.05rem]">Rakhi secured</p>
            <p className="text-[0.8rem] text-espresso/50">{THREAD_META[sister.rakhi.thread].name}</p>
          </div>
        </div>
        <div
          className="absolute inset-0 toy-card grid place-items-center !bg-gulabi"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-center text-white">
            <div className="text-4xl mb-1">🧾</div>
            <p className="font-display font-black text-[1.3rem] tracking-wide">SIBLING TAX</p>
            <p className="text-[0.82rem] opacity-85">Invoice attached. Of course it is.</p>
          </div>
        </div>
      </div>
      <p className="text-center text-[0.78rem] text-espresso/45 mt-4">
        {flipped ? 'Reading the fine print…' : 'Something is written on the back…'}
      </p>
    </div>
  )
}

/* ── counter-offer composers ─────────────────────────────────────────────── */

function RouletteComposer({
  demand,
  slots,
}: {
  demand: number
  slots: ReturnType<typeof buildWheel>
}) {
  const noWebGL = useNoWebGL()
  return (
    <div className="space-y-4">
      {!noWebGL && (
        <Stage className="h-64" cameraPosition={[0.2, -0.4, 7.4]} target={[0.2, -0.4, 0]} fov={40}>
          <Wheel3D slots={slots} targetIndex={0} spinToken={0} showLever radius={1.85} />
        </Stage>
      )}
      <Card>
        <h3 className="text-[1.08rem] mb-1">Shagun Roulette</h3>
        <p className="text-[0.85rem] text-espresso/60 leading-snug">
          Let fate decide. Her full <span className="num">{inr(demand)}</span> sits on the wheel as a
          jackpot slot, alongside nine other outcomes — and every wedge is exactly the same size.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <StatCard label="Jackpot odds" value={jackpotOdds(slots)} tone="pink" sub="Her full demand" />
          <StatCard label="Every slot" value={slotOdds(slots)} tone="mint" sub="Genuinely fair" />
        </div>
        <Well className="mt-3">
          <p className="text-[0.78rem] text-espresso/60 leading-snug">
            The result is locked into the link the moment you send it, so neither of you can reload
            the page to reroll it. She pulls the lever; the outcome was already sealed here.
          </p>
        </Well>
      </Card>
    </div>
  )
}

function AuditComposer({
  demand,
  deductions,
  setDeductions,
}: {
  demand: number
  deductions: Deduction[]
  setDeductions: (next: Deduction[]) => void
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState(300)
  const applied = sumApplied(deductions)
  const payable = Math.max(0, demand - applied)

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-[1.08rem] mb-1">Tax Audit Deduction</h3>
        <p className="text-[0.85rem] text-espresso/60 leading-snug mb-3">
          Every grievance is a legitimate write-off. Slide to claim what you are owed.
        </p>

        <div className="space-y-4">
          {deductions.map((deduction, i) => (
            <div key={`${deduction.label}-${i}`}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-[0.84rem] leading-snug flex-1">{deduction.label}</span>
                <span className="num text-[0.95rem] text-gulabi-deep shrink-0">
                  −{inr(deduction.applied)}
                </span>
              </div>
              <input
                type="range"
                className="toy-range"
                min={0}
                max={deduction.amt}
                step={deduction.amt > 500 ? 50 : 25}
                value={deduction.applied}
                aria-label={deduction.label}
                onChange={(event) =>
                  setDeductions(
                    deductions.map((d, j) =>
                      j === i ? { ...d, applied: Number(event.target.value) } : d,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Btn tone="cream" size="sm" onClick={() => setCustomOpen(true)}>
            + Add grievance
          </Btn>
          <Btn
            tone="cream"
            size="sm"
            onClick={() => {
              setDeductions(deductions.map((d) => ({ ...d, applied: d.amt })))
              thud()
            }}
          >
            Claim everything
          </Btn>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Her demand" value={inr(demand)} tone="pink" />
          <StatCard label="Total deducted" value={`−${inr(applied)}`} tone="sky" />
        </div>
        <div className="mt-3 p-4 rounded-[20px] bg-pista/15 border-[3px] border-pista">
          <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-pista-deep">
            Final settlement, post-audit
          </p>
          <p className="num text-[2.1rem] leading-tight text-pista-deep">{inr(payable)}</p>
        </div>
        {payable === 0 && (
          <p className="text-[0.78rem] text-gulabi-deep font-semibold mt-2.5 leading-snug">
            You have audited her down to zero. This will not go unpunished.
          </p>
        )}
      </Card>

      <Sheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add a grievance"
        footer={
          <Btn
            block
            onClick={() => {
              if (!label.trim()) {
                toast('Name the crime', 'warn')
                return
              }
              setDeductions([...deductions, { label: label.trim(), amt: amount, applied: amount }])
              setLabel('')
              setAmount(300)
              setCustomOpen(false)
              toast('Grievance filed')
            }}
          >
            File it
          </Btn>
        }
      >
        <div className="space-y-3">
          <Field
            label="What did she do"
            value={label}
            maxLength={90}
            placeholder="Called me short in front of guests"
            onChange={(event) => setLabel(event.target.value)}
          />
          <AmountField label="Damages claimed" value={amount} onChange={setAmount} max={99999} />
        </div>
      </Sheet>
    </div>
  )
}

function VoucherComposer({
  picked,
  setPicked,
  brotherName,
}: {
  picked: string[]
  setPicked: (next: string[]) => void
  brotherName: string
}) {
  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((p) => p !== id))
    else if (picked.length >= 3) {
      nope()
      toast('Three vouchers is the legal maximum', 'info')
    } else setPicked([...picked, id])
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-[1.08rem] mb-1">Duty Voucher Deck</h3>
        <p className="text-[0.85rem] text-espresso/60 leading-snug mb-3">
          Pay in labour instead of cash. Pick up to three — they get signed in your name and saved
          into her phone's wallet, permanently.
        </p>
        <div className="space-y-2.5">
          {VOUCHER_DECK.map((voucher) => {
            const on = picked.includes(voucher.id)
            return (
              <button
                key={voucher.id}
                type="button"
                onClick={() => toggle(voucher.id)}
                data-on={on}
                className="w-full toy-chip !flex-row !items-center gap-3 text-left"
              >
                <span className="text-2xl leading-none shrink-0">{voucher.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-[0.9rem] leading-tight">
                    {voucher.title}
                  </span>
                  <span className="block text-[0.74rem] text-espresso/55 leading-snug">
                    {voucher.note}
                  </span>
                </span>
                <span className={`text-lg shrink-0 ${on ? 'text-pista' : 'text-espresso/20'}`}>
                  {on ? '✔' : '+'}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Well>
        <p className="text-[0.8rem] text-espresso/60 leading-snug">
          Signed by <strong className="text-espresso">{brotherName || 'you'}</strong>. Once she
          redeems one, that's it — the wallet remembers.
        </p>
      </Well>
    </div>
  )
}

import { IconAudit, IconCheck, IconRoulette, IconVoucher } from '../ui/icons'

/* ── screen ──────────────────────────────────────────────────────────────── */

export function BrotherReceive({ sister }: { sister: SisterPayload }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [choice, setChoice] = useState<ResponseType | null>('roulette')
  const [brotherName, setBrotherName] = useState(sister.brotherName)
  const [note, setNote] = useState('')
  const [upiId, setUpiId] = useState('')
  const [upiName, setUpiName] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [deductions, setDeductions] = useState<Deduction[]>(() =>
    DEFAULT_DEDUCTIONS.map((d) => ({ ...d })),
  )
  const [picked, setPicked] = useState<string[]>(['icecream', 'blame'])
  const [confetti, setConfetti] = useState(0)
  const { link, building, build } = useCapsuleLink('br')

  const seed = useRef(freshSeed())
  const slots = useMemo(() => buildWheel(sister.demandAmt), [sister.demandAmt])
  const noWebGL = useNoWebGL()

  const bill = sister.bill
  const demand = sister.demandAmt

  useEffect(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll('.scroll-y').forEach((el) => {
      el.scrollTop = 0
    })
    if (phase === 'reveal') setConfetti((n) => n + 1)
  }, [phase])

  const send = async () => {
    if (!choice) return
    const chosenVouchers: Voucher[] =
      choice === 'voucher'
        ? VOUCHER_DECK.filter((v) => picked.includes(v.id)).map((v) => ({ ...v }))
        : []

    if (choice === 'voucher' && chosenVouchers.length === 0) {
      toast('Pick at least one voucher', 'warn')
      return
    }

    // The roulette outcome is derived from the seed now, so it is identical on
    // her device and cannot be rerolled by reloading.
    const rouletteIndex = pickWeighted(slots, mulberry32(seed.current))
    const finalPayout =
      choice === 'roulette'
        ? slots[rouletteIndex]?.amt ?? 0
        : choice === 'audit'
          ? Math.max(0, demand - sumApplied(deductions))
          : 0

    const payload: BrotherReplyPayload = {
      v: 1,
      kind: 'br',
      sister,
      brotherName: brotherName.trim() || 'Your Brother',
      responseType: choice,
      seed: seed.current,
      slots: choice === 'roulette' ? slots : [],
      deductions: choice === 'audit' ? deductions.filter((d) => d.applied > 0) : [],
      finalPayout,
      vouchers: chosenVouchers,
      note: note.trim(),
      upiId: upiId.trim(),
      upiName: upiName.trim() || brotherName.trim(),
      qrImage,
    }

    thud()
    await build(payload)
  }

  /* ── link minted ────────────────────────────────────────────────────────── */
  if (link) {
    const labels: Record<ResponseType, string> = {
      roulette: 'Shagun Roulette',
      audit: 'Tax Audit Deduction',
      voucher: 'Duty Voucher Deck',
    }
    return (
      <Screen
        header={
          <TopBar
            title="Counter-offer sealed"
            subtitle="Encrypted · ready to send"
            left={<BackBtn onClick={goHome} />}
          />
        }
      >
        <div className="max-w-md mx-auto pb-8">
          <Handoff
            link={link}
            tone="mint"
            title="Your defense is ready"
            blurb={`${sister.sisterName} opens this and finds out what you did to her invoice.`}
            message={`${brotherName || 'Your brother'} has responded to your Sibling Tax 🧾`}
            cta="Send Counter-Offer to Sister →"
          >
            <Card className="!p-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Response" value={choice ? labels[choice] : '—'} tone="mint" />
                <StatCard
                  label="She asked for"
                  value={inr(demand)}
                  tone="pink"
                  sub={`${bill.length} line items`}
                />
              </div>
            </Card>
          </Handoff>
        </div>
      </Screen>
    )
  }

  /* ── intro ──────────────────────────────────────────────────────────────── */
  if (phase === 'intro') {
    return (
      <Screen>
        <div className="max-w-md mx-auto min-h-full flex flex-col justify-center py-8">
          <div className="text-center">
            <Tag tone="sister">Incoming rakhi</Tag>
            <h1 className="text-[2rem] leading-tight mt-3">
              {sister.sisterName} sent you
              <br />a rakhi
            </h1>
            <p className="text-[0.9rem] text-espresso/60 leading-snug mt-2 px-4">
              And a thali. Perform the aarti, tie the rakhi, and only then will you find out what
              this is going to cost you.
            </p>
          </div>

          {noWebGL ? (
            <div className="h-56 grid place-items-center text-7xl animate-bob" aria-hidden>
              🪔
            </div>
          ) : (
            /* Pulled back and narrowed: at the old framing the plate was wider
               than the frustum, so it got shaved off at the canvas edges and its
               bottom rim disappeared behind the button below. */
            <Stage
              className="h-64 my-2"
              cameraPosition={[0, 4.8, 4.6]}
              target={[0, 0.05, 0]}
              fov={34}
            >
              <Turntable autoSpin={0.3} tilt maxTilt={0.18} initialY={-0.5}>
                <Thali3D thali={sister.thali} rakhi={sister.rakhi} scale={0.78} />
              </Turntable>
              <GroundShadow y={-0.42} radius={2} opacity={0.14} />
            </Stage>
          )}

          <div className="space-y-3 mt-2">
            <Btn tone="pink" block size="lg" onClick={() => setPhase('aarti')}>
              Begin the Aarti →
            </Btn>
            <p className="text-center text-[0.74rem] text-espresso/45 leading-snug px-4">
              🔒 This rakhi was encrypted in her browser and decrypted in yours. Nothing about it
              exists on any server.
            </p>
          </div>
        </div>
      </Screen>
    )
  }

  /* ── aarti ──────────────────────────────────────────────────────────────── */
  if (phase === 'aarti') {
    return (
      <Screen header={<TopBar title="The Aarti" subtitle="Circle the diya, twice around" />}>
        <div className="max-w-md mx-auto pb-8">
          <AartiStage sister={sister} onDone={() => setPhase('tie')} />
          <Card className="mt-2">
            <p className="text-[0.86rem] text-espresso/65 leading-snug">
              Hold the glowing diya and move it in a slow circle around the thali. Two and a half
              full rotations completes the ritual — going backwards undoes it, so don't get clever.
            </p>
          </Card>
          <button
            type="button"
            onClick={() => setPhase('tie')}
            className="w-full mt-3 text-[0.76rem] text-espresso/35 underline underline-offset-2"
          >
            Skip the ritual (she will know)
          </button>
        </div>
      </Screen>
    )
  }

  /* ── tie ────────────────────────────────────────────────────────────────── */
  if (phase === 'tie') {
    return (
      <Screen header={<TopBar title="Tie the Rakhi" subtitle="Press and hold your wrist" />}>
        <div className="max-w-md mx-auto pb-8">
          <TieStage sister={sister} onDone={() => setPhase('reveal')} />
          <Card className="mt-2">
            <p className="text-[0.86rem] text-espresso/65 leading-snug">
              Press and hold anywhere on the wrist for a second and a half. The thread cinches, the
              knot tightens, and your obligations begin.
            </p>
          </Card>
        </div>
      </Screen>
    )
  }

  /* ── reveal ─────────────────────────────────────────────────────────────── */
  if (phase === 'reveal') {
    return (
      <Screen
        footer={
          <div className="max-w-md mx-auto pb-2">
            <Btn tone="mint" block size="lg" onClick={() => setPhase('choose')}>
              Fight back →
            </Btn>
          </div>
        }
      >
        <Confetti fire={confetti} />
        <div className="max-w-md mx-auto pb-6">
          <FlipReveal sister={sister} onFlipped={() => undefined} />

          {sister.wishes && (
            <Card className="mb-4">
              <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mb-2">
                From {sister.sisterName}
              </p>
              {sister.voiceNote ? (
                <>
                  <VoiceNote text={sister.wishes} speaker={sister.sisterName} autoPlay />
                  <p className="text-[0.84rem] text-espresso/70 leading-relaxed mt-3 whitespace-pre-wrap">
                    {sister.wishes}
                  </p>
                </>
              ) : (
                <p className="text-[0.9rem] text-espresso/75 leading-relaxed whitespace-pre-wrap">
                  {sister.wishes}
                </p>
              )}
            </Card>
          )}

          <Card>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h3 className="text-[1.1rem]">Sibling Tax Invoice</h3>
              <Tag tone="sister">Unpaid</Tag>
            </div>
            <BillTable lines={bill} total={demand} totalLabel="Amount demanded" />
          </Card>

          <div className="mt-4 p-5 rounded-[24px] bg-gulabi border-[3px] border-espresso shadow-[0_8px_0_var(--color-espresso)] text-center text-white">
            <p className="font-display font-bold uppercase tracking-wide text-[0.72rem] opacity-85">
              Total demanded
            </p>
            <p className="num text-[2.6rem] leading-tight">{inr(demand)}</p>
            <p className="text-[0.78rem] opacity-85 mt-0.5">Due immediately, allegedly</p>
          </div>
        </div>
      </Screen>
    )
  }

  /* ── choose a counter-action ────────────────────────────────────────────── */
  if (phase === 'choose') {
    const options: { id: ResponseType; icon: React.ReactNode; title: string; blurb: string }[] = [
      {
        id: 'roulette',
        icon: <IconRoulette size={26} className="text-marigold" />,
        title: 'Shagun Roulette',
        blurb: `Put her ${inr(demand)} on a wheel where it is a ${jackpotOdds(slots)} jackpot. She spins. Fate decides.`,
      },
      {
        id: 'audit',
        icon: <IconAudit size={26} className="text-gulabi" />,
        title: 'Tax Audit Deduction',
        blurb: 'Line-item every hoodie she stole and deduct it from the bill. With sliders.',
      },
      {
        id: 'voucher',
        icon: <IconVoucher size={26} className="text-pista" />,
        title: 'Duty Voucher Deck',
        blurb: 'Pay in signed favours instead of money. Saved to her wallet forever.',
      },
    ]

    return (
      <Screen
        header={<TopBar title="anithor bond" subtitle={`Rakhi with Digital Love · She wants ${inr(demand)}`} />}
        footer={
          <div className="max-w-md mx-auto pb-2">
            <Btn
              tone="mint"
              block
              size="lg"
              disabled={!choice}
              onClick={() => {
                if (!choice) return
                setPhase('compose')
              }}
            >
              {choice ? 'Set it up →' : 'Pick a defense'}
            </Btn>
          </div>
        }
      >
        <div className="max-w-md mx-auto pb-6 space-y-4">
          <Card>
            <Field
              label="Your name"
              value={brotherName}
              maxLength={40}
              placeholder="Rohan"
              hint="It goes on the counter-offer, and on the vouchers if you sign any."
              onChange={(event) => setBrotherName(event.target.value)}
            />
          </Card>

          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                hapticTap()
                setChoice(option.id)
              }}
              className={`w-full text-left toy-card !p-4 flex gap-3.5 items-start transition-all ${
                choice === option.id ? '!border-pista !shadow-[0_10px_0_var(--color-pista-deep)]' : ''
              }`}
            >
              <span className="p-2 rounded-xl bg-clayline/30 shrink-0">{option.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-bold text-[1.02rem] leading-tight">
                  {option.title}
                </span>
                <span className="block text-[0.82rem] text-espresso/65 leading-snug mt-1">
                  {option.blurb}
                </span>
              </span>
              <span className={`shrink-0 pt-1 ${choice === option.id ? 'text-pista' : 'text-espresso/20'}`}>
                {choice === option.id ? <IconCheck size={20} /> : <span className="text-xl">›</span>}
              </span>
            </button>
          ))}
        </div>
      </Screen>
    )
  }

  /* ── compose the chosen response ────────────────────────────────────────── */
  return (
    <Screen
      header={
        <TopBar
          title="Build the counter-offer"
          subtitle={`Against ${inr(demand)}`}
          left={<BackBtn onClick={() => setPhase('choose')} />}
        />
      }
      footer={
        <div className="max-w-md mx-auto pb-2">
          <Btn tone="mint" block size="lg" onClick={send} disabled={building}>
            {building ? 'Encrypting…' : '🔒 Seal & Get Link'}
          </Btn>
        </div>
      }
    >
      <div className="max-w-md mx-auto pb-6 space-y-4">
        {choice === 'roulette' && <RouletteComposer demand={demand} slots={slots} />}
        {choice === 'audit' && (
          <AuditComposer demand={demand} deductions={deductions} setDeductions={setDeductions} />
        )}
        {choice === 'voucher' && (
          <VoucherComposer picked={picked} setPicked={setPicked} brotherName={brotherName} />
        )}

        <Card>
          <Field
            label="A note for her"
            value={note}
            maxLength={200}
            placeholder="Nothing personal. It's just business."
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>

        <QrUploadPanel
          qrImage={qrImage}
          onChange={(img) => setQrImage(img)}
        />

        <Card>
          <Field
            label="Your UPI ID (Optional)"
            value={upiId}
            maxLength={120}
            placeholder="susant@upi"
            onChange={(event) => setUpiId(event.target.value)}
          />
        </Card>

        <Well>
          <div className="flex items-start gap-2.5">
            <span>🪢</span>
            <p className="text-[0.78rem] text-espresso/60 leading-snug">
              Her rakhi, thali and invoice travel onward inside your reply, so she sees the whole
              exchange in one link — still encrypted, still nowhere but the URL.
            </p>
          </div>
        </Well>
        <CreatorFooter />
      </div>
    </Screen>
  )
}
