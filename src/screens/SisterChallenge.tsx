/**
 * SisterChallenge.tsx — Flow 2, Step 2. She opens `#b=`.
 *
 * His defense is locked behind a "biometric" gate: she cannot touch the vault,
 * contract or wheel until she has forged a rakhi and tied it, then dropped it on
 * the seal. Only then does the actual interaction unlock, and her verdict travels
 * back as `#sr=`.
 */

import { useMemo, useRef, useState } from 'react'
import { goHome } from '../lib/route'
import { inr } from '../lib/money'
import {
  defaultRakhi,
  DEFAULT_BILL,
  GEM_META,
  GEMS,
  memeCaption,
  memeEmoji,
  sumBill,
  THREAD_META,
  THREADS,
  type BillLine,
  type BrotherPayload,
  type GemId,
  type RakhiSpec,
  type SisterReplyPayload,
  type ThreadId,
} from '../lib/payload'
import { buildWheel, jackpotOdds, mulberry32, pickWeighted } from '../lib/rng'
import { isValidVpa } from '../lib/upi'
import { useDragToTarget, useLeverPull, useLongPress, useTapCounter } from '../lib/gestures'
import { celebrate, heavy, nope, tap as hapticTap, thud } from '../lib/haptics'
import type { StorySpec } from '../lib/story'
import { GroundShadow, Stage, Turntable } from '../three/Stage'
import { Rakhi3D } from '../three/Rakhi3D'
import { Wrist3D } from '../three/Wrist3D'
import { Vault3D } from '../three/Vault3D'
import { Contract3D } from '../three/Contract3D'
import { Wheel3D } from '../three/Wheel3D'
import { Burst, Sparkles } from '../three/Burst'
import {
  BackBtn,
  Btn,
  Card,
  Chip,
  Confetti,
  CountUp,
  Field,
  HintPill,
  Meter,
  Screen,
  Tag,
  TextArea,
  toast,
  TopBar,
  useNoWebGL,
  Well,
} from '../ui/kit'
import { BillTable, QrUploadPanel, StatCard, StoryCardButton, UpiPanel } from '../ui/bits'
import { Handoff, useCapsuleLink } from '../ui/Handoff'
import { playBlessSong, playMemeSong } from '../lib/audio'
import { CreatorFooter } from '../ui/CreatorFooter'

type Phase = 'intro' | 'forge' | 'tie' | 'seal' | 'act' | 'compose'

const REACTION_PRESETS: Record<BrotherPayload['defenseType'], string[]> = {
  vault: ['Vault Cracker Certified', 'Worth every tap', 'That was rigged', 'Cracked it, obviously'],
  contract: ['Terms accepted, grudgingly', 'Rejected. Pay the tax.', 'Nice try, bhai', 'Fine. This once.'],
  roulette: ['Blessed by the wheel', 'The wheel has spoken', 'Robbed by fate', 'I demand a recount'],
}

/* ── forge: customize her rakhi ──────────────────────────────────────────── */

function ForgeStage({
  rakhi,
  setRakhi,
}: {
  rakhi: RakhiSpec
  setRakhi: (next: RakhiSpec) => void
}) {
  const noWebGL = useNoWebGL()
  return (
    <div className="space-y-4">
      {noWebGL ? (
        <div className="h-48 grid place-items-center text-6xl animate-bob" aria-hidden>
          {THREAD_META[rakhi.thread].emoji}
        </div>
      ) : (
        <Stage className="h-48 shrink-0" cameraPosition={[0, 0.2, 4.4]} fov={40}>
          <Turntable autoSpin={0.5} tilt initialY={-0.2}>
            <Rakhi3D spec={rakhi} scale={0.9} />
          </Turntable>
          <Sparkles count={16} radius={2.2} />
          <GroundShadow y={-1.3} radius={1.4} />
        </Stage>
      )}

      <Card>
        <h3 className="text-[1.05rem] mb-3">Thread</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {THREADS.map((id: ThreadId) => (
            <Chip
              key={id}
              on={rakhi.thread === id}
              onClick={() => setRakhi({ ...rakhi, thread: id })}
              title={THREAD_META[id].name}
              subtitle={THREAD_META[id].blurb}
              swatch={THREAD_META[id].swatch}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-[1.05rem] mb-3">Centrepiece</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {GEMS.map((id: GemId) => (
            <Chip
              key={id}
              on={rakhi.gem === id}
              onClick={() => setRakhi({ ...rakhi, gem: id })}
              title={GEM_META[id].name}
              subtitle={GEM_META[id].blurb}
              emoji={GEM_META[id].emoji}
            />
          ))}
        </div>
        {rakhi.gem === 'monogram' && (
          <Field
            className="mt-3"
            label="Engraved initial"
            value={rakhi.monogram}
            maxLength={2}
            placeholder="R"
            onChange={(event) =>
              setRakhi({ ...rakhi, monogram: event.target.value.toUpperCase().slice(0, 2) || 'R' })
            }
          />
        )}
      </Card>
    </div>
  )
}

/* ── tie: long-press to tie her rakhi ────────────────────────────────────── */

function TieStage({ rakhi, onDone }: { rakhi: RakhiSpec; onDone: () => void }) {
  const noWebGL = useNoWebGL()
  const [burst, setBurst] = useState(0)
  const press = useLongPress({
    duration: 1600,
    onStart: () => hapticTap(),
    onComplete: () => {
      heavy()
      celebrate()
      setBurst((n) => n + 1)
      toast('Rakhi tied. The lock recognises you now.')
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
        /* Framed to hold the whole gesture — the rakhi starts in mid-air and
           its threads end up hanging a full unit below the wrist. */
        <Stage className="h-[20rem]" cameraPosition={[-0.15, 0.2, 4.95]} target={[-0.15, 0.2, 0]} fov={42}>
          <group>
            <Wrist3D rakhi={rakhi} tie={press.complete ? 1 : press.progress} />
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

/* ── seal: drag the tied rakhi onto his seal ─────────────────────────────── */

function SealDrop({
  brother,
  rakhi,
  slots,
  onDropped,
}: {
  brother: BrotherPayload
  rakhi: RakhiSpec
  slots: ReturnType<typeof buildWheel>
  onDropped: () => void
}) {
  const noWebGL = useNoWebGL()
  const stageRef = useRef<HTMLDivElement>(null)

  const drag = useDragToTarget({
    radius: 120,
    getTarget: () => {
      const rect = stageRef.current?.getBoundingClientRect()
      if (!rect) return null
      // The seal sits low-and-right of centre on both the vault and the contract.
      return { x: rect.left + rect.width * 0.6, y: rect.top + rect.height * 0.62 }
    },
    onDrop: () => {
      heavy()
      celebrate()
      toast('Seal broken. It is unlocked.')
      window.setTimeout(onDropped, 900)
    },
  })

  return (
    <div className="relative" ref={stageRef}>
      {noWebGL ? (
        <div className="h-[19rem] grid place-items-center text-7xl" aria-hidden>
          {brother.defenseType === 'contract' ? '📜' : brother.defenseType === 'roulette' ? '🎰' : '🔐'}
        </div>
      ) : (
        <Stage
          className="h-[19rem]"
          cameraPosition={
            brother.defenseType === 'vault'
              ? [0, 0.1, 5.4]
              : brother.defenseType === 'contract'
                ? [0, 0, 5.4]
                : [0.2, -0.4, 7.4]
          }
          target={
            brother.defenseType === 'vault'
              ? [0, 0.1, 0]
              : brother.defenseType === 'contract'
                ? [0, 0, 0]
                : [0.2, -0.4, 0]
          }
          fov={40}
        >
          {brother.defenseType === 'vault' ? (
            <group rotation={[0, -0.2, 0]}>
              <Vault3D
                progress={0}
                open={false}
                tapPulse={0}
                label={brother.vault.mode === 'code' ? brother.vault.label : 'Troll Vault'}
                rewardEmoji="🎁"
                rewardCaption="Locked"
                sealed
              />
            </group>
          ) : brother.defenseType === 'contract' ? (
            <Contract3D
              brotherName={brother.brotherName}
              budgetCap={brother.contract.budgetCap}
              terms={brother.contract.terms}
              highlightSeal={!drag.dropped}
              sealBroken={drag.dropped}
            />
          ) : (
            <Wheel3D slots={slots} targetIndex={0} spinToken={0} radius={1.85} />
          )}
          <GroundShadow y={brother.defenseType === 'vault' ? -1.45 : -1.75} radius={1.9} opacity={0.13} />
        </Stage>
      )}

      {/* the draggable tied rakhi */}
      {!drag.dropped && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            {...drag.bind}
            className="absolute left-1/2 bottom-3 -translate-x-1/2 w-20 h-20 rounded-full grid place-items-center pointer-events-auto no-select bg-puffy border-[3px] border-espresso shadow-[0_5px_0_var(--color-espresso)]"
            style={{
              touchAction: 'none',
              cursor: drag.active ? 'grabbing' : 'grab',
              transform: `translate(calc(-50% + ${drag.offset.x}px), ${drag.offset.y}px) scale(${1 + drag.nearness * 0.25})`,
            }}
            role="button"
            aria-label="Drag your rakhi onto the seal"
          >
            <span className="text-4xl leading-none">{THREAD_META[rakhi.thread].emoji}</span>
          </div>
        </div>
      )}

      <div className="absolute left-0 right-0 top-2 flex justify-center pointer-events-none">
        {!drag.dropped && (
          <HintPill tone="ink" pulse={!drag.active}>
            {drag.nearness > 0.6 ? 'Drop it on the seal!' : '👆 Drag your rakhi to the seal'}
          </HintPill>
        )}
      </div>
    </div>
  )
}

/* ── act · vault: rapid tap to crack ─────────────────────────────────────── */

function VaultCrack({
  brother,
  onCracked,
}: {
  brother: BrotherPayload
  onCracked: () => void
}) {
  const noWebGL = useNoWebGL()
  const [burst, setBurst] = useState(0)
  const trollEmoji = memeEmoji(brother.vault)
  const trollCaption = memeCaption(brother.vault)
  const isCode = brother.vault.mode === 'code'

  const crack = useTapCounter({
    target: brother.vault.taps,
    onTap: hapticTap,
    onComplete: () => {
      heavy()
      celebrate()
      setBurst((n) => n + 1)
      toast(isCode ? 'Vault cracked. It is yours.' : 'Vault cracked. Oh no.')
      playMemeSong(brother.vault.mode, brother.vault.meme)
      window.setTimeout(onCracked, 1400)
    },
  })

  return (
    <div className="space-y-4">
      <div className="relative">
        {noWebGL ? (
          <div className="h-[19rem] grid place-items-center text-7xl animate-bob" aria-hidden>
            {crack.complete ? (isCode ? '🎁' : trollEmoji) : '🔐'}
          </div>
        ) : (
          <Stage className="h-[19rem]" cameraPosition={[0, 0.1, 5.4]} target={[0, 0.1, 0]} fov={40}>
            <Vault3D
              progress={crack.progress}
              open={crack.complete}
              tapPulse={crack.pulse}
              label={isCode ? brother.vault.label : 'Troll Vault'}
              rewardEmoji={isCode ? '🎁' : trollEmoji}
              rewardCaption={isCode ? brother.vault.label : trollCaption}
            />
            <Burst trigger={burst} origin={[0, 0.2, 1]} count={200} power={4} />
            <GroundShadow y={-1.45} radius={1.9} opacity={0.15} />
          </Stage>
        )}

        {!crack.complete && (
          <button
            type="button"
            aria-label="Tap rapidly to crack the vault"
            className="absolute inset-0 no-select"
            style={{ touchAction: 'none' }}
            onPointerDown={(event) => {
              event.preventDefault()
              crack.tap()
            }}
          />
        )}

        <div className="absolute left-0 right-0 bottom-1 px-6 pointer-events-none">
          {!crack.complete ? (
            <>
              <div className="flex justify-center mb-2">
                <HintPill tone="ink" pulse={crack.count === 0}>
                  👆 Tap fast · {crack.count}/{brother.vault.taps}
                </HintPill>
              </div>
              <Meter value={crack.progress} tone="gold" height={16} />
            </>
          ) : (
            <div className="flex justify-center">
              <HintPill tone="mint">Cracked ✔</HintPill>
            </div>
          )}
        </div>
      </div>

      {crack.complete && (
        <Card className="text-center">
          {isCode ? (
            <>
              <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mb-1">
                {brother.vault.label || 'Gift card'}
              </p>
              <p className="num text-[1.3rem] text-espresso tracking-wide select-all break-all">
                {brother.vault.code || '—'}
              </p>
              <Btn
                tone="cream"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(brother.vault.code)
                    toast('Code copied 📋')
                  } catch {
                    toast('Select the code and copy it', 'info')
                  }
                }}
              >
                📋 Copy code
              </Btn>
            </>
          ) : (
            <>
              <div className="text-6xl mb-1">{trollEmoji}</div>
              <p className="font-display font-black text-[1.2rem] text-gulabi-deep leading-tight">
                {trollCaption}
              </p>
              <p className="text-[0.82rem] text-espresso/55 mt-1">
                You tapped {brother.vault.taps} times for this. He planned it.
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  )
}

/* ── act · contract: accept or reject ────────────────────────────────────── */

function ContractDecide({
  brother,
  onDecide,
}: {
  brother: BrotherPayload
  onDecide: (status: 'accepted' | 'countered') => void
}) {
  const noWebGL = useNoWebGL()
  return (
    <div className="space-y-4">
      {noWebGL ? (
        <div className="h-56 grid place-items-center text-7xl animate-bob" aria-hidden>
          📜
        </div>
      ) : (
        <Stage className="h-64" cameraPosition={[0, 0, 5.4]} target={[0, 0, 0]} fov={40}>
          <Turntable autoSpin={0.12} tilt maxTilt={0.2}>
            <Contract3D
              brotherName={brother.brotherName}
              budgetCap={brother.contract.budgetCap}
              terms={brother.contract.terms}
              sealBroken
            />
          </Turntable>
          <GroundShadow y={-1.75} radius={1.4} opacity={0.12} />
        </Stage>
      )}

      <Card>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h3 className="text-[1.08rem]">His budget contract</h3>
          <span className="num text-[1.3rem] text-pista-deep">{inr(brother.contract.budgetCap)}</span>
        </div>
        <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
          Capped, final, and stuffed with clauses. You have exactly two options.
        </p>
        <ul className="space-y-2">
          {brother.contract.terms.map((term, i) => (
            <li key={i} className="flex gap-2.5 text-[0.85rem] leading-snug">
              <span className="num text-gulabi-deep shrink-0">{i + 1}.</span>
              <span className="text-espresso/75">{term}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        <Btn tone="mint" block size="lg" onClick={() => onDecide('accepted')}>
          ✅ Accept Terms
        </Btn>
        <Btn tone="pink" block size="lg" onClick={() => onDecide('countered')}>
          🧾 Reject &amp; Apply Sibling Tax
        </Btn>
      </div>
      <p className="text-center text-[0.76rem] text-espresso/45 leading-snug px-3">
        Accepting locks his {inr(brother.contract.budgetCap)} as the final shagun. Rejecting lets you
        send your own bill straight back.
      </p>
    </div>
  )
}

/* ── act · roulette: pull the lever ──────────────────────────────────────── */

function RouletteSpin({
  brother,
  slots,
  targetIndex,
  payout,
  onSettled,
}: {
  brother: BrotherPayload
  slots: ReturnType<typeof buildWheel>
  targetIndex: number
  payout: number
  onSettled: () => void
}) {
  const noWebGL = useNoWebGL()
  const [spinToken, setSpinToken] = useState(0)
  const [settled, setSettled] = useState(false)
  const [burst, setBurst] = useState(0)
  const jackpot = slots[targetIndex]?.tier === 3

  const lever = useLeverPull({
    onPull: () => {
      thud()
      setSpinToken((token) => token + 1)
    },
  })

  const settle = () => {
    if (settled) return
    setSettled(true)
    if (payout > 0) {
      celebrate()
      setBurst((n) => n + 1)
    } else nope()
    onSettled()
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {noWebGL ? (
          <div className="h-[20rem] grid place-items-center text-7xl animate-bob" aria-hidden>
            🎡
          </div>
        ) : (
          <Stage className="h-[20rem]" cameraPosition={[0.2, -0.4, 7.4]} target={[0.2, -0.4, 0]} fov={40}>
            <group position={[0, 0, 0]}>
              <Wheel3D
                slots={slots}
                targetIndex={targetIndex}
                spinToken={spinToken}
                showLever={false}
                radius={1.85}
                onTick={hapticTap}
                onSettled={settle}
              />
              <Burst trigger={burst} origin={[0, 0.4, 1.2]} count={200} power={4} />
              {settled && jackpot && <Sparkles count={38} radius={3} />}
            </group>
          </Stage>
        )}

        {!lever.spent && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              {...lever.bind}
              className="absolute right-3 top-1/2 w-24 h-40 -translate-y-1/2 pointer-events-auto no-select grid place-items-center"
              style={{ touchAction: 'none', cursor: 'grab' }}
              role="slider"
              aria-label="Pull the lever down to spin"
              aria-valuenow={Math.round(lever.pull * 100)}
            >
              <div
                className="w-3 h-28 rounded-full bg-espresso"
                style={{ transform: `translateY(${lever.pull * 46}px)` }}
              >
                <div className="w-9 h-9 -ml-3 -mt-2 rounded-full bg-gulabi border-[3px] border-espresso shadow-[0_4px_0_var(--color-espresso)]" />
              </div>
            </div>
          </div>
        )}

        <div className="absolute left-0 right-0 bottom-1 flex justify-center pointer-events-none">
          {!lever.spent && (
            <HintPill tone="ink" pulse>
              👇 Pull the lever
            </HintPill>
          )}
        </div>
      </div>

      {settled && (
        <Card className="text-center">
          <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50">
            {jackpot ? 'JACKPOT' : 'The wheel landed on'}
          </p>
          {payout > 0 ? (
            <CountUp to={payout} className="text-[2.6rem] text-pista-deep leading-tight" />
          ) : (
            <p className="font-display font-black text-[2rem] text-gulabi-deep leading-tight">
              Blessings ✨
            </p>
          )}
          <p className="text-[0.8rem] text-espresso/55 mt-1">
            Sealed by {brother.brotherName} before he ever sent it.
          </p>
        </Card>
      )}
    </div>
  )
}

/* ── compact bill editor for the reject path ─────────────────────────────── */

function BillRow({
  line,
  onChange,
  onRemove,
}: {
  line: BillLine
  onChange: (next: BillLine) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        className="toy-input !py-2.5 !px-3 text-[0.85rem] flex-1 min-w-0"
        value={line.label}
        placeholder="What are you charging for?"
        maxLength={90}
        onChange={(event) => onChange({ ...line, label: event.target.value })}
      />
      <div className="relative w-[5.6rem] shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 num text-[0.85rem] text-espresso/40">
          ₹
        </span>
        <input
          className="toy-input !py-2.5 !pl-6 !pr-2 num text-[0.9rem] w-full"
          inputMode="numeric"
          value={line.amt === 0 ? '' : String(line.amt)}
          placeholder="0"
          onChange={(event) =>
            onChange({ ...line, amt: Math.min(999999, Number(event.target.value.replace(/\D/g, '')) || 0) })
          }
        />
      </div>
      <button
        type="button"
        aria-label={`Remove ${line.label}`}
        onClick={onRemove}
        className="shrink-0 w-9 h-9 rounded-xl border-[2.5px] border-clayline text-espresso/45 grid place-items-center active:translate-y-[2px]"
      >
        ✕
      </button>
    </div>
  )
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export function SisterChallenge({ brother }: { brother: BrotherPayload }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [rakhi, setRakhi] = useState<RakhiSpec>(defaultRakhi)
  const [sisterName, setSisterName] = useState(brother.sisterName)
  const [status, setStatus] = useState<'accepted' | 'countered'>('accepted')
  const [reaction, setReaction] = useState('')
  const [note, setNote] = useState('')
  const [upiId, setUpiId] = useState('')
  const [upiName, setUpiName] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [bill, setBill] = useState<BillLine[]>(() => DEFAULT_BILL.slice(0, 3).map((b) => ({ ...b })))
  const [confetti, setConfetti] = useState(0)

  const noWebGL = useNoWebGL()
  const { link, building, build } = useCapsuleLink('sr')

  // Roulette outcome is fixed by his seed; her lever pull is theatre.
  const rouletteSlots = useMemo(
    () =>
      brother.roulette.slots.length
        ? brother.roulette.slots
        : buildWheel(brother.contract.budgetCap || 1100),
    [brother.roulette.slots, brother.contract.budgetCap],
  )
  const rouletteIndex = useMemo(
    () => pickWeighted(rouletteSlots, mulberry32(brother.roulette.seed)),
    [rouletteSlots, brother.roulette.seed],
  )
  const roulettePayout = rouletteSlots[rouletteIndex]?.amt ?? 0

  const billTotal = useMemo(() => sumBill(bill), [bill])

  // The base amount she is owed / owed-to depends on the branch + her decision.
  const demand = useMemo(() => {
    if (brother.defenseType === 'vault') return 0
    if (brother.defenseType === 'roulette') return roulettePayout
    // contract
    return status === 'accepted' ? brother.contract.budgetCap : billTotal
  }, [brother.defenseType, brother.contract.budgetCap, status, roulettePayout, billTotal])

  const needsUpi = demand > 0

  const beginAct = () => {
    // Seed a sensible default reaction for this branch.
    setReaction((current) => current || REACTION_PRESETS[brother.defenseType][0])
    setPhase('act')
  }

  const send = async () => {
    const cleanBill =
      brother.defenseType === 'contract' && status === 'countered'
        ? bill.filter((l) => l.label.trim() && l.amt > 0)
        : brother.defenseType === 'roulette' && demand > 0
          ? [{ label: rouletteSlots[rouletteIndex]?.label ?? 'Wheel result', amt: demand }]
          : brother.defenseType === 'contract' && status === 'accepted' && demand > 0
            ? [{ label: 'Agreed shagun (capped)', amt: demand }]
            : []

    const payload: SisterReplyPayload = {
      v: 1,
      kind: 'sr',
      brother,
      sisterName: sisterName.trim() || 'Your Sister',
      rakhi,
      status,
      finalDemandAmt: demand,
      bill: cleanBill,
      upiId: needsUpi ? upiId.trim() : '',
      upiName: needsUpi ? upiName.trim() || sisterName.trim() : '',
      qrImage: needsUpi ? qrImage : '',
      reaction: reaction.trim(),
      note: note.trim(),
    }
    thud()
    await build(payload)
  }

  const story = (): StorySpec => {
    if (brother.defenseType === 'vault') {
      return {
        eyebrow: 'Raksha Bandhan',
        headline: brother.vault.mode === 'code' ? 'She cracked the vault' : 'She cracked the troll vault',
        sisterName: sisterName || 'Sister',
        brotherName: brother.brotherName,
        thread: rakhi.thread,
        amount: null,
        amountCaption: '',
        lines: [
          { label: 'Taps it took', value: String(brother.vault.taps) },
          { label: 'Inside', value: brother.vault.mode === 'code' ? brother.vault.label || 'Gift card' : 'A meme' },
        ],
        stamp: reaction || 'Cracked',
        quote: brother.note || undefined,
        accent: 'pista',
      }
    }
    if (brother.defenseType === 'contract') {
      return {
        eyebrow: 'Sibling Agreement',
        headline: status === 'accepted' ? 'Budget contract accepted' : 'Contract rejected, tax applied',
        sisterName: sisterName || 'Sister',
        brotherName: brother.brotherName,
        thread: rakhi.thread,
        amount: demand,
        amountCaption: status === 'accepted' ? 'Capped shagun, as agreed' : 'Counter-bill she sent back',
        lines: [
          { label: 'His cap', value: inr(brother.contract.budgetCap) },
          { label: 'Her verdict', value: status === 'accepted' ? 'Accepted' : 'Rejected' },
        ],
        stamp: reaction || (status === 'accepted' ? 'Agreed' : 'Rejected'),
        quote: brother.note || undefined,
        accent: status === 'accepted' ? 'pista' : 'gulabi',
      }
    }
    return {
      eyebrow: 'Sibling Agreement',
      headline: rouletteSlots[rouletteIndex]?.tier === 3 ? 'She hit the jackpot' : 'The wheel decided',
      sisterName: sisterName || 'Sister',
      brotherName: brother.brotherName,
      thread: rakhi.thread,
      amount: demand,
      amountCaption: 'Shagun, decided by fate',
      lines: [
        { label: 'Landed on', value: rouletteSlots[rouletteIndex]?.label ?? '—' },
        { label: 'Jackpot odds', value: jackpotOdds(rouletteSlots) },
      ],
      stamp: reaction || (demand > 0 ? undefined : 'Blessings Only'),
      quote: brother.note || undefined,
      accent: 'marigold',
    }
  }

  /* ── link minted ────────────────────────────────────────────────────────── */
  if (link) {
    return (
      <Screen
        header={
          <TopBar
            title="Reply sealed"
            subtitle="Encrypted · ready to send"
            left={<BackBtn onClick={goHome} />}
          />
        }
      >
        <div className="max-w-md mx-auto pb-8">
          <Handoff
            link={link}
            tone="pink"
            title="Your tied rakhi is on its way back"
            blurb={`${brother.brotherName} will see your rakhi spinning, your verdict, and ${
              needsUpi ? `a ${inr(demand)} settlement request` : 'no bill at all'
            }.`}
            message={`${sisterName || 'Your sister'} tied your rakhi and sent her verdict 🪢`}
            cta="Send Tied Rakhi + Counter-Bill →"
          >
            <Card className="!p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Verdict"
                  value={status === 'accepted' ? 'Accepted' : 'Countered'}
                  tone={status === 'accepted' ? 'mint' : 'pink'}
                  sub={reaction || undefined}
                />
                <StatCard
                  label={needsUpi ? 'Settlement' : 'Owed'}
                  value={needsUpi ? inr(demand) : 'Nothing'}
                  tone="gold"
                />
              </div>
              {!noWebGL && (
                <Stage className="h-40" cameraPosition={[0, 0.2, 4.4]} fov={40}>
                  <Turntable autoSpin={0.5} tilt initialY={-0.3}>
                    <Rakhi3D spec={rakhi} scale={0.78} />
                  </Turntable>
                  <GroundShadow y={-1.3} radius={1.4} opacity={0.13} />
                </Stage>
              )}
              <StoryCardButton
                spec={story}
                filename={`sibling-agreement-${sisterName || 'rakhi'}.png`}
                label="Sibling Agreement Story Card"
              />
            </Card>
          </Handoff>
        </div>
      </Screen>
    )
  }

  /* ── intro ──────────────────────────────────────────────────────────────── */
  if (phase === 'intro') {
    const defenseName =
      brother.defenseType === 'vault'
        ? 'a locked Shagun Vault'
        : brother.defenseType === 'contract'
          ? 'a Budget Contract'
          : 'an Early-Bird Roulette'
    return (
      <Screen>
        <div className="max-w-md mx-auto min-h-full flex flex-col justify-center py-8">
          <div className="text-center">
            <Tag tone="brother">Incoming defense</Tag>
            <h1 className="text-[2rem] leading-tight mt-3">
              {brother.brotherName} got here first
            </h1>
            <p className="text-[0.9rem] text-espresso/60 leading-snug mt-2 px-4">
              He sent you {defenseName} — before you could send a single invoice. But it is locked.
            </p>
          </div>

          {noWebGL ? (
            <div className="h-56 grid place-items-center text-7xl animate-bob" aria-hidden>
              {brother.defenseType === 'contract' ? '📜' : brother.defenseType === 'roulette' ? '🎰' : '🔐'}
            </div>
          ) : (
            <Stage
              className="h-60"
              cameraPosition={
                brother.defenseType === 'vault'
                  ? [0, 0.1, 5.4]
                  : brother.defenseType === 'contract'
                    ? [0, 0, 5.4]
                    : [0.2, -0.4, 7.4]
              }
              target={
                brother.defenseType === 'vault'
                  ? [0, 0.1, 0]
                  : brother.defenseType === 'contract'
                    ? [0, 0, 0]
                    : [0.2, -0.4, 0]
              }
              fov={40}
            >
              <Turntable autoSpin={0.25} tilt maxTilt={0.25} initialY={-0.1}>
                {brother.defenseType === 'vault' ? (
                  <Vault3D progress={0} open={false} tapPulse={0} label={brother.vault.mode === 'code' ? brother.vault.label : 'Troll Vault'} rewardEmoji="🎁" rewardCaption="Locked" sealed />
                ) : brother.defenseType === 'contract' ? (
                  <Contract3D brotherName={brother.brotherName} budgetCap={brother.contract.budgetCap} terms={brother.contract.terms} highlightSeal />
                ) : (
                  <Wheel3D slots={rouletteSlots} targetIndex={0} spinToken={0} radius={1.85} />
                )}
              </Turntable>
              <GroundShadow y={brother.defenseType === 'vault' ? -1.45 : -1.75} radius={1.9} opacity={0.13} />
            </Stage>
          )}

          {brother.note && (
            <Card className="mb-4">
              <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mb-1.5">
                From {brother.brotherName}
              </p>
              <p className="text-[0.9rem] text-espresso/75 leading-relaxed whitespace-pre-wrap">
                {brother.note}
              </p>
            </Card>
          )}

          <Well className="mb-4">
            <p className="text-[0.82rem] text-espresso/65 leading-snug">
              🔒 <strong className="text-espresso">Biometric Lock.</strong> Forge and tie a 3D rakhi
              to prove it is really you. Only then does the lock open.
            </p>
          </Well>

          <Btn tone="pink" block size="lg" onClick={() => setPhase('forge')}>
            Forge my Rakhi →
          </Btn>
        </div>
      </Screen>
    )
  }

  /* ── forge ──────────────────────────────────────────────────────────────── */
  if (phase === 'forge') {
    return (
      <Screen
        header={
          <TopBar
            title="anithor bond"
            subtitle="Rakhi with Digital Love"
            left={<BackBtn onClick={() => setPhase('intro')} />}
          />
        }
        footer={
          <div className="max-w-md mx-auto pb-2">
            <Btn
              tone="pink"
              block
              size="lg"
              onClick={() => {
                if (!sisterName.trim()) {
                  toast('Add your name — it goes on the reply', 'warn')
                  return
                }
                setPhase('tie')
              }}
            >
              Next: Tie it →
            </Btn>
          </div>
        }
      >
        <div className="max-w-md mx-auto pb-6 space-y-4">
          <Card>
            <Field
              label="Your name"
              value={sisterName}
              maxLength={40}
              placeholder="Sneha"
              onChange={(event) => setSisterName(event.target.value)}
            />
          </Card>
          <ForgeStage rakhi={rakhi} setRakhi={setRakhi} />
        </div>
      </Screen>
    )
  }

  /* ── tie ────────────────────────────────────────────────────────────────── */
  if (phase === 'tie') {
    return (
      <Screen header={<TopBar title="Tie the Rakhi" subtitle="Press and hold" />}>
        <div className="max-w-md mx-auto pb-8">
          <TieStage rakhi={rakhi} onDone={() => setPhase('seal')} />
          <Card className="mt-2">
            <p className="text-[0.86rem] text-espresso/65 leading-snug">
              Press and hold to cinch the knot tight. This is the key that unlocks his defense.
            </p>
          </Card>
        </div>
      </Screen>
    )
  }

  /* ── seal ─────────────────────────────────────────────────────────────── */
  if (phase === 'seal') {
    return (
      <Screen header={<TopBar title="Break the seal" subtitle="Drag your rakhi onto it" />}>
        <div className="max-w-md mx-auto pb-8">
          <SealDrop brother={brother} rakhi={rakhi} slots={rouletteSlots} onDropped={beginAct} />
          <Card className="mt-2">
            <p className="text-[0.86rem] text-espresso/65 leading-snug">
              Drag your freshly tied rakhi onto the wax seal. The moment it lands, the lock gives way
              and his defense opens up.
            </p>
          </Card>
        </div>
      </Screen>
    )
  }

  /* ── act ──────────────────────────────────────────────────────────────── */
  if (phase === 'act') {
    return (
      <Screen
        header={
          <TopBar
            title={
              brother.defenseType === 'vault'
                ? 'Crack the vault'
                : brother.defenseType === 'contract'
                  ? 'Your call'
                  : 'Spin the wheel'
            }
            left={<BackBtn onClick={() => setPhase('seal')} />}
          />
        }
        footer={
          brother.defenseType === 'contract' ? undefined : (
            <div className="max-w-md mx-auto pb-2">
              <Btn tone="pink" block size="lg" onClick={() => setPhase('compose')}>
                Continue →
              </Btn>
            </div>
          )
        }
      >
        <Confetti fire={confetti} />
        <div className="max-w-md mx-auto pb-6">
          {brother.defenseType === 'vault' && (
            <VaultCrack brother={brother} onCracked={() => setConfetti((n) => n + 1)} />
          )}
          {brother.defenseType === 'contract' && (
            <ContractDecide
              brother={brother}
              onDecide={(next) => {
                setStatus(next)
                setConfetti((n) => n + 1)
                setPhase('compose')
              }}
            />
          )}
          {brother.defenseType === 'roulette' && (
            <RouletteSpin
              brother={brother}
              slots={rouletteSlots}
              targetIndex={rouletteIndex}
              payout={roulettePayout}
              onSettled={() => setConfetti((n) => n + 1)}
            />
          )}
        </div>
      </Screen>
    )
  }

  /* ── compose the reply ──────────────────────────────────────────────────── */
  const rejecting = brother.defenseType === 'contract' && status === 'countered'

  return (
    <Screen
      header={
        <TopBar
          title="Send it back"
          subtitle={needsUpi ? `He owes ${inr(demand)}` : 'Rakhi + reaction'}
          left={<BackBtn onClick={() => setPhase('act')} />}
        />
      }
      footer={
        <div className="max-w-md mx-auto pb-2">
          <Btn tone="pink" block size="lg" onClick={send} disabled={building}>
            {building ? 'Encrypting…' : '🔒 Seal & Get Link'}
          </Btn>
        </div>
      }
    >
      <div className="max-w-md mx-auto pb-6 space-y-4">
        <Card>
          <h3 className="text-[1.05rem] mb-2">Your reaction</h3>
          <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
            Stamped across his story card. Pick one or write your own.
          </p>
          <div className="flex flex-wrap gap-2">
            {REACTION_PRESETS[brother.defenseType].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  hapticTap()
                  setReaction(preset)
                }}
                data-on={reaction === preset}
                className="toy-chip !w-auto !py-2 !px-3.5 text-[0.82rem]"
              >
                {preset}
              </button>
            ))}
          </div>
          <Field
            className="mt-3"
            label="Custom reaction"
            value={reaction}
            maxLength={80}
            placeholder="Vault Cracker Certified"
            onChange={(event) => setReaction(event.target.value)}
          />
        </Card>

        {rejecting && (
          <Card>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="text-[1.05rem]">Your counter-bill</h3>
              <span className="num text-[1.1rem] text-gulabi-deep">{inr(billTotal)}</span>
            </div>
            <p className="text-[0.8rem] text-espresso/55 leading-snug mb-3">
              He rejected your budget. Now itemise what he actually owes.
            </p>
            <div className="space-y-2.5">
              {bill.map((line, i) => (
                <BillRow
                  key={i}
                  line={line}
                  onChange={(next) => setBill(bill.map((l, j) => (j === i ? next : l)))}
                  onRemove={() => setBill(bill.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <Btn
              tone="cream"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (bill.length >= 10) {
                  toast('Ten charges is plenty', 'info')
                  return
                }
                setBill([...bill, { label: '', amt: 500 }])
              }}
            >
              + Add a charge
            </Btn>
          </Card>
        )}

        {needsUpi && (
          <QrUploadPanel
            qrImage={qrImage}
            onChange={(img) => setQrImage(img)}
          />
        )}

        <Card>
          <TextArea
            label="A note for him"
            value={note}
            rows={3}
            maxLength={400}
            placeholder={
              needsUpi ? 'Pay up before I tell everyone.' : 'Thank you. This once, I will let it slide.'
            }
            hint={`${note.length}/400`}
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>

        {rejecting && (
          <Card>
            <h3 className="text-[1.05rem] mb-3">He will see</h3>
            <BillTable
              lines={bill.filter((l) => l.label.trim() && l.amt > 0)}
              total={billTotal}
              totalLabel="Counter-bill total"
            />
          </Card>
        )}

        <Well>
          <p className="text-[0.78rem] text-espresso/60 leading-snug">
            Your tied rakhi, your verdict{needsUpi ? ' and your UPI request' : ''} travel back inside
            one encrypted link. Nothing is uploaded anywhere.
          </p>
        </Well>
        <CreatorFooter />
      </div>
    </Screen>
  )
}
