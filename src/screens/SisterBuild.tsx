/**
 * SisterBuild.tsx — Flow 1, Step 1. The 3D Rakhi Forge.
 *
 * Four tabs of decisions with a live 3D preview above them, ending in an
 * encrypted `#s=` link. The invoice is the joke and the payload at once, so it
 * gets a real editor rather than a fixed list.
 */

import { useMemo, useState } from 'react'
import { goHome } from '../lib/route'
import { inr } from '../lib/money'
import {
  BILL_SUGGESTIONS,
  emptySister,
  GEM_META,
  GEMS,
  MITHAI,
  MITHAI_META,
  sumBill,
  THREAD_META,
  THREADS,
  type BillLine,
  type GemId,
  type MithaiId,
  type SisterPayload,
  type ThreadId,
} from '../lib/payload'
import { isValidVpa } from '../lib/upi'
import { thud } from '../lib/haptics'
import { Bob, GroundShadow, Stage, Turntable } from '../three/Stage'
import { Rakhi3D } from '../three/Rakhi3D'
import { Thali3D } from '../three/Thali3D'
import { Sparkles } from '../three/Burst'
import {
  AmountField,
  BackBtn,
  Btn,
  Card,
  Chip,
  Field,
  Screen,
  Sheet,
  Stepper,
  TextArea,
  toast,
  TopBar,
  useNoWebGL,
  Well,
} from '../ui/kit'
import { BillTable, QrUploadPanel, StatCard, VoiceNote } from '../ui/bits'
import { Handoff, useCapsuleLink } from '../ui/Handoff'
import { CreatorFooter } from '../ui/CreatorFooter'

const STEPS = ['Rakhi', 'Thali', 'Message', 'Invoice']

/* ── 3D preview ──────────────────────────────────────────────────────────── */

function Preview({ draft, mode }: { draft: SisterPayload; mode: 'rakhi' | 'thali' }) {
  const noWebGL = useNoWebGL()

  if (noWebGL) {
    return (
      <div className="h-52 grid place-items-center text-6xl animate-bob" aria-hidden>
        {mode === 'rakhi' ? THREAD_META[draft.rakhi.thread].emoji : '🪔'}
      </div>
    )
  }

  return (
    <Stage
      className="h-52 shrink-0"
      cameraPosition={mode === 'thali' ? [0, 4.0, 3.2] : [0, 0.2, 4.4]}
      target={mode === 'thali' ? [0, -0.42, 0] : [0, 0, 0]}
      fov={mode === 'thali' ? 38 : 40}
    >
      {mode === 'rakhi' ? (
        <>
          <Turntable key="rakhi-turn" autoSpin={0.45} tilt initialY={-0.25}>
            <Bob amount={0.05}>
              <Rakhi3D spec={draft.rakhi} scale={0.9} />
            </Bob>
          </Turntable>
          <Sparkles count={18} radius={2.3} />
          <GroundShadow y={-1.3} radius={1.4} />
        </>
      ) : (
        <>
          <Turntable key="thali-turn" autoSpin={0.28} tilt maxTilt={0.35} initialY={-0.4}>
            <Thali3D thali={draft.thali} rakhi={draft.rakhi} scale={0.82} />
          </Turntable>
          <GroundShadow y={-0.4} radius={2.1} opacity={0.14} />
        </>
      )}
    </Stage>
  )
}

/* ── invoice editor row ──────────────────────────────────────────────────── */

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

export function SisterBuild() {
  const [draft, setDraft] = useState<SisterPayload>(emptySister)
  const [step, setStep] = useState(0)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [autoTotal, setAutoTotal] = useState(true)
  const { link, building, build } = useCapsuleLink('s')

  const patch = (next: Partial<SisterPayload>) => setDraft((current) => ({ ...current, ...next }))
  const billTotal = useMemo(() => sumBill(draft.bill), [draft.bill])
  const demand = autoTotal ? billTotal : draft.demandAmt

  const previewMode: 'rakhi' | 'thali' = step === 1 ? 'thali' : 'rakhi'

  const toggleMithai = (id: MithaiId) => {
    const has = draft.thali.mithai.includes(id)
    const mithai = has
      ? draft.thali.mithai.filter((m) => m !== id)
      : [...draft.thali.mithai, id].slice(0, 3)
    patch({ thali: { ...draft.thali, mithai } })
  }

  const canAdvance = () => {
    if (step === 0) return draft.sisterName.trim().length > 0
    return true
  }

  const finish = async () => {
    if (!draft.sisterName.trim()) {
      toast('Add your name first', 'warn')
      setStep(0)
      return
    }
    const bill = draft.bill.filter((line) => line.label.trim() && line.amt > 0)
    const payload: SisterPayload = {
      ...draft,
      bill,
      demandAmt: autoTotal ? sumBill(bill) : draft.demandAmt,
      upiName: draft.upiName.trim() || draft.sisterName.trim(),
    }
    setDraft(payload)
    thud()
    await build(payload)
  }

  /* ── the link screen replaces everything once minted ────────────────────── */
  if (link) {
    return (
      <Screen
        header={
          <TopBar
            title="Rakhi packed & sealed"
            subtitle="Encrypted · ready to send"
            left={<BackBtn onClick={goHome} />}
          />
        }
      >
        <div className="max-w-md mx-auto pb-8">
          <Handoff
            link={link}
            tone="pink"
            title="Your Rakhi is ready to travel"
            blurb={`${draft.brotherName || 'Your brother'} will have to perform the aarti and tie it before the bill even appears.`}
            message={`${draft.sisterName} sent you a rakhi 🪢 (and an invoice). Open it:`}
            cta="Send Rakhi + Invoice →"
          >
            <Card className="!p-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Sibling Tax" value={inr(demand)} tone="pink" />
                <StatCard
                  label="Line items"
                  value={String(draft.bill.filter((l) => l.label.trim() && l.amt > 0).length)}
                  tone="gold"
                  sub={THREAD_META[draft.rakhi.thread].name}
                />
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
          {step < 3 ? (
            <Btn
              tone="pink"
              block
              size="lg"
              onClick={() => {
                if (!canAdvance()) {
                  toast('Your name goes on the invoice — add it', 'warn')
                  return
                }
                setStep(step + 1)
              }}
            >
              Next: {STEPS[step + 1]} →
            </Btn>
          ) : (
            <Btn tone="pink" block size="lg" onClick={finish} disabled={building}>
              {building ? 'Encrypting…' : '🔒 Seal & Get Link'}
            </Btn>
          )}
        </div>
      }
    >
      <div className="max-w-md mx-auto pb-6">
        <Preview draft={draft} mode={previewMode} />

        {/* ── Step 0: the rakhi itself ─────────────────────────────────── */}
        {step === 0 && (
          <div className="mt-6 space-y-4">
            <Card className="space-y-3">
              <Field
                label="Your name"
                value={draft.sisterName}
                maxLength={40}
                placeholder="Sujita"
                onChange={(event) => patch({ sisterName: event.target.value })}
              />
              <Field
                label="Brother's name"
                value={draft.brotherName}
                maxLength={40}
                placeholder="Susant"
                hint="Optional, but it makes the reveal hit harder."
                onChange={(event) => patch({ brotherName: event.target.value })}
              />
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-3">Thread type</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {THREADS.map((id: ThreadId) => (
                  <Chip
                    key={id}
                    on={draft.rakhi.thread === id}
                    onClick={() => patch({ rakhi: { ...draft.rakhi, thread: id } })}
                    title={THREAD_META[id].name}
                    subtitle={THREAD_META[id].blurb}
                    swatch={THREAD_META[id].swatch}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-3">Centrepiece gem</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {GEMS.map((id: GemId) => (
                  <Chip
                    key={id}
                    on={draft.rakhi.gem === id}
                    onClick={() => patch({ rakhi: { ...draft.rakhi, gem: id } })}
                    title={GEM_META[id].name}
                    subtitle={GEM_META[id].blurb}
                    emoji={GEM_META[id].emoji}
                  />
                ))}
              </div>
              {draft.rakhi.gem === 'monogram' && (
                <Field
                  className="mt-3"
                  label="Engraved initial"
                  value={draft.rakhi.monogram}
                  maxLength={2}
                  placeholder="R"
                  hint="One or two letters — it gets engraved into the centre."
                  onChange={(event) =>
                    patch({
                      rakhi: {
                        ...draft.rakhi,
                        monogram: event.target.value.toUpperCase().slice(0, 2) || 'R',
                      },
                    })
                  }
                />
              )}
            </Card>

            <Well>
              <p className="text-[0.78rem] text-espresso/55 leading-snug">
                Drag the rakhi above to spin it. Everything you pick here is rebuilt from scratch on
                his phone — no images are ever uploaded.
              </p>
            </Well>
          </div>
        )}

        {/* ── Step 1: the thali ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <Card>
              <h3 className="text-[1.05rem] mb-1">Lay out the thali</h3>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                He has to drag the diya in a full circle to complete the aarti before the rakhi will
                even come off the plate.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Chip
                  on={draft.thali.diya}
                  onClick={() => patch({ thali: { ...draft.thali, diya: !draft.thali.diya } })}
                  title="Lit Diya"
                  subtitle="Required for the aarti gesture"
                  emoji="🪔"
                />
                <Chip
                  on={draft.thali.roli}
                  onClick={() => patch({ thali: { ...draft.thali, roli: !draft.thali.roli } })}
                  title="Roli & Chawal"
                  subtitle="For the tilak"
                  emoji="🔴"
                />
              </div>
              {!draft.thali.diya && (
                <p className="text-[0.76rem] text-gulabi-deep font-semibold mt-2.5 leading-snug">
                  Without a diya he skips the aarti entirely. Bold choice.
                </p>
              )}
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-1">Mithai</h3>
              <p className="text-[0.82rem] text-espresso/55 leading-snug mb-3">
                Pick up to three. They appear on the plate in 3D.
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {MITHAI.map((id: MithaiId) => (
                  <Chip
                    key={id}
                    on={draft.thali.mithai.includes(id)}
                    onClick={() => toggleMithai(id)}
                    title={MITHAI_META[id].name}
                    emoji={MITHAI_META[id].emoji}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── Step 2: the message ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <Card>
              <TextArea
                label="Personal message"
                value={draft.wishes}
                rows={5}
                maxLength={600}
                placeholder={`Happy Raksha Bandhan, ${draft.brotherName || 'idiot'}. You are legally required to read all of this.`}
                hint={`${draft.wishes.length}/600 · longer messages make a longer link`}
                onChange={(event) => patch({ wishes: event.target.value })}
              />
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎙️</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[1.02rem]">Send it as a voice note</h3>
                  <p className="text-[0.79rem] text-espresso/55 leading-snug mt-0.5">
                    His phone reads your message aloud over a waveform. Costs zero extra characters
                    in the link, unlike real audio.
                  </p>
                </div>
              </div>
              <Chip
                className="mt-3"
                on={draft.voiceNote}
                onClick={() => patch({ voiceNote: !draft.voiceNote })}
                title={draft.voiceNote ? 'Voice note is ON' : 'Voice note is OFF'}
                subtitle={draft.voiceNote ? 'Auto-plays when he opens the invoice' : 'Text only'}
                emoji={draft.voiceNote ? '🔊' : '🔇'}
              />
              {draft.voiceNote && draft.wishes.trim() && (
                <div className="mt-3">
                  <p className="font-display font-bold text-[0.78rem] uppercase tracking-wide text-espresso/50 mb-1.5">
                    Preview
                  </p>
                  <VoiceNote text={draft.wishes} speaker={draft.sisterName} />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Step 3: the invoice + UPI ────────────────────────────────── */}
        {step === 3 && (
          <div className="mt-6 space-y-4">
            <Card>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="text-[1.05rem]">Sibling Tax Invoice</h3>
                <span className="num text-[1.1rem] text-gulabi-deep">{inr(billTotal)}</span>
              </div>
              <p className="text-[0.8rem] text-espresso/55 leading-snug mb-3">
                Itemise the emotional labour. Edit anything.
              </p>

              <div className="space-y-2.5">
                {draft.bill.map((line, i) => (
                  <BillRow
                    key={i}
                    line={line}
                    onChange={(next) =>
                      patch({ bill: draft.bill.map((l, j) => (j === i ? next : l)) })
                    }
                    onRemove={() => patch({ bill: draft.bill.filter((_, j) => j !== i) })}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <Btn
                  tone="cream"
                  size="sm"
                  onClick={() => {
                    if (draft.bill.length >= 12) {
                      toast('Twelve charges is already merciless', 'info')
                      return
                    }
                    patch({ bill: [...draft.bill, { label: '', amt: 500 }] })
                  }}
                >
                  + Blank row
                </Btn>
                <Btn tone="cream" size="sm" onClick={() => setSuggestOpen(true)}>
                  💡 Ideas
                </Btn>
              </div>
            </Card>

            <Card>
              <h3 className="text-[1.05rem] mb-2">Amount demanded</h3>
              <Chip
                on={autoTotal}
                onClick={() => {
                  setAutoTotal(!autoTotal)
                  if (autoTotal) patch({ demandAmt: billTotal })
                }}
                title={autoTotal ? 'Auto: sum of the invoice' : 'Manual override'}
                subtitle={autoTotal ? inr(billTotal) : 'Set your own final figure'}
                emoji="🧾"
              />
              {!autoTotal && (
                <AmountField
                  className="mt-3"
                  label="Final demand"
                  value={draft.demandAmt}
                  onChange={(value) => patch({ demandAmt: value })}
                  hint="Round it up. Generously."
                />
              )}
            </Card>

            <QrUploadPanel
              qrImage={draft.qrImage}
              onChange={(qrImage) => patch({ qrImage })}
            />

            <Card>
              <h3 className="text-[1.05rem] mb-3">He will see this</h3>
              <BillTable
                lines={draft.bill.filter((l) => l.label.trim() && l.amt > 0)}
                total={demand}
                totalLabel="Sibling Tax due"
              />
            </Card>
          </div>
        )}
        <CreatorFooter />
      </div>

      <Sheet
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        title="Charges you forgot"
        footer={
          <Btn tone="cream" block onClick={() => setSuggestOpen(false)}>
            Done
          </Btn>
        }
      >
        <div className="space-y-2.5">
          {BILL_SUGGESTIONS.map((suggestion) => {
            const already = draft.bill.some((line) => line.label === suggestion.label)
            return (
              <button
                key={suggestion.label}
                type="button"
                disabled={already}
                onClick={() => {
                  patch({ bill: [...draft.bill, { ...suggestion }] })
                  toast(`Added: ${suggestion.label}`)
                }}
                className="w-full toy-card-flat !p-3.5 flex items-center gap-3 text-left disabled:opacity-40 active:translate-y-[2px]"
              >
                <span className="flex-1 text-[0.86rem] leading-snug">{suggestion.label}</span>
                <span className="num text-[0.9rem] text-gulabi-deep">{inr(suggestion.amt)}</span>
                <span className="text-espresso/35">{already ? '✔' : '+'}</span>
              </button>
            )
          })}
        </div>
      </Sheet>
    </Screen>
  )
}
