/**
 * Privacy.tsx — `#privacy`. The claim on the home screen is "100% Encrypted &
 * Private", so this page has to back it up honestly: what the architecture
 * guarantees, and the one thing it deliberately doesn't. Nothing here is
 * marketing — every point maps to something real in crypto.ts / route.ts.
 */

import { goHome } from '../lib/route'
import { cryptoSupported } from '../lib/crypto'
import { BackBtn, Btn, Card, Screen, Tag, TopBar, Well, useNoWebGL } from '../ui/kit'
import { Stage, GroundShadow, Turntable, Bob } from '../three/Stage'
import { Rakhi3D } from '../three/Rakhi3D'
import { defaultRakhi } from '../lib/payload'

function Point({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="!p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none shrink-0 mt-0.5">{emoji}</span>
        <div className="min-w-0">
          <h3 className="text-[1.08rem] leading-tight">{title}</h3>
          <p className="text-[0.86rem] text-espresso/65 leading-relaxed mt-1">{children}</p>
        </div>
      </div>
    </Card>
  )
}

export function Privacy() {
  const noWebGL = useNoWebGL()
  const supported = cryptoSupported()

  return (
    <Screen
      header={<TopBar title="Encrypted & Private" left={<BackBtn onClick={goHome} />} />}
    >
      <div className="max-w-md mx-auto pb-10 space-y-4">
        <div className="text-center pt-2">
          {noWebGL ? (
            <div className="h-40 grid place-items-center text-7xl animate-bob" aria-hidden>
              🔒
            </div>
          ) : (
            <Stage className="h-40" cameraPosition={[0, 0.2, 4.6]} fov={40}>
              <Turntable autoSpin={0.4} tilt initialY={-0.3}>
                <Bob amount={0.06}>
                  <Rakhi3D spec={{ ...defaultRakhi(), thread: 'crystal' }} scale={0.9} />
                </Bob>
              </Turntable>
              <GroundShadow y={-1.3} radius={1.4} opacity={0.13} />
            </Stage>
          )}
          <Tag tone="gold" className="mt-1">
            How this stays private
          </Tag>
          <h1 className="text-[1.9rem] leading-tight mt-2.5">Nothing you make ever reaches a server</h1>
          <p className="text-[0.9rem] text-espresso/60 leading-snug mt-2 px-3">
            There is no backend to reach. The whole exchange happens inside your browser and inside the
            link itself.
          </p>
        </div>

        <Point emoji="🚫" title="No account, no database, no server">
          You never sign up. There are no logins, no emails, no phone numbers, no passwords — because
          there is nowhere to store them. The site is plain static files. We literally cannot read your
          data, because we never receive any of it.
        </Point>

        <Point emoji="🔐" title="Encrypted on your device with AES-GCM 256">
          Every rakhi, invoice and reply is encrypted right here in your browser using the native Web
          Crypto API. A fresh 256-bit key is generated on your device for each link and never leaves
          it except inside that link.
        </Point>

        <Point emoji="🔗" title="The link is the data — and the link skips the server">
          Everything rides in the part of the URL after the <span className="num">#</span>. By web
          standard (RFC 3986) browsers strip that fragment before sending a request, so the host, the
          CDN and any analytics only ever see a bare page load. The payload exists only in your
          device's memory.
        </Point>

        <Point emoji="🛡️" title="Tamper-evident by design">
          AES-GCM is authenticated encryption. If a sibling tries to edit the invoice or the payout
          inside a link you sent, the maths stops matching and the app refuses to open it rather than
          showing forged numbers.
        </Point>

        <Point emoji="🎟️" title="Vouchers stay on your device">
          The one thing we keep is your Duty Voucher wallet, saved in this browser's local storage so
          coupons survive after the link is gone. It never syncs anywhere. Clear your browser data and
          it clears too.
        </Point>

        <Point emoji="💸" title="Your UPI ID is only ever used to build a link">
          When you attach a UPI ID, it is used purely on-device to assemble a standard{' '}
          <span className="num">upi://pay</span> deep link and QR for your sibling's payment app. No
          money and no bank detail passes through us.
        </Point>

        <Well>
          <p className="font-display font-bold text-[0.82rem] text-espresso mb-1.5">
            The honest part 👇
          </p>
          <p className="text-[0.82rem] text-espresso/65 leading-relaxed">
            The decryption key travels inside the same link — that is exactly what lets this work with
            no accounts. So anyone who gets the <em>full link</em> can open it. Its privacy is the
            privacy of the chat you paste it into: keep the host blind, and share the link only with
            the sibling it's meant for.
          </p>
        </Well>

        {!supported && (
          <Well className="!bg-gulabi/10 border-gulabi">
            <p className="text-[0.82rem] text-gulabi-deep leading-snug">
              ⚠️ This browser doesn't expose the Web Crypto API, so links can't be created or opened
              here. Try a current version of Chrome, Safari, Firefox or Edge.
            </p>
          </Well>
        )}

        <Btn tone="pink" block size="lg" onClick={goHome}>
          Got it — back home →
        </Btn>
      </div>
    </Screen>
  )
}
