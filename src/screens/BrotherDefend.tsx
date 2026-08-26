/**
 * BrotherDefend.tsx — Flow 2, Step 1. The Shagun Defense & Troll Vault.
 *
 * The brother moves first, before any invoice can reach him. He picks one of
 * three pre-emptive defenses — a vault she has to physically tap open, a budget
 * contract with a hard cap, or an even-odds wheel that decides his liability by
 * luck — and ships it as an encrypted `#b=` link.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { goHome } from '../lib/route'
import { inr } from '../lib/money'
import {
  CONTRACT_TERM_SUGGESTIONS,
  emptyBrother,
  MEME_GIFS,
  memeCaption,
  memeEmoji,
  type BrotherPayload,
  type DefenseType,
  type WheelSlot,
} from '../lib/payload'
import { buildWheel, freshSeed, jackpotOdds, slotOdds } from '../lib/rng'
import { celebrate, tap as hapticTap, thud } from '../lib/haptics'
import { useTapCounter } from '../lib/gestures'
import { Bob, GroundShadow, Stage, Turntable } from '../three/Stage'
import { Vault3D } from '../three/Vault3D'
import { Contract3D } from '../three/Contract3D'
import { Wheel3D } from '../three/Wheel3D'
import {
  AmountField,
  BackBtn,
  Btn,
  Card,
  Chip,
  Field,
  HintPill,
  Meter,
  Screen,
  Sheet,
  Stepper,
  TextArea,
  toast,
  TopBar,
  useNoWebGL,
  Well,
} from '../ui/kit'
import { StatCard } from '../ui/bits'
import { Handoff, useCapsuleLink } from '../ui/Handoff'
import { CreatorFooter } from '../ui/CreatorFooter'
import { playMemeSong } from '../lib/audio'

const STEPS = ['Who', 'Defense', 'Send']

const DEFENSES: { id: DefenseType; name: string; blurb: string; emoji: string }[] = [
  {
    id: 'vault',
    name: 'The Shagun Vault',
    blurb: 'Lock the gift inside. She taps it open or gets nothing.',
    emoji: '🔐',
  },
  {
    id: 'contract',
    name: 'Budget Contract',
    blurb: 'A hard cap, signed and sealed, with non-negotiable clauses.',
    emoji: '📜',
  },
  {
    id: 'roulette',
    name: 'Early-Bird Roulette',
    blurb: 'Send the wheel first. Let luck set your liability.',
    emoji: '🎰',
  },
]

const CAP_PICKS = [1, 51, 101, 501]
const CEILING_PICKS = [501, 1100, 2100, 5100]

interface StatSpec {
  label: string
  value: string
  tone: 'gold' | 'pink' | 'mint' | 'sky'
  sub?: string
}

/** How brutal the tap count reads, in plain sibling terms. */
function tapVerdict(taps: number): string {
  if (taps <= 15) return 'Generous. Suspiciously generous.'
  if (taps < 50) return 'Standard sibling cruelty. She will manage.'
  if (taps < 90) return 'Her thumb will be filing a formal complaint.'
  return 'This is no longer a gift, it is a fitness test.'
}

/* ── 3D preview ──────────────────────────────────────────────────────────── */

function DefensePreview({
  draft,
  slots,
  tapProgress,
  tapPulse,
  tapOpen,
}: {
  draft: BrotherPayload
  slots: WheelSlot[]
  tapProgress: number
  tapPulse: number
  tapOpen: boolean
}) {
  if (draft.defenseType === 'vault') {
    return (
      <Stage className="h-64 shrink-0" cameraPosition={[0, 0.1, 5.4]} target={[0, 0.1, 0]} fov={40}>
        <Turntable autoSpin={0.16} tilt maxTilt={0.25} initialY={-0.1}>
          <Vault3D
            progress={tapProgress}
            open={tapOpen}
            tapPulse={tapPulse}
            label={draft.vault.mode === 'code' ? draft.vault.label || 'Shagun Vault' : 'Troll Vault'}
            rewardEmoji={draft.vault.mode === 'code' ? '🎁' : memeEmoji(draft.vault)}
            rewardCaption={
              draft.vault.mode === 'code'
                ? draft.vault.label || 'Gift Card'
                : memeCaption(draft.vault)
            }
            sealed
          />
        </Turntable>
        <GroundShadow y={-1.45} radius={1.9} opacity={0.16} />
      </Stage>
    )
  }

  if (draft.defenseType === 'contract') {
    return (
      <Stage className="h-64 shrink-0" cameraPosition={[0, 0, 5.4]} target={[0, 0, 0]} fov={40}>
        <Bob amount={0.04}>
          <Contract3D
            brotherName={draft.brotherName}
            budgetCap={draft.contract.budgetCap}
            terms={draft.contract.terms}
            highlightSeal
          />
        </Bob>
        <GroundShadow y={-1.75} radius={1.4} opacity={0.12} />
      </Stage>
    )
  }

  return (
    <Stage className="h-64 shrink-0" cameraPosition={[0.2, -0.4, 7.4]} target={[0.2, -0.4, 0]} fov={40}>
      <Wheel3D slots={slots} targetIndex={0} spinToken={0} showLever radius={1.85} />
    </Stage>
  )
}

/* ── contract clause row ─────────────────────────────────────────────────── */

function TermRow({
  index,
  term,
  onChange,
  onRemove,
}: {
  index: number
  term: string
  onChange: (next: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="num text-[0.9rem] text-gulabi-deep w-5 shrink-0 text-right">{index + 1}.</span>
      <input
        className="toy-input !py-2.5 !px-3 text-[0.85rem] flex-1 min-w-0"
        value={term}
        placeholder="What she must agree to"
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={`Remove clause ${index + 1}`}
        onClick={onRemove}
        className="shrink-0 w-9 h-9 rounded-xl border-[2.5px] border-clayline text-espresso/45 grid place-items-center active:translate-y-[2px]"
      >
        ✕
      </button>
    </div>
  )
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export function BrotherDefend() {
  const [draft, setDraft] = useState<BrotherPayload>(emptyBrother)
  const [step, setStep] = useState(0)
  const [ceiling, setCeiling] = useState(2100)
  const [termsSheet, setTermsSheet] = useState(false)
  const seed = useRef(freshSeed())
  const noWebGL = useNoWebGL()
  const { link, building, build } = useCapsuleLink('b')

  const patch = (next: Partial<BrotherPayload>) => setDraft((current) => ({ ...current, ...next }))
  const patchVault = (next: Partial<BrotherPayload['vault']>) =>
    setDraft((current) => ({ ...current, vault: { ...current.vault, ...next } }))
  const patchContract = (next: Partial<BrotherPayload['contract']>) =>
    setDraft((current) => ({ ...current, contract: { ...current.contract, ...next } }))

  const slots = useMemo(() => buildWheel(ceiling), [ceiling])
  const cleanTerms = useMemo(
    () => draft.contract.terms.map((t) => t.trim()).filter(Boolean).slice(0, 6),
    [draft.contract.terms],
  )

  /* The brother gets to feel his own lock before he inflicts it. */
  const demo = useTapCounter({
    target: Math.max(5, draft.vault.taps),
    onTap: hapticTap,
    onComplete: () => {
      celebrate()
      toast('That is the exact moment she gives up 🔐')
    },
  })

  useEffect(() => {
    if (!demo.complete) return
    const id = window.setTimeout(demo.reset, 2600)
    return () => window.clearTimeout(id)
  }, [demo.complete, demo.reset])

  const vaultDemoLive = step === 1 && draft.defenseType === 'vault' && !noWebGL

  const canAdvance = () => (step === 0 ? draft.brotherName.trim().length > 0 : true)

  const finish = async () => {
    if (!draft.brotherName.trim()) {
      toast('Add your name first', 'warn')
      setStep(0)
      return
    }
    if (draft.defenseType === 'vault' && draft.vault.mode === 'code' && !draft.vault.code.trim()) {
      toast('Put something in the vault — or switch it to a meme', 'warn')
      setStep(1)
      return
    }
    if (draft.defenseType === 'contract' && cleanTerms.length === 0) {
      toast('A contract with no clauses is just a gift', 'warn')
      setStep(1)
      return
    }

    const payload: BrotherPayload = {
      ...draft,
      vault: {
        ...draft.vault,
        code: draft.vault.code.trim(),
        label: draft.vault.label.trim() || 'Shagun Vault',
        memeText: draft.vault.memeText.trim(),
      },
      contract: { ...draft.contract, terms: cleanTerms },
      // Only the roulette branch needs a wheel, and the slots travel with the
      // link so a future tweak to buildWheel can't rewrite an old promise.
      roulette:
        draft.defenseType === 'roulette' ? { seed: seed.current, slots } : { seed: seed.current, slots: [] },
    }
    setDraft(payload)
    thud()
    await build(payload)
  }

  /* ── the link screen replaces everything once minted ────────────────────── */
  if (link) {
    const stats: StatSpec[] =
      draft.defenseType === 'vault'
        ? [
            { label: 'Taps to crack', value: String(draft.vault.taps), tone: 'mint' },
            {
              label: 'Inside',
              value: draft.vault.mode === 'code' ? '🎁' : memeEmoji(draft.vault),
              tone: 'gold',
              sub:
                draft.vault.mode === 'code'
                  ? draft.vault.label
                  : memeCaption(draft.vault).toLowerCase(),
            },
          ]
        : draft.defenseType === 'contract'
          ? [
              { label: 'Budget cap', value: inr(draft.contract.budgetCap), tone: 'mint' },
              {
                label: 'Clauses',
                value: String(cleanTerms.length),
                tone: 'gold',
                sub: 'Non-negotiable',
              },
            ]
          : [
              { label: 'Jackpot', value: inr(ceiling), tone: 'pink', sub: jackpotOdds(slots) },
              {
                label: 'Every slot',
                value: slotOdds(slots),
                tone: 'mint',
                sub: 'Equal odds, no rigging',
              },
            ]

    const blurb =
      draft.defenseType === 'vault'
        ? `${draft.sisterName || 'She'} has to forge and tie a rakhi before the vault will even accept a tap.`
        : draft.defenseType === 'contract'
          ? `${draft.sisterName || 'She'} can accept your cap — or reject it and send a Sibling Tax bill straight back.`
          : `${draft.sisterName || 'She'} pulls the lever, and whatever it lands on is what you owe. Sealed already.`

    return (
      <Screen
        header={
          <TopBar
            title="Defense armed"
            subtitle="Encrypted · ready to send"
            left={<BackBtn onClick={goHome} />}
          />
        }
      >
        <div className="max-w-md mx-auto pb-8">
          <Handoff
            link={link}
            tone="mint"
            title="Your defense is sealed"
            blurb={blurb}
            message={`${draft.brotherName} got ahead of Raksha Bandhan 😇 Open this before you send any bill:`}
            cta="Send Defense to Sister →"
          >
            <Card className="!p-4">
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <StatCard key={stat.label} {...stat} />
                ))}
              </div>
            </Card>
          </Handoff>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      header={
        <>
          <TopBar
            title="anithor bond"
            subtitle={`Rakhi with Digital Love · ${STEPS[step]}`}
            left={<BackBtn onClick={() => (step === 0 ? goHome() : setStep(step - 1))} />}
          />
          <Stepper steps={STEPS} current={step} />
        </>
      }
      footer={
        <div className="max-w-md mx-auto flex gap-3 pb-2">
          {step > 0 && (
            <Btn tone="cream" onClick={() => setStep(step - 1)} className="!px-5">
              ←
            </Btn>
          )}
          {step < 2 ? (
            <Btn
              tone="mint"
              block
              size="lg"
              onClick={() => {
                if (!canAdvance()) {
                  toast('She needs to know who is defending — add your name', 'warn')
                  return
                }
                setStep(step + 1)
              }}
            >
              Next: {STEPS[step + 1]} →
            </Btn>
          ) : (
            <Btn tone="mint" block size="lg" onClick={finish} disabled={building}>
              {building ? 'Encrypting…' : '🔒 Seal & Get Link'}
            </Btn>
          )}
        </div>
      }
    >
      <div className="max-w-md mx-auto pb-6">
        {/* ── live preview of the chosen defense ───────────────────────── */}
        {noWebGL ? (
          <div className="h-40 grid place-items-center text-6xl animate-bob" aria-hidden>
            {DEFENSES.find((d) => d.id === draft.defenseType)?.emoji}
          </div>
        ) : (
          <div className="relative shrink-0">
            <DefensePreview
              draft={draft}
              slots={slots}
              tapProgress={demo.progress}
              tapPulse={demo.pulse}
              tapOpen={demo.complete}
            />
            {vaultDemoLive && (
              <>
                <button
                  type="button"
                  aria-label="Tap to test the vault lock"
                  className="absolute inset-0 z-10"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    demo.tap()
                  }}
                />
                <div className="absolute left-0 right-0 bottom-1 flex justify-center pointer-events-none">
                  {demo.count === 0 ? (
                    <HintPill tone="ink" pulse>
                      👆 Tap the vault to feel your own lock
                    </HintPill>
                  ) : (
                    <div className="w-40">
                      <Meter
                        value={demo.progress}
                        tone={demo.complete ? 'mint' : 'gold'}
                        height={14}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 0: who + which defense ──────────────────────────────── */}
        {step === 0 && (
          <div className="mt-5 space-y-4">
            <Card className="space-y-3">
              <Field
                label="Your name"
                value={draft.brotherName}
                maxLength={40}
                placeholder="Susant"
                onChange={(event) => patch({ brotherName: event.target.value })}
              />
              <Field
                label="Sister's name"
                value={draft.sisterName}
                maxLength={40}
                placeholder="Sujita"
                hint="Optional. It does make the contract look more official."
                onChange={(event) => patch({ sisterName: event.target.value })}
              />
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-1">Pick your defense</h3>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                You are moving first. Whatever you choose, she cannot get past it without forging and
                tying a rakhi — that part is not optional.
              </p>
              <div className="space-y-2.5">
                {DEFENSES.map((defense) => (
                  <Chip
                    key={defense.id}
                    on={draft.defenseType === defense.id}
                    onClick={() => patch({ defenseType: defense.id })}
                    title={defense.name}
                    subtitle={defense.blurb}
                    emoji={defense.emoji}
                  />
                ))}
              </div>
            </Card>

            <Well>
              <p className="text-[0.78rem] text-espresso/55 leading-snug">
                Everything you set up here is rebuilt from scratch on her phone. Nothing is uploaded,
                and there is no copy of it anywhere except the link you are about to send.
              </p>
            </Well>
          </div>
        )}

        {/* ── Step 1a: the vault ───────────────────────────────────────── */}
        {step === 1 && draft.defenseType === 'vault' && (
          <div className="mt-5 space-y-4">
            <Card>
              <h3 className="text-[1.05rem] mb-1">What is actually inside</h3>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                She only finds out after the lock breaks. Choose your level of honesty.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Chip
                  on={draft.vault.mode === 'code'}
                  onClick={() => patchVault({ mode: 'code' })}
                  title="A real gift card"
                  subtitle="Amazon, Zomato, anything with a code"
                  emoji="🎁"
                />
                <Chip
                  on={draft.vault.mode === 'meme'}
                  onClick={() => patchVault({ mode: 'meme' })}
                  title="A meme. Only a meme."
                  subtitle="Zero rupees. Maximum betrayal."
                  emoji="🤡"
                />
              </div>

              {draft.vault.mode === 'code' ? (
                <div className="space-y-3 mt-3">
                  <Field
                    label="What is it"
                    value={draft.vault.label}
                    maxLength={50}
                    placeholder="Amazon Gift Card ₹500"
                    hint="Printed on the vault nameplate, so she can see what she is working for."
                    onChange={(event) => patchVault({ label: event.target.value })}
                  />
                  <Field
                    label="The code"
                    value={draft.vault.code}
                    maxLength={80}
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="AMZN-4K2P-99XY"
                    onChange={(event) => patchVault({ code: event.target.value })}
                  />
                  <p className="text-[0.74rem] text-espresso/50 leading-snug">
                    The code is encrypted inside the link and never reaches us — but anyone she
                    forwards that link to can open it too. Treat it like handing over the card.
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {MEME_GIFS.filter((meme) => meme.id !== 'custom').map((meme) => (
                      <div key={meme.id} className="flex flex-col gap-1">
                        <Chip
                          on={draft.vault.meme === meme.id}
                          onClick={() => patchVault({ meme: meme.id })}
                          title={meme.label}
                          emoji={meme.emoji}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            playMemeSong('meme', meme.id)
                          }}
                          className="text-[0.7rem] font-bold text-marigold hover:underline flex items-center justify-center gap-1 py-1 px-2 rounded bg-clayline/40 border border-marigold/30 active:scale-95 transition-transform"
                        >
                          🔊 Preview sound
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* The presets are jokes we wrote; this is the one he writes.
                      It spans the grid so it reads as an escape hatch rather
                      than a fifth canned option. */}
                  <Chip
                    className="w-full mt-2.5"
                    on={draft.vault.meme === 'custom'}
                    onClick={() => patchVault({ meme: 'custom' })}
                    title="Write my own"
                    subtitle="Your line, waiting inside the vault"
                    emoji="✍️"
                  />
                  {draft.vault.meme === 'custom' && (
                    <TextArea
                      className="mt-3"
                      label="Your message"
                      value={draft.vault.memeText}
                      maxLength={140}
                      rows={2}
                      placeholder="Sorry didi, I spent it on cricket."
                      hint={`${draft.vault.memeText.length}/140 · printed in capitals on the plate she finds inside, so keep it short.`}
                      onChange={(event) => patchVault({ memeText: event.target.value })}
                    />
                  )}
                  <p className="text-[0.74rem] text-espresso/50 leading-snug mt-2.5">
                    She will tap {draft.vault.taps} times for this. Consider your future carefully.
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="text-[1.05rem]">Cracking difficulty</h3>
                <span className="num text-[1.1rem] text-pista-deep">{draft.vault.taps} taps</span>
              </div>
              <input
                type="range"
                className="toy-range"
                min={5}
                max={120}
                step={5}
                value={draft.vault.taps}
                aria-label="Taps required to crack the vault"
                onChange={(event) => {
                  demo.reset()
                  patchVault({ taps: Number(event.target.value) })
                }}
              />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <StatCard
                  label="Taps required"
                  value={String(draft.vault.taps)}
                  tone="mint"
                  sub={`≈ ${Math.max(1, Math.ceil(draft.vault.taps / 4))}s of thumb work`}
                />
                <StatCard label="Your test run" value={`${demo.count}`} tone="gold" sub="Tap the vault above" />
              </div>
              <p className="text-[0.8rem] text-espresso/60 leading-snug mt-3 font-semibold">
                {tapVerdict(draft.vault.taps)}
              </p>
            </Card>
          </div>
        )}

        {/* ── Step 1b: the contract ────────────────────────────────────── */}
        {step === 1 && draft.defenseType === 'contract' && (
          <div className="mt-5 space-y-4">
            <Card>
              <h3 className="text-[1.05rem] mb-1">Maximum shagun</h3>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                Printed enormous, right in the middle of the contract. There is no revision clause.
              </p>
              <AmountField
                label="Hard cap"
                value={draft.contract.budgetCap}
                onChange={(value) => patchContract({ budgetCap: value })}
                hint="Traditional lowball: ₹101. Historic lowball: ₹1."
              />
              <div className="grid grid-cols-4 gap-2 mt-3">
                {CAP_PICKS.map((amount) => (
                  <Btn
                    key={amount}
                    tone={draft.contract.budgetCap === amount ? 'mint' : 'cream'}
                    size="sm"
                    onClick={() => patchContract({ budgetCap: amount })}
                  >
                    {inr(amount)}
                  </Btn>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="text-[1.05rem]">Binding clauses</h3>
                <span className="num text-[0.95rem] text-espresso/50">{cleanTerms.length}/6</span>
              </div>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                These get printed onto the sheet she has to accept. Keep them short and unreasonable.
              </p>

              <div className="space-y-2.5">
                {draft.contract.terms.map((term, i) => (
                  <TermRow
                    key={i}
                    index={i}
                    term={term}
                    onChange={(next) =>
                      patchContract({ terms: draft.contract.terms.map((t, j) => (j === i ? next : t)) })
                    }
                    onRemove={() =>
                      patchContract({ terms: draft.contract.terms.filter((_, j) => j !== i) })
                    }
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <Btn
                  tone="cream"
                  size="sm"
                  onClick={() => {
                    if (draft.contract.terms.length >= 6) {
                      toast('Six clauses is already a legal document', 'info')
                      return
                    }
                    patchContract({ terms: [...draft.contract.terms, ''] })
                  }}
                >
                  + Blank clause
                </Btn>
                <Btn tone="cream" size="sm" onClick={() => setTermsSheet(true)}>
                  💡 Ideas
                </Btn>
              </div>
            </Card>

            <Well>
              <p className="text-[0.78rem] text-espresso/60 leading-snug">
                She gets exactly two buttons: <strong className="text-espresso">Accept Terms</strong>{' '}
                or <strong className="text-espresso">Reject &amp; Apply Sibling Tax</strong>. If she
                rejects, her own bill comes back at you with a UPI request attached.
              </p>
            </Well>
          </div>
        )}

        {/* ── Step 1c: the early-bird roulette ─────────────────────────── */}
        {step === 1 && draft.defenseType === 'roulette' && (
          <div className="mt-5 space-y-4">
            <Card>
              <h3 className="text-[1.05rem] mb-1">Set the jackpot</h3>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                One slot pays this. The wheel is split into ten equal wedges, so it lands here
                exactly as often as anything else — {slotOdds(slots)} of the time.
              </p>
              <AmountField
                label="Jackpot amount"
                value={ceiling}
                onChange={(value) => setCeiling(Math.max(10, value))}
                hint="Pick a number you can actually pay — the odds are honest now."
              />
              <div className="grid grid-cols-4 gap-2 mt-3">
                {CEILING_PICKS.map((amount) => (
                  <Btn
                    key={amount}
                    tone={ceiling === amount ? 'mint' : 'cream'}
                    size="sm"
                    onClick={() => setCeiling(amount)}
                  >
                    {inr(amount)}
                  </Btn>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Jackpot odds"
                value={jackpotOdds(slots)}
                tone="pink"
                sub={inr(ceiling)}
              />
              <StatCard
                label="Every slot"
                value={slotOdds(slots)}
                tone="mint"
                sub="Ten equal wedges"
              />
            </div>

            <Card>
              <h3 className="text-[1.05rem] mb-3">What is on the wheel</h3>
              <div className="space-y-1.5">
                {slots.map((slot, i) => {
                  const total = slots.reduce((sum, s) => sum + s.weight, 0)
                  const pct = (slot.weight / total) * 100
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span
                        className={`num text-[0.9rem] w-24 shrink-0 ${
                          slot.tier === 3 ? 'text-gulabi-deep' : 'text-espresso/75'
                        }`}
                      >
                        {slot.label}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#f0e6da] overflow-hidden border-2 border-clayline">
                        <div
                          className={`h-full rounded-full ${
                            slot.tier === 3 ? 'bg-gulabi' : slot.tier === 0 ? 'bg-sky' : 'bg-marigold'
                          }`}
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                      <span className="num text-[0.78rem] text-espresso/45 w-12 text-right shrink-0">
                        {pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Well>
              <p className="text-[0.78rem] text-espresso/60 leading-snug">
                <strong className="text-espresso">Even you do not get to know.</strong> The result is
                sealed into the link the moment you send it, so both of your phones compute the same
                answer — and neither of you can reload your way to a better one.
              </p>
            </Well>
          </div>
        )}

        {/* ── Step 2: the note + what she will face ────────────────────── */}
        {step === 2 && (
          <div className="mt-5 space-y-4">
            <Card>
              <TextArea
                label="Message to her"
                value={draft.note}
                rows={4}
                maxLength={400}
                placeholder={`Happy Raksha Bandhan ${draft.sisterName || 'didi'}. Before you send me any invoice, read this.`}
                hint={`${draft.note.length}/400 · she reads this before the lock appears`}
                onChange={(event) => patch({ note: event.target.value })}
              />
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-3">She will have to</h3>
              <ol className="space-y-2.5">
                {[
                  'Forge a rakhi in 3D and tie it — the biometric lock will not open without one.',
                  draft.defenseType === 'vault'
                    ? `Drop the rakhi on the wax seal, then tap ${draft.vault.taps} times to crack the vault.`
                    : draft.defenseType === 'contract'
                      ? `Break the seal, then either accept your ${inr(draft.contract.budgetCap)} cap or reject it and bill you.`
                      : 'Break the seal, pull the lever, and live with whatever the wheel says.',
                  'Send the tied rakhi — and her verdict — back to you as one sealed link.',
                ].map((line, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="num text-[0.95rem] text-pista-deep shrink-0">{i + 1}</span>
                    <span className="text-[0.86rem] leading-snug text-espresso/75">{line}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-3">Final check</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Defense"
                  value={DEFENSES.find((d) => d.id === draft.defenseType)?.emoji ?? '🔐'}
                  tone="mint"
                  sub={DEFENSES.find((d) => d.id === draft.defenseType)?.name}
                />
                <StatCard
                  label={
                    draft.defenseType === 'vault'
                      ? 'Taps'
                      : draft.defenseType === 'contract'
                        ? 'Hard cap'
                        : 'Jackpot'
                  }
                  value={
                    draft.defenseType === 'vault'
                      ? String(draft.vault.taps)
                      : draft.defenseType === 'contract'
                        ? inr(draft.contract.budgetCap)
                        : inr(ceiling)
                  }
                  tone="gold"
                  sub={
                    draft.defenseType === 'contract'
                      ? `${cleanTerms.length} clause${cleanTerms.length === 1 ? '' : 's'}`
                      : draft.defenseType === 'roulette'
                        ? `${jackpotOdds(slots)} chance`
                        : draft.vault.mode === 'code'
                          ? draft.vault.label || 'Gift card'
                          : memeCaption(draft.vault).toLowerCase()
                  }
                />
              </div>
            </Card>

            {draft.defenseType === 'vault' && draft.vault.mode === 'code' && !draft.vault.code.trim() && (
              <Well>
                <p className="text-[0.8rem] text-gulabi-deep font-semibold leading-snug">
                  The vault is empty. Add a code on the previous step, or switch it to a meme and own
                  the decision.
                </p>
              </Well>
            )}
          </div>
        )}
        <CreatorFooter />
      </div>

      <Sheet
        open={termsSheet}
        onClose={() => setTermsSheet(false)}
        title="Clauses that hold up in court"
        footer={
          <Btn tone="cream" block onClick={() => setTermsSheet(false)}>
            Done
          </Btn>
        }
      >
        <div className="space-y-2.5">
          {CONTRACT_TERM_SUGGESTIONS.map((suggestion) => {
            const already = draft.contract.terms.includes(suggestion)
            return (
              <button
                key={suggestion}
                type="button"
                disabled={already || draft.contract.terms.length >= 6}
                onClick={() => {
                  patchContract({ terms: [...draft.contract.terms, suggestion] })
                  toast('Clause added 📜')
                }}
                className="w-full toy-card-flat !p-3.5 flex items-center gap-3 text-left disabled:opacity-40 active:translate-y-[2px]"
              >
                <span className="flex-1 text-[0.86rem] leading-snug">{suggestion}</span>
                <span className="text-espresso/35">{already ? '✔' : '+'}</span>
              </button>
            )
          })}
        </div>
      </Sheet>
    </Screen>
  )
}
