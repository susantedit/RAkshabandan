/**
 * bits.tsx — shared display pieces used across more than one screen: the
 * itemised bill, the voice-note simulator, the UPI request panel, and the
 * story-card export button.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { inr } from '../lib/money'
import type { BillLine } from '../lib/payload'
import { buildUpiUri, compressQrImage, isLikelyMobile, isValidVpa, openUpiApp, qrDataUrl } from '../lib/upi'
import { downloadBlob, shareFile } from '../lib/share'
import { renderStoryCard, type StorySpec } from '../lib/story'
import { celebrate, tap as hapticTap } from '../lib/haptics'
import { Btn, Card, Tag, Well, toast } from './kit'
import { IconCamera, IconCheck, IconCreditCard, IconQr } from './icons'

/* ── itemised bill ───────────────────────────────────────────────────────── */

export function BillTable({
  lines,
  total,
  totalLabel = 'Total payable',
  struck,
  className,
}: {
  lines: BillLine[]
  total: number
  totalLabel?: string
  /** Per-row deduction, shown struck through in audit red. */
  struck?: (index: number) => number | null
  className?: string
}) {
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const cut = struck?.(i) ?? null
        return (
          <div key={`${line.label}-${i}`} className="tear py-2.5 flex items-baseline gap-3">
            <span className="flex-1 text-[0.88rem] leading-snug text-espresso/80">{line.label}</span>
            {cut ? (
              <span className="text-right shrink-0">
                <span className="num text-[0.8rem] text-espresso/35 line-through block">
                  {inr(line.amt)}
                </span>
                <span className="num text-[0.95rem] text-gulabi-deep block">
                  {inr(Math.max(0, line.amt - cut))}
                </span>
              </span>
            ) : (
              <span className="num text-[0.95rem] shrink-0">{inr(line.amt)}</span>
            )}
          </div>
        )
      })}
      <div className="pt-3 mt-1 border-t-[3px] border-espresso border-dashed flex items-baseline gap-3">
        <span className="flex-1 font-display font-bold uppercase tracking-wide text-[0.8rem] text-espresso/60">
          {totalLabel}
        </span>
        <span className="num text-[1.35rem]">{inr(total)}</span>
      </div>
    </div>
  )
}

/* ── voice note simulation ───────────────────────────────────────────────── */

/**
 * A "voice note" that costs zero bytes in the link: the message text is read
 * aloud by the device's own speech synthesiser over a live waveform. Real audio
 * would add several KB of base64 per second and make the link unshareable.
 */
export function VoiceNote({
  text,
  speaker,
  autoPlay = false,
}: {
  text: string
  speaker: string
  autoPlay?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const started = useRef(false)

  const stop = useCallback(() => {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (!supported || !text.trim()) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.96
      utterance.pitch = 1.05
      const hindi = window.speechSynthesis
        .getVoices()
        .find((voice) => /^(hi|en-IN)/i.test(voice.lang))
      if (hindi) utterance.voice = hindi
      utterance.onend = () => setPlaying(false)
      utterance.onerror = () => setPlaying(false)
      setPlaying(true)
      window.speechSynthesis.speak(utterance)
    } catch {
      setPlaying(false)
      toast('Your browser blocked audio playback', 'warn')
    }
  }, [supported, text])

  useEffect(() => {
    if (autoPlay && !started.current && text.trim()) {
      started.current = true
      // Give the reveal animation a beat before talking over it.
      const id = window.setTimeout(play, 700)
      return () => window.clearTimeout(id)
    }
  }, [autoPlay, play, text])

  useEffect(() => stop, [stop])

  const bars = 34

  return (
    <Well className="!py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? 'Stop voice note' : 'Play voice note'}
          onClick={() => {
            hapticTap()
            playing ? stop() : play()
          }}
          className="shrink-0 w-12 h-12 rounded-full bg-gulabi border-[3px] border-espresso shadow-[0_4px_0_var(--color-espresso)] active:translate-y-1 active:shadow-none text-white text-lg grid place-items-center no-select"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[3px] h-8">
            {Array.from({ length: bars }, (_, i) => (
              <span
                key={i}
                className="flex-1 rounded-full bg-gulabi/70"
                style={{
                  height: playing
                    ? `${18 + Math.abs(Math.sin(i * 0.7)) * 80}%`
                    : `${16 + Math.abs(Math.sin(i * 0.7)) * 34}%`,
                  animation: playing ? `wave 0.7s ${i * 0.035}s ease-in-out infinite alternate` : undefined,
                }}
              />
            ))}
          </div>
          <p className="text-[0.7rem] text-espresso/45 mt-1 truncate">
            Voice note from {speaker || 'your sibling'}
            {!supported && ' · playback unsupported here'}
          </p>
        </div>
      </div>
      <style>{`@keyframes wave { from { transform: scaleY(0.45); } to { transform: scaleY(1); } }`}</style>
    </Well>
  )
}

/* ── UPI ─────────────────────────────────────────────────────────────────── */

export function UpiPanel({
  vpa,
  name,
  amount,
  note,
  cta = 'Pay with any UPI app',
  mode = 'pay',
  className,
}: {
  vpa: string
  name: string
  amount: number
  note: string
  cta?: string
  /**
   * `pay` — the *payer* taps to open their own UPI app (the brother settling).
   * `collect` — the *payee* shows/sends the QR for the other side to scan (the
   * sister). Crucially, collect mode never calls `openUpiApp`, so tapping it can
   * no longer make the sister pay her own VPA.
   */
  mode?: 'pay' | 'collect'
  className?: string
}) {
  const [qr, setQr] = useState<string>('')
  const [sending, setSending] = useState(false)
  const valid = isValidVpa(vpa)
  const uri = valid ? buildUpiUri({ vpa, name, amount, note }) : ''

  useEffect(() => {
    if (!uri) {
      setQr('')
      return
    }
    let alive = true
    qrDataUrl(uri, 520)
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(''))
    return () => {
      alive = false
    }
  }, [uri])

  if (!valid) {
    return (
      <Well className={className}>
        <p className="text-[0.85rem] text-espresso/60 leading-snug">
          No UPI ID was attached to this link, so settle it the old-fashioned way — in person, with
          interest.
        </p>
      </Well>
    )
  }

  // Collect mode: the sister hands the QR to her brother. She is the payee, so
  // there is deliberately no "pay" button here — the QR is the payload and the
  // action shares it, rather than firing her own UPI app at her own VPA.
  if (mode === 'collect') {
    const sendQr = async () => {
      if (!qr) return
      setSending(true)
      try {
        const blob = await (await fetch(qr)).blob()
        const file = new File([blob], 'rakhi-upi-qr.png', { type: 'image/png' })
        const label = amount > 0 ? `Scan to pay ${name} ${inr(amount)}` : `Scan to pay ${name}`
        const outcome = await shareFile(file, 'Rakhi settlement', `${label} · UPI ${vpa}`)
        if (outcome === 'shared') celebrate()
        else {
          downloadBlob(blob, 'rakhi-upi-qr.png')
          toast('QR saved — send it to him 📤')
        }
      } catch {
        toast('Could not prepare the QR', 'warn')
      } finally {
        setSending(false)
      }
    }

    return (
      <div className={className}>
        {qr && (
          <div className="flex flex-col items-center gap-2">
            <div className="p-2.5 bg-puffy rounded-2xl border-[3px] border-clayline shadow-[0_6px_0_var(--color-claydrop)]">
              <img src={qr} alt="UPI payment QR code" className="w-44 h-44 block" />
            </div>
            <p className="num text-[0.8rem] text-espresso/55">{vpa}</p>
          </div>
        )}
        <Btn tone="mint" block size="lg" className="mt-4" onClick={sendQr} disabled={!qr || sending}>
          {sending ? 'Preparing…' : `${cta} →`}
        </Btn>
        <p className="text-center text-[0.74rem] text-espresso/45 mt-2 leading-snug">
          He scans this in any UPI app to pay you{amount > 0 ? ` ${inr(amount)}` : ''}. Nothing is
          ever charged to you.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Btn
        tone="mint"
        block
        size="lg"
        onClick={() => {
          celebrate()
          openUpiApp(uri)
        }}
      >
        {cta} →
      </Btn>
      <p className="text-center text-[0.74rem] text-espresso/45 mt-2 leading-snug">
        Opens GPay / PhonePe / Paytm directly.{' '}
        {!isLikelyMobile() && 'On desktop, scan the QR below with your phone.'}
      </p>
      {qr && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="p-2.5 bg-puffy rounded-2xl border-[3px] border-clayline shadow-[0_6px_0_var(--color-claydrop)]">
            <img src={qr} alt="UPI payment QR code" className="w-40 h-40 block" />
          </div>
          <p className="num text-[0.8rem] text-espresso/55">{vpa}</p>
        </div>
      )}
    </div>
  )
}

/* ── story card ──────────────────────────────────────────────────────────── */

export function StoryCardButton({
  spec,
  filename,
  label = 'Download Story Card',
  tone = 'ink',
}: {
  spec: (photoImage?: string) => StorySpec
  filename: string
  label?: string
  tone?: 'ink' | 'gold' | 'pink' | 'mint' | 'sky' | 'cream'
}) {
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState<string | undefined>()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'warn')
      return
    }
    try {
      const dataUrl = await compressQrImage(file)
      setPhoto(dataUrl)
      celebrate()
      toast('Photo added to story card! 📸')
    } catch {
      toast('Could not process photo', 'warn')
    }
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handlePreview = async () => {
    setBusy(true)
    try {
      const blob = await renderStoryCard(spec(photo))
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch {
      toast('Could not preview story card', 'warn')
    } finally {
      setBusy(false)
    }
  }

  const run = async () => {
    setBusy(true)
    try {
      const blob = await renderStoryCard(spec(photo))
      const file = new File([blob], filename, { type: 'image/png' })
      const outcome = await shareFile(file, 'Sibling Agreement', 'Our Raksha Bandhan settlement 🪢')
      if (outcome !== 'shared') {
        downloadBlob(blob, filename)
        toast('Saved — post it to your story 📸')
      }
      celebrate()
    } catch {
      toast('Could not build the story card', 'warn')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      {photo ? (
        <div className="flex items-center justify-between p-2 rounded-xl bg-puffy border-2 border-clayline">
          <div className="flex items-center gap-2">
            <img src={photo} alt="Story photo" className="w-9 h-9 object-cover rounded-lg" />
            <span className="text-[0.78rem] font-bold text-espresso/70">Photo attached ✔</span>
          </div>
          <button
            type="button"
            onClick={() => setPhoto(undefined)}
            className="text-[0.75rem] font-semibold text-gulabi-deep hover:underline"
          >
            Remove ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl border-2 border-dashed border-marigold/60 text-[0.78rem] font-bold text-marigold-deep hover:bg-clayline/20 flex items-center justify-center gap-2 transition-colors"
        >
          <IconCamera size={18} />
          Add Photo to Story Card (Optional)
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Btn tone="cream" onClick={handlePreview} disabled={busy}>
          👁️ Preview
        </Btn>
        <Btn tone={tone} onClick={run} disabled={busy}>
          {busy ? 'Painting…' : label}
        </Btn>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="max-w-sm w-full bg-kesar rounded-3xl p-4 space-y-3 flex flex-col max-h-[90vh] shadow-2xl border-4 border-clayline">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-espresso">Story Card Preview</h3>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="w-8 h-8 rounded-full bg-clayline text-espresso font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border-2 border-clayline bg-black/5 flex items-center justify-center p-2">
              <img src={previewUrl} alt="Story Card Preview" className="max-h-full object-contain rounded-xl shadow-lg" />
            </div>
            <div className="flex gap-2">
              <Btn tone="cream" block onClick={() => setPreviewUrl(null)}>
                Close
              </Btn>
              <Btn tone="mint" block onClick={() => { setPreviewUrl(null); run() }}>
                Approve & Download 🚀
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── small labelled stat ─────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  tone = 'gold',
  sub,
}: {
  label: string
  value: string
  tone?: 'gold' | 'pink' | 'mint' | 'sky'
  sub?: string
}) {
  const colors = {
    gold: 'text-marigold-deep',
    pink: 'text-gulabi-deep',
    mint: 'text-pista-deep',
    sky: 'text-sky-deep',
  }
  return (
    <Card className="!p-4 text-center">
      <p className="font-display font-bold uppercase tracking-wide text-[0.68rem] text-espresso/50">
        {label}
      </p>
      <p className={`num text-[1.6rem] leading-tight mt-0.5 ${colors[tone]}`}>{value}</p>
      {sub && <p className="text-[0.7rem] text-espresso/45 mt-0.5 leading-snug">{sub}</p>}
    </Card>
  )
}

/* ── Nepal QR Payment Uploader & Display ─────────────────────────────────── */

export function QrUploadPanel({
  qrImage,
  onChange,
  className,
}: {
  qrImage?: string
  onChange: (dataUrl: string) => void
  className?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Please upload an image file (PNG or JPG)', 'warn')
      return
    }
    setLoading(true)
    try {
      const dataUrl = await compressQrImage(file)
      onChange(dataUrl)
      celebrate()
      toast('Nepal Payment QR attached! 🇳🇵')
    } catch {
      toast('Could not process QR image', 'warn')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Card className={className}>
      <h3 className="text-[1.05rem] mb-1">Payment QR Code (Nepal) 🇳🇵</h3>
      <p className="text-[0.8rem] text-espresso/60 leading-snug mb-3">
        Upload your eSewa, Fonepay, Khalti, or Bank QR code image so he can scan and pay you directly.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {qrImage ? (
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-puffy rounded-2xl border-[3px] border-marigold shadow-[0_6px_0_var(--color-marigold-deep)]">
            <img src={qrImage} alt="Uploaded Nepal Payment QR" className="w-44 h-44 object-contain rounded-lg block" />
          </div>
          <div className="flex gap-2">
            <Btn tone="mint" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              {loading ? 'Processing…' : 'Change QR Image 📷'}
            </Btn>
            <Btn tone="pink" size="sm" onClick={() => onChange('')}>
              Remove ✕
            </Btn>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full py-6 px-4 rounded-2xl border-[3px] border-dashed border-marigold/60 hover:border-marigold bg-toy-well text-center flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <span className="text-3xl">📱</span>
          <span className="font-display font-bold text-[0.95rem] text-espresso">
            {loading ? 'Processing QR image…' : 'Click to Upload Payment QR Image'}
          </span>
          <span className="text-[0.76rem] text-espresso/55">
            Fonepay · eSewa · Khalti · Mobile Banking QR
          </span>
        </button>
      )}
    </Card>
  )
}

export function NepalQrDisplayPanel({
  qrImage,
  vpa,
  name,
  amount,
  note,
  cta = 'Pay Now',
  className,
}: {
  qrImage?: string
  vpa?: string
  name: string
  amount: number
  note?: string
  cta?: string
  className?: string
}) {
  const [downloading, setDownloading] = useState(false)

  if (qrImage) {
    const handleDownload = async () => {
      setDownloading(true)
      try {
        const res = await fetch(qrImage)
        const blob = await res.blob()
        downloadBlob(blob, `nepal-payment-qr-${name || 'rakhi'}.jpg`)
        celebrate()
        toast('QR Code downloaded! 🇳🇵')
      } catch {
        toast('Failed to download QR image', 'warn')
      } finally {
        setDownloading(false)
      }
    }

    return (
      <Card className={className}>
        <div className="text-center">
          <Tag tone="gold">Nepal Payment QR 🇳🇵</Tag>
          <h3 className="text-[1.15rem] leading-tight mt-2 mb-1">Scan or Save to Pay</h3>
          <p className="text-[0.82rem] text-espresso/60 leading-snug mb-3">
            Scan this QR code using <strong className="text-espresso">Fonepay, eSewa, Khalti</strong>, or your mobile banking app to pay {name} {amount > 0 ? inr(amount) : ''}.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-puffy rounded-2xl border-[3px] border-marigold shadow-[0_8px_0_var(--color-marigold-deep)]">
              <img src={qrImage} alt="Nepal Payment QR Code" className="w-52 h-52 object-contain rounded-lg block" />
            </div>
            <Btn tone="mint" size="lg" block className="mt-2" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Downloading…' : `Download Payment QR 📥`}
            </Btn>
          </div>
        </div>
      </Card>
    )
  }

  if (vpa) {
    return <UpiPanel vpa={vpa} name={name} amount={amount} note={note || ''} cta={cta} className={className} />
  }

  return (
    <Well className={className}>
      <p className="text-[0.85rem] text-espresso/60 leading-snug text-center">
        No payment QR code was attached. Settle it directly in person or via mobile banking!
      </p>
    </Well>
  )
}
