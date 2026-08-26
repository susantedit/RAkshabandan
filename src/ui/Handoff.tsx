/**
 * Handoff.tsx — the moment a capsule becomes a link.
 *
 * Every flow ends here: encrypt the payload, mint the URL, and get it into the
 * sibling's chat. Nothing is uploaded, so this panel is the *only* copy of the
 * data — that framing is why it warns before you navigate away.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { encryptCapsule } from '../lib/crypto'
import { buildLink, linkHealth, type CapsulePrefix } from '../lib/route'
import { copyText, shareLink, whatsappLink } from '../lib/share'
import { qrDataUrl } from '../lib/upi'
import { celebrate } from '../lib/haptics'
import { Btn, Card, Well, toast } from './kit'

export interface CapsuleLink {
  link: string
  building: boolean
  build: (payload: unknown) => Promise<string | null>
  reset: () => void
}

/** Encrypts a payload into a shareable link. */
export function useCapsuleLink(prefix: CapsulePrefix): CapsuleLink {
  const [link, setLink] = useState('')
  const [building, setBuilding] = useState(false)

  const build = useCallback(
    async (payload: unknown) => {
      setBuilding(true)
      try {
        const capsule = await encryptCapsule(payload)
        const url = buildLink(prefix, capsule)
        setLink(url)
        return url
      } catch (err) {
        console.error('[handoff] encryption failed', err)
        toast('Encryption failed on this device', 'warn')
        return null
      } finally {
        setBuilding(false)
      }
    },
    [prefix],
  )

  return { link, building, build, reset: () => setLink('') }
}

export function Handoff({
  link,
  title,
  blurb,
  message,
  cta,
  tone = 'gold',
  children,
}: {
  link: string
  title: string
  blurb: string
  /** Text that travels with the link into WhatsApp / the share sheet. */
  message: string
  cta: string
  tone?: 'gold' | 'pink' | 'mint'
  children?: ReactNode
}) {
  const [qr, setQr] = useState('')
  const [showQr, setShowQr] = useState(false)
  const health = linkHealth(link)

  useEffect(() => {
    if (!showQr || !link) return
    let alive = true
    qrDataUrl(link, 620)
      .then((url) => alive && setQr(url))
      .catch(() => alive && toast('Link is too long for a QR code', 'warn'))
    return () => {
      alive = false
    }
  }, [showQr, link])

  // The link is the only copy of the data — nudge before it's lost.
  useEffect(() => {
    if (!link) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [link])

  const full = `${message}\n${link}`

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-4xl mb-1">🔗</div>
        <h2 className="text-[1.3rem]">{title}</h2>
        <p className="text-[0.88rem] text-espresso/60 leading-snug mt-1.5">{blurb}</p>
      </Card>

      <Card className="space-y-3">
        <Btn
          tone={tone === 'gold' ? 'gold' : tone}
          block
          size="lg"
          onClick={async () => {
            const outcome = await shareLink('Rakhi Forge', message, link)
            if (outcome === 'shared') celebrate()
            if (outcome === 'copied') toast('Link copied — paste it in your chat')
            if (outcome === 'failed') toast('Use the copy button below', 'info')
          }}
        >
          {cta}
        </Btn>

        <div className="grid grid-cols-2 gap-3">
          <Btn
            tone="mint"
            onClick={async () => {
              if (await copyText(link)) toast('Link copied 📋')
              else toast('Copy blocked — select it manually', 'warn')
            }}
          >
            📋 Copy link
          </Btn>
          <a href={whatsappLink(full)} target="_blank" rel="noreferrer" className="contents">
            <Btn tone="cream" block>
              💬 WhatsApp
            </Btn>
          </a>
        </div>

        <div className="toy-well p-3">
          <p className="text-[0.68rem] font-mono break-all text-espresso/55 leading-relaxed max-h-24 overflow-y-auto">
            {link}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-[0.72rem] leading-snug flex-1 ${
              health.ok ? 'text-espresso/45' : 'text-gulabi-deep font-semibold'
            }`}
          >
            {health.length.toLocaleString('en-IN')} characters · {health.note}
          </p>
          <Btn tone="cream" size="sm" onClick={() => setShowQr((v) => !v)}>
            {showQr ? 'Hide QR' : 'QR'}
          </Btn>
        </div>

        {showQr && qr && (
          <div className="flex flex-col items-center gap-2 pt-1">
            <div className="p-2.5 bg-puffy rounded-2xl border-[3px] border-clayline">
              <img src={qr} alt="QR code for this link" className="w-44 h-44 block" />
            </div>
            <p className="text-[0.7rem] text-espresso/45 text-center">
              Scan to move this from your laptop to your phone.
            </p>
          </div>
        )}
      </Card>

      {children}

      <Well>
        <p className="text-[0.78rem] leading-relaxed text-espresso/60">
          <strong className="text-espresso">This link is the only copy.</strong> Everything inside it
          is encrypted on your device and nothing was saved anywhere — if you close this tab without
          sending it, it is genuinely gone.
        </p>
      </Well>
    </div>
  )
}
