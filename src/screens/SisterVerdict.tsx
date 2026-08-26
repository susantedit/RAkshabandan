/**
 * SisterVerdict.tsx — Flow 1, Step 3. She opens `#br=`.
 *
 * Three different reveals depending on how he fought back. The roulette outcome
 * was already decided by the seed inside the link, so the lever pull is theatre
 * with an honest result — she can reload all she likes.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { go, goHome } from '../lib/route'
import { inr } from '../lib/money'
import { sumApplied, THREAD_META, type BrotherReplyPayload } from '../lib/payload'
import { buildWheel, jackpotOdds, mulberry32, pickWeighted } from '../lib/rng'
import { useLeverPull } from '../lib/gestures'
import { addVouchers, loadWallet, redeemVoucher, type WalletVoucher } from '../lib/storage'
import { celebrate, nope, tap as hapticTap, thud } from '../lib/haptics'
import type { StorySpec } from '../lib/story'
import { GroundShadow, Stage, Turntable } from '../three/Stage'
import { Wheel3D } from '../three/Wheel3D'
import { Envelope3D } from '../three/Envelope3D'
import { Rakhi3D } from '../three/Rakhi3D'
import { Burst, Sparkles } from '../three/Burst'
import {
  BackBtn,
  Btn,
  Card,
  Confetti,
  CountUp,
  HintPill,
  Screen,
  Tag,
  toast,
  TopBar,
  useNoWebGL,
  Well,
} from '../ui/kit'
import { BillTable, NepalQrDisplayPanel, StatCard, StoryCardButton, UpiPanel, VoiceNote } from '../ui/bits'
import { playBlessSong, playMemeSong } from '../lib/audio'
import { CreatorFooter } from '../ui/CreatorFooter'

/* ── roulette reveal ─────────────────────────────────────────────────────── */

function RouletteReveal({
  reply,
  targetIndex,
  payout,
  onSettled,
}: {
  reply: BrotherReplyPayload
  targetIndex: number
  payout: number
  onSettled: () => void
}) {
  const noWebGL = useNoWebGL()
  const [spinToken, setSpinToken] = useState(0)
  const [settled, setSettled] = useState(false)
  const [burst, setBurst] = useState(0)
  const slots = reply.slots
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
    } else {
      nope()
      playBlessSong()
    }
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
                showLever
                radius={1.85}
                onTick={hapticTap}
                onSettled={settle}
              />
              <Burst
                trigger={burst}
                origin={[0, 0.4, 1.2]}
                count={200}
                power={4}
                colors={[0xffb703, 0xff4d6d, 0x2ec4b6, 0xffffff]}
              />
              {settled && jackpot && <Sparkles count={38} radius={3} />}
            </group>
          </Stage>
        )}

        {/* the lever knob she actually drags */}
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
                className="w-14 h-14 rounded-full bg-gulabi border-[3px] border-espresso shadow-[0_5px_0_var(--color-espresso)] grid place-items-center text-white text-xl"
                style={{ transform: `translateY(${lever.pull * 46}px)` }}
              >
                ↓
              </div>
            </div>
            <div className="absolute left-0 right-0 bottom-2 flex justify-center">
              <HintPill tone="ink" pulse={lever.pull === 0}>
                👇 Drag the pink knob down
              </HintPill>
            </div>
          </div>
        )}
      </div>

      {!lever.spent && (
        <Card>
          <h3 className="text-[1.05rem] mb-1">{reply.brotherName} spun for it</h3>
          <p className="text-[0.85rem] text-espresso/60 leading-snug">
            Instead of paying your <span className="num">{inr(reply.sister.demandAmt)}</span> he put it
            on this wheel as a jackpot slot. Ten equal wedges, no rigging — and the result was locked
            in when he sent the link. Pull and find out.
          </p>
        </Card>
      )}

      {settled && (
        <Card className="text-center">
          <Tag tone={payout > 0 ? 'gold' : 'brother'}>{jackpot ? 'JACKPOT 🎉' : 'The wheel has spoken'}</Tag>
          <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mt-3">
            You have been awarded
          </p>
          {payout > 0 ? (
            <CountUp to={payout} className="text-[3rem] leading-tight text-marigold-deep block" />
          ) : (
            <p className="font-display font-black text-[2.1rem] leading-tight text-pista-deep mt-1">
              Blessings ✨
            </p>
          )}
          <p className="text-[0.84rem] text-espresso/60 leading-snug mt-2">
            {jackpot
              ? 'Against all odds. He is going to be sick about this.'
              : payout > 0
                ? `Down from ${inr(reply.sister.demandAmt)}. Technically still a win.`
                : 'Zero rupees, infinite spiritual wealth. Convenient for him.'}
          </p>
        </Card>
      )}
    </div>
  )
}

/* ── audit reveal ────────────────────────────────────────────────────────── */

/**
 * A rubber stamp, laid *into* the invoice's flow in a row of its own.
 *
 * The row keeps its height whether or not the stamp has landed, so the paper
 * never jumps when it does. Earlier versions floated the stamps over the card at
 * fixed offsets, which cannot work in principle: the invoice's height depends on
 * how many bill lines and deductions the capsule happens to carry, so an offset
 * that clears the text for one reply lands squarely on it for the next.
 *
 * The rotation lives on the wrapper and the pop-in on the stamp itself —
 * `pop-in` ends on `transform: scale(1)`, and with `fill-mode: both` that final
 * frame would otherwise win over an inline rotate and leave the stamp straight.
 */
function Stamp({
  show,
  tilt,
  align,
  delay = 0,
  children,
}: {
  show: boolean
  tilt: number
  align: 'left' | 'right'
  delay?: number
  children: string
}) {
  return (
    <div
      className={`h-[3.4rem] flex items-center ${align === 'right' ? 'justify-end pr-1' : 'justify-start pl-1'}`}
    >
      {show && (
        <div style={{ transform: `rotate(${tilt}deg)` }}>
          <div className="stamp animate-pop-in" style={{ animationDelay: `${delay}ms` }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function AuditReveal({ reply, onDone }: { reply: BrotherReplyPayload; onDone: () => void }) {
  const [unfolded, setUnfolded] = useState(false)
  const [stamped, setStamped] = useState(false)
  const applied = sumApplied(reply.deductions)

  useEffect(() => {
    const a = window.setTimeout(() => {
      setUnfolded(true)
      thud()
    }, 400)
    const b = window.setTimeout(() => {
      setStamped(true)
      thud()
      onDone()
    }, 1500)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [onDone])

  return (
    <div className="space-y-4" style={{ perspective: '1400px' }}>
      <div
        className="relative"
        style={{
          transformOrigin: 'top center',
          transition: 'transform 900ms cubic-bezier(0.34, 1.4, 0.5, 1), opacity 400ms',
          transform: unfolded ? 'rotateX(0deg) scaleY(1)' : 'rotateX(-84deg) scaleY(0.6)',
          opacity: unfolded ? 1 : 0.3,
        }}
      >
        <Card>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-[1.08rem]">Audited Invoice</h3>
            <Tag tone="brother">{reply.brotherName}</Tag>
          </div>
          <p className="text-[0.78rem] text-espresso/50 leading-snug mb-1">
            He went through your bill line by line. Like an actual tax inspector.
          </p>

          <Stamp show={stamped} tilt={-9} align="right">
            Audited
          </Stamp>

          <BillTable
            lines={reply.sister.bill}
            total={reply.sister.demandAmt}
            totalLabel="Originally billed"
          />

          {reply.deductions.length > 0 && (
            <div className="mt-5">
              <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-gulabi-deep mb-1">
                Deductions he claimed
              </p>
              {reply.deductions.map((deduction, i) => (
                <div key={`${deduction.label}-${i}`} className="tear py-2.5 flex items-baseline gap-3">
                  <span className="flex-1 text-[0.86rem] leading-snug text-espresso/80">
                    {deduction.label}
                  </span>
                  <span className="num text-[0.95rem] text-gulabi-deep shrink-0">
                    −{inr(deduction.applied)}
                  </span>
                </div>
              ))}
              <div className="pt-3 mt-1 border-t-[3px] border-dashed border-gulabi flex items-baseline gap-3">
                <span className="flex-1 font-display font-bold uppercase tracking-wide text-[0.78rem] text-gulabi-deep">
                  Total written off
                </span>
                <span className="num text-[1.2rem] text-gulabi-deep">−{inr(applied)}</span>
              </div>
            </div>
          )}

          <Stamp show={stamped} tilt={6} align="left" delay={180}>
            Discounted
          </Stamp>

          <div className="mt-1 p-4 rounded-[20px] bg-pista/15 border-[3px] border-pista">
            <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-pista-deep">
              What he will actually pay
            </p>
            <CountUp
              to={reply.finalPayout}
              className="text-[2.4rem] leading-tight text-pista-deep block"
            />
          </div>
        </Card>
      </div>

      {stamped && (
        <Well>
          <p className="text-[0.82rem] text-espresso/65 leading-snug">
            {applied >= reply.sister.demandAmt
              ? 'He audited you down to nothing. Escalate. Involve Mumma.'
              : `He shaved off ${inr(applied)}. Whether those grievances are legitimate is between you two.`}
          </p>
        </Well>
      )}
    </div>
  )
}

/* ── voucher reveal ──────────────────────────────────────────────────────── */

function VoucherReveal({ reply, onDone }: { reply: BrotherReplyPayload; onDone: () => void }) {
  const noWebGL = useNoWebGL()
  const [open, setOpen] = useState(0)
  const [wallet, setWallet] = useState<WalletVoucher[]>([])
  const [saved, setSaved] = useState(false)
  const raf = useRef(0)

  // Wallet keys are `<from>:<voucherId>`, so a same-named coupon from a different
  // sibling never collides with these.
  const keyPrefix = useMemo(() => `${reply.brotherName.toLowerCase().trim()}:`, [reply.brotherName])

  // Reopening the link should show the vouchers she already holds, not offer to
  // save them a second time.
  useEffect(() => {
    const held = loadWallet()
    if (reply.vouchers.some((v) => held.some((h) => h.key === `${keyPrefix}${v.id}`))) {
      setWallet(held)
      setSaved(true)
    }
  }, [keyPrefix, reply.vouchers])

  const opened = open >= 0.999

  const openIt = () => {
    if (open > 0) return
    thud()
    const start = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / 1400)
      setOpen(1 - Math.pow(1 - t, 3))
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        celebrate()
        onDone()
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const save = () => {
    const next = addVouchers(reply.vouchers, reply.brotherName, Date.now())
    setWallet(next)
    setSaved(true)
    celebrate()
    toast(`${reply.vouchers.length} voucher${reply.vouchers.length === 1 ? '' : 's'} saved to your wallet`)
  }

  return (
    <div className="space-y-4">
      {noWebGL ? (
        <div className="h-[21rem] grid place-items-center text-7xl animate-bob" aria-hidden>
          ✉️
        </div>
      ) : (
        <div className="relative">
          {/* Framed tight on the fanned deck. `fov` is vertical, so a taller
              canvas plus a narrower angle is what actually enlarges the cards —
              at the old framing the voucher titles rendered around 8px and were
              unreadable. 2.0 world units of half-width still leaves the fan a
              margin at 320px wide. */}
          <Stage
            className="h-[21rem]"
            cameraPosition={[0, -0.05, 6.85]}
            target={[0, -0.05, 0]}
            fov={38}
          >
            <Envelope3D vouchers={reply.vouchers} brotherName={reply.brotherName} open={open} />
            <GroundShadow y={-1.5} radius={1.8} opacity={0.13} />
          </Stage>
          {open === 0 && (
            <button
              type="button"
              onClick={openIt}
              className="absolute inset-0 grid place-items-end justify-center pb-3 no-select"
              aria-label="Open the envelope"
            >
              <HintPill tone="gold" pulse>
                👆 Tap to break the seal
              </HintPill>
            </button>
          )}
        </div>
      )}

      {!opened ? (
        <Card>
          <h3 className="text-[1.05rem] mb-1">A sealed envelope from {reply.brotherName}</h3>
          <p className="text-[0.85rem] text-espresso/60 leading-snug">
            He is not paying in cash. He is paying in labour — {reply.vouchers.length} signed duty
            voucher{reply.vouchers.length === 1 ? '' : 's'}, redeemable whenever you feel like ruining
            his day.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h3 className="text-[1.08rem]">Duty Vouchers</h3>
              <Tag tone="brother">Signed by {reply.brotherName}</Tag>
            </div>
            <div className="space-y-2.5">
              {reply.vouchers.map((voucher) => {
                const held = wallet.find((m) => m.key === `${keyPrefix}${voucher.id}`)
                return (
                  <div key={voucher.id} className="toy-card-flat !p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none shrink-0">{voucher.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-[0.95rem] leading-tight">
                          {voucher.title}
                        </p>
                        <p className="text-[0.76rem] text-espresso/55 leading-snug mt-0.5">
                          {voucher.note}
                        </p>
                      </div>
                    </div>
                    {held && (
                      <div className="mt-3">
                        {held.redeemed ? (
                          <p className="font-display font-bold text-[0.78rem] text-pista-deep">
                            ✔ Redeemed — he owes you nothing on this one
                          </p>
                        ) : (
                          <Btn
                            tone="pink"
                            size="sm"
                            block
                            onClick={() => {
                              setWallet(redeemVoucher(held.key, Date.now()))
                              celebrate()
                              toast('Redeemed. Go collect.')
                            }}
                          >
                            Redeem Now
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {!saved ? (
            <>
              <Btn tone="mint" block size="lg" onClick={save}>
                🎟️ Save to my Voucher Wallet
              </Btn>
              <p className="text-center text-[0.74rem] text-espresso/45 leading-snug px-2">
                Saved to this device only, so they survive after the link is gone. Nothing is uploaded.
              </p>
            </>
          ) : (
            <Btn tone="cream" block onClick={() => go('wallet')}>
              Open my wallet ({wallet.filter((v) => !v.redeemed).length} unredeemed) →
            </Btn>
          )}
        </>
      )}
    </div>
  )
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export function SisterVerdict({ reply }: { reply: BrotherReplyPayload }) {
  const [revealed, setRevealed] = useState(false)
  const [confetti, setConfetti] = useState(0)
  const noWebGL = useNoWebGL()
  const sister = reply.sister

  // Rebuild the wheel if an old link omitted the slots, then let the seed decide.
  const slots = useMemo(
    () => (reply.slots.length ? reply.slots : buildWheel(sister.demandAmt)),
    [reply.slots, sister.demandAmt],
  )
  const targetIndex = useMemo(() => pickWeighted(slots, mulberry32(reply.seed)), [slots, reply.seed])

  // The wheel and the number must never disagree, so trust the seed over the
  // payout field — a hand-edited link can't fake a different result.
  const payout =
    reply.responseType === 'roulette' ? (slots[targetIndex]?.amt ?? reply.finalPayout) : reply.finalPayout

  useEffect(() => {
    if (revealed) setConfetti((n) => n + 1)
  }, [revealed])

  const story = (): StorySpec => {
    if (reply.responseType === 'roulette') {
      return {
        eyebrow: 'Sibling Agreement',
        headline: slots[targetIndex]?.tier === 3 ? 'She hit the jackpot' : 'The wheel decided',
        sisterName: sister.sisterName,
        brotherName: reply.brotherName,
        thread: sister.rakhi.thread,
        amount: payout,
        amountCaption: 'Final shagun, decided by fate',
        lines: [
          { label: 'Originally demanded', value: inr(sister.demandAmt) },
          { label: 'Jackpot odds offered', value: jackpotOdds(slots) },
          { label: 'Landed on', value: slots[targetIndex]?.label ?? '—' },
        ],
        stamp: payout > 0 ? undefined : 'Blessings Only',
        quote: reply.note || undefined,
        accent: 'marigold',
      }
    }
    if (reply.responseType === 'audit') {
      return {
        eyebrow: 'Sibling Agreement',
        headline: 'Invoice audited and reduced',
        sisterName: sister.sisterName,
        brotherName: reply.brotherName,
        thread: sister.rakhi.thread,
        amount: reply.finalPayout,
        amountCaption: 'Settlement after deductions',
        lines: [
          { label: 'Originally billed', value: inr(sister.demandAmt) },
          ...reply.deductions.slice(0, 4).map((d) => ({
            label: d.label,
            value: `−${inr(d.applied)}`,
            struck: true,
          })),
        ],
        stamp: 'Audited',
        quote: reply.note || undefined,
        accent: 'gulabi',
      }
    }
    return {
      eyebrow: 'Sibling Agreement',
      headline: 'Paid in favours, not rupees',
      sisterName: sister.sisterName,
      brotherName: reply.brotherName,
      thread: sister.rakhi.thread,
      amount: null,
      amountCaption: '',
      lines: reply.vouchers.map((v) => ({ label: v.title, value: v.emoji })),
      stamp: 'Signed',
      quote: reply.note || undefined,
      accent: 'pista',
    }
  }

  return (
    <Screen
      header={
        <TopBar
          title="anithor bond"
          subtitle={`Rakhi with Digital Love · ${reply.brotherName}'s response`}
          left={<BackBtn onClick={goHome} />}
        />
      }
    >
      <Confetti fire={confetti} />
      <div className="max-w-md mx-auto pb-8 space-y-4">
        {reply.responseType === 'roulette' && (
          <RouletteReveal
            reply={{ ...reply, slots }}
            targetIndex={targetIndex}
            payout={payout}
            onSettled={() => setRevealed(true)}
          />
        )}
        {reply.responseType === 'audit' && (
          <AuditReveal reply={reply} onDone={() => setRevealed(true)} />
        )}
        {reply.responseType === 'voucher' && (
          <VoucherReveal reply={reply} onDone={() => setRevealed(true)} />
        )}

        {reply.note && (
          <Card>
            <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mb-1.5">
              His note
            </p>
            <p className="text-[0.9rem] text-espresso/75 leading-relaxed whitespace-pre-wrap">
              {reply.note}
            </p>
          </Card>
        )}

        {revealed && (
          <>
            {payout > 0 && reply.responseType !== 'voucher' && (
              <NepalQrDisplayPanel
                qrImage={sister.qrImage}
                vpa={sister.upiId}
                name={sister.upiName || sister.sisterName}
                amount={payout}
                note={`Rakhi settlement from ${reply.brotherName}`}
                cta="Collect Payment"
              />
            )}

            <Card>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="You billed" value={inr(sister.demandAmt)} tone="pink" />
                <StatCard
                  label={reply.responseType === 'voucher' ? 'Vouchers' : 'You get'}
                  value={
                    reply.responseType === 'voucher'
                      ? String(reply.vouchers.length)
                      : payout > 0
                        ? inr(payout)
                        : 'Blessings'
                  }
                  tone="mint"
                />
              </div>
            </Card>

            <Card className="text-center">
              {!noWebGL && (
                <Stage className="h-40 -mt-2" cameraPosition={[0, 0.2, 4.4]} fov={40}>
                  <Turntable autoSpin={0.5} tilt initialY={-0.4}>
                    <Rakhi3D spec={sister.rakhi} scale={0.78} />
                  </Turntable>
                  <GroundShadow y={-1.3} radius={1.4} opacity={0.13} />
                </Stage>
              )}
              <p className="font-display font-bold text-[0.78rem] text-espresso/45 mb-3">
                {THREAD_META[sister.rakhi.thread].name} · tied and accounted for
              </p>
              <StoryCardButton
                spec={story}
                filename={`sibling-agreement-${sister.sisterName || 'rakhi'}.png`}
                label="Sibling Agreement Story Card"
              />
              <p className="text-[0.74rem] text-espresso/45 leading-snug mt-2">
                A 1080×1920 card built on your device — post it to your story and let everyone see
                what he did.
              </p>
            </Card>

            {sister.wishes && sister.voiceNote && (
              <Card>
                <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mb-2">
                  Your original voice note
                </p>
                <VoiceNote text={sister.wishes} speaker={sister.sisterName} />
              </Card>
            )}

            <Btn tone="cream" block onClick={goHome}>
              Start a new rakhi →
            </Btn>
          </>
        )}
        <CreatorFooter />
      </div>
    </Screen>
  )
}
