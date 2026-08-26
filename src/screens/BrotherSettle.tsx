/**
 * BrotherSettle.tsx — Flow 2, Step 3. He opens `#sr=`.
 *
 * The terminal screen of the brother-initiated flow: she forged a rakhi, tied
 * it, broke his seal and returned a verdict. There is no further link to mint —
 * this is where the money (if any) actually moves, via a one-tap native UPI
 * handoff into her VPA. The roulette outcome is re-derived from his own seed, so
 * a hand-edited reply can never inflate what he owes.
 */

import { useEffect, useMemo, useState } from 'react'
import { goHome } from '../lib/route'
import { inr } from '../lib/money'
import {
  memeCaption,
  memeEmoji,
  sumBill,
  THREAD_META,
  type BillLine,
  type SisterReplyPayload,
} from '../lib/payload'
import { buildWheel, jackpotOdds, mulberry32, pickWeighted } from '../lib/rng'
import { celebrate, heavy } from '../lib/haptics'
import type { StorySpec } from '../lib/story'
import { GroundShadow, Stage, Turntable } from '../three/Stage'
import { Wrist3D } from '../three/Wrist3D'
import { Rakhi3D } from '../three/Rakhi3D'
import { Burst, Sparkles } from '../three/Burst'
import {
  BackBtn,
  Btn,
  Card,
  Confetti,
  CountUp,
  Screen,
  Tag,
  TopBar,
  useNoWebGL,
  Well,
} from '../ui/kit'
import { BillTable, NepalQrDisplayPanel, StatCard, StoryCardButton, UpiPanel } from '../ui/bits'
import { playBlessSong, playMemeSong } from '../lib/audio'
import { CreatorFooter } from '../ui/CreatorFooter'

export function BrotherSettle({ reply }: { reply: SisterReplyPayload }) {
  const brother = reply.brother
  const def = brother.defenseType
  const noWebGL = useNoWebGL()

  const [revealed, setRevealed] = useState(false)
  const [confetti, setConfetti] = useState(0)
  const [burst, setBurst] = useState(0)

  // Re-derive the wheel result from his seed — the same computation she ran, so
  // the number he pays is the one the link sealed, not one typed into the reply.
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
  const rouletteSlot = rouletteSlots[rouletteIndex]

  const countered = def === 'contract' && reply.status === 'countered'
  const billTotal = useMemo(() => sumBill(reply.bill), [reply.bill])

  // Every amount comes from an authoritative source, never from a field the
  // reply could carry a lie in: his own cap, his seed's slot, or her own lines.
  const owed = useMemo(() => {
    if (def === 'roulette') return rouletteSlot?.amt ?? reply.finalDemandAmt
    if (countered) return billTotal
    if (def === 'contract') return brother.contract.budgetCap // she accepted the cap
    return 0 // vault — paid in a gift or a meme, not cash
  }, [def, countered, rouletteSlot, billTotal, brother.contract.budgetCap, reply.finalDemandAmt])

  const paying = owed > 0

  const settleBill: BillLine[] = useMemo(() => {
    if (countered) return reply.bill.filter((l) => l.label.trim() && l.amt > 0)
    if (!paying) return []
    if (def === 'roulette') return [{ label: rouletteSlot?.label ?? 'Wheel result', amt: owed }]
    return [{ label: 'Agreed shagun (capped)', amt: owed }]
  }, [countered, paying, def, rouletteSlot, owed, reply.bill])

  const trollEmoji = memeEmoji(brother.vault)
  const trollCaption = memeCaption(brother.vault)
  const jackpot = rouletteSlot?.tier === 3

  const headline =
    def === 'vault'
      ? brother.vault.mode === 'code'
        ? 'She cracked your vault'
        : 'She fell for the troll vault'
      : def === 'contract'
        ? reply.status === 'accepted'
          ? 'She accepted your contract'
          : 'She tore up your contract'
        : jackpot
          ? 'She hit the jackpot'
          : 'The wheel has spoken'

  useEffect(() => {
    if (revealed) setConfetti((n) => n + 1)
  }, [revealed])

  const reveal = () => {
    if (revealed) return
    heavy()
    celebrate()
    setBurst((n) => n + 1)
    setRevealed(true)
    if (def === 'vault') {
      playMemeSong(brother.vault.mode, brother.vault.meme)
    } else if (!paying || owed === 0) {
      playBlessSong()
    }
  }

  const story = (): StorySpec => {
    if (def === 'vault') {
      return {
        eyebrow: 'Raksha Bandhan',
        headline,
        sisterName: reply.sisterName,
        brotherName: brother.brotherName,
        thread: reply.rakhi.thread,
        amount: null,
        amountCaption: '',
        lines: [
          { label: 'Taps it took', value: String(brother.vault.taps) },
          {
            label: 'Inside',
            value: brother.vault.mode === 'code' ? brother.vault.label || 'Gift card' : 'A meme',
          },
        ],
        stamp: reply.reaction || 'Cracked',
        quote: reply.note || undefined,
        accent: 'pista',
      }
    }
    if (def === 'contract') {
      return {
        eyebrow: 'Sibling Agreement',
        headline,
        sisterName: reply.sisterName,
        brotherName: brother.brotherName,
        thread: reply.rakhi.thread,
        amount: owed,
        amountCaption:
          reply.status === 'accepted' ? 'Capped shagun, as agreed' : 'Counter-bill she sent back',
        lines: [
          { label: 'His cap', value: inr(brother.contract.budgetCap) },
          { label: 'Her verdict', value: reply.status === 'accepted' ? 'Accepted' : 'Rejected' },
        ],
        stamp: reply.reaction || (reply.status === 'accepted' ? 'Agreed' : 'Rejected'),
        quote: reply.note || undefined,
        accent: reply.status === 'accepted' ? 'pista' : 'gulabi',
      }
    }
    return {
      eyebrow: 'Sibling Agreement',
      headline,
      sisterName: reply.sisterName,
      brotherName: brother.brotherName,
      thread: reply.rakhi.thread,
      amount: owed,
      amountCaption: 'Shagun, decided by fate',
      lines: [
        { label: 'Landed on', value: rouletteSlot?.label ?? '—' },
        { label: 'Jackpot odds', value: jackpotOdds(rouletteSlots) },
      ],
      stamp: reply.reaction || (owed > 0 ? undefined : 'Blessings Only'),
      quote: reply.note || undefined,
      accent: 'marigold',
    }
  }

  return (
    <Screen
      header={
        <TopBar
          title="anithor bond"
          subtitle={`Rakhi with Digital Love · ${reply.sisterName}'s verdict`}
          left={<BackBtn onClick={goHome} />}
        />
      }
    >
      <Confetti fire={confetti} />
      <div className="max-w-md mx-auto pb-8 space-y-4">
        {/* her tied rakhi — the thing she made to get past your defense */}
        <div className="relative">
          {noWebGL ? (
            <div className="h-[20rem] grid place-items-center text-7xl animate-bob" aria-hidden>
              {THREAD_META[reply.rakhi.thread].emoji}
            </div>
          ) : (
            <Stage
              className="h-[20rem]"
              cameraPosition={[-0.15, 0.2, 4.95]}
              target={[-0.15, 0.2, 0]}
              fov={42}
            >
              <group>
                <Wrist3D rakhi={reply.rakhi} tie={1} />
                <Burst
                  trigger={burst}
                  origin={[0.05, 0.31, 0.25]}
                  count={190}
                  power={3.6}
                  colors={[0xffb703, 0xffe3a3, 0xffffff, 0xff4d6d]}
                />
                {revealed && <Sparkles count={26} radius={2.3} />}
              </group>
              <GroundShadow y={-1.55} radius={1.9} opacity={0.11} />
            </Stage>
          )}
          <div className="absolute left-0 right-0 bottom-2 flex justify-center pointer-events-none">
            <span className="font-display font-bold text-[0.78rem] text-espresso/45">
              {THREAD_META[reply.rakhi.thread].name} · tied by {reply.sisterName}
            </span>
          </div>
        </div>

        {!revealed ? (
          <>
            <Card className="text-center">
              <Tag tone="sister">She got past it</Tag>
              <h2 className="text-[1.35rem] leading-tight mt-2.5">
                {reply.sisterName} forged a rakhi, tied it, and broke your seal
              </h2>
              <p className="text-[0.86rem] text-espresso/60 leading-snug mt-1.5">
                Her verdict on your {def === 'vault' ? 'vault' : def === 'contract' ? 'contract' : 'wheel'}{' '}
                is sealed inside this link. Open it.
              </p>
            </Card>
            <Btn tone="gold" block size="lg" onClick={reveal}>
              Open {reply.sisterName}'s verdict →
            </Btn>
          </>
        ) : (
          <>
            <Card className="text-center">
              <Tag tone="sister">{reply.sisterName}'s verdict</Tag>
              <h2 className="text-[1.5rem] leading-tight mt-2.5">{headline}</h2>
              {reply.reaction && (
                <p className="font-display font-bold text-[1.05rem] text-gulabi-deep mt-2">
                  “{reply.reaction}”
                </p>
              )}
            </Card>

            {/* branch-specific detail */}
            {def === 'vault' && (
              <Card className="text-center">
                {brother.vault.mode === 'code' ? (
                  <>
                    <div className="text-5xl mb-1">🎁</div>
                    <p className="text-[0.9rem] text-espresso/70 leading-snug">
                      She tapped through all{' '}
                      <span className="num">{brother.vault.taps}</span> locks and walked off with
                      your <strong className="text-espresso">{brother.vault.label || 'gift'}</strong>.
                      Generous of you.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-1">{trollEmoji}</div>
                    <p className="font-display font-black text-[1.2rem] text-gulabi-deep leading-tight">
                      {trollCaption}
                    </p>
                    <p className="text-[0.86rem] text-espresso/60 leading-snug mt-1">
                      She tapped <span className="num">{brother.vault.taps}</span> times expecting cash
                      and got a meme. You monster. You genius.
                    </p>
                  </>
                )}
              </Card>
            )}

            {paying ? (
              <>
                <Card>
                  <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 text-center">
                    {countered ? 'Her counter-bill' : def === 'roulette' ? 'The wheel awarded her' : 'Your agreed cap'}
                  </p>
                  <CountUp
                    to={owed}
                    className="text-[2.8rem] leading-tight text-gulabi-deep block text-center mt-1"
                  />
                  {settleBill.length > 0 && (
                    <BillTable
                      className="mt-4"
                      lines={settleBill}
                      total={owed}
                      totalLabel={countered ? 'Total she is charging' : 'Payable now'}
                    />
                  )}
                </Card>

                <NepalQrDisplayPanel
                  qrImage={reply.qrImage}
                  vpa={reply.upiId}
                  name={reply.upiName || reply.sisterName}
                  amount={owed}
                  note={`Rakhi shagun for ${reply.sisterName}`}
                  cta={`Pay ${reply.sisterName} ${inr(owed)}`}
                />
              </>
            ) : (
              <Card>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="You owe" value="₹0" tone="mint" />
                  <StatCard
                    label={def === 'vault' ? 'She got' : 'Verdict'}
                    value={def === 'vault' ? (brother.vault.mode === 'code' ? 'A gift' : 'A meme') : 'Blessings'}
                    tone="gold"
                  />
                </div>
                <p className="text-[0.82rem] text-espresso/55 leading-snug mt-3 text-center">
                  No rupees change hands on this one. Enjoy it while it lasts.
                </p>
              </Card>
            )}

            {reply.note && (
              <Card>
                <p className="font-display font-bold uppercase tracking-wide text-[0.7rem] text-espresso/50 mb-1.5">
                  Her note
                </p>
                <p className="text-[0.9rem] text-espresso/75 leading-relaxed whitespace-pre-wrap">
                  {reply.note}
                </p>
              </Card>
            )}

            <Card className="text-center">
              {!noWebGL && (
                <Stage className="h-40 -mt-2" cameraPosition={[0, 0.2, 4.4]} fov={40}>
                  <Turntable autoSpin={0.5} tilt initialY={-0.4}>
                    <Rakhi3D spec={reply.rakhi} scale={0.78} />
                  </Turntable>
                  <GroundShadow y={-1.3} radius={1.4} opacity={0.13} />
                </Stage>
              )}
              <StoryCardButton
                spec={story}
                filename={`sibling-agreement-${reply.sisterName || 'rakhi'}.png`}
                label="Sibling Agreement Story Card"
              />
              <p className="text-[0.74rem] text-espresso/45 leading-snug mt-2">
                A 1080×1920 card built on your device — proof the negotiation is closed.
              </p>
            </Card>

            <Well>
              <p className="text-[0.78rem] text-espresso/60 leading-snug">
                This reply lived only inside the link she sent. Nothing was uploaded, and paying her
                happens directly between your UPI apps.
              </p>
            </Well>

            <Btn tone="cream" block onClick={goHome}>
              Start your own rakhi →
            </Btn>
          </>
        )}
        <CreatorFooter />
      </div>
    </Screen>
  )
}
