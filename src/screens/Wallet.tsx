/**
 * Wallet.tsx — `#wallet`. The one screen backed by localStorage instead of a
 * link, because Duty Vouchers are meant to outlive the message they arrived in.
 * Still zero-server: this reads and writes only the sister's own device.
 */

import { useMemo, useState } from 'react'
import { go, goHome } from '../lib/route'
import {
  clearWallet,
  loadWallet,
  redeemVoucher,
  removeVoucher,
  unredeemVoucher,
  type WalletVoucher,
} from '../lib/storage'
import { celebrate, tap as hapticTap } from '../lib/haptics'
import { BackBtn, Btn, Card, Screen, Tag, toast, TopBar, Well } from '../ui/kit'

function VoucherCard({
  voucher,
  onRedeem,
  onUndo,
  onRemove,
}: {
  voucher: WalletVoucher
  onRedeem: () => void
  onUndo: () => void
  onRemove: () => void
}) {
  return (
    <div className={`toy-card-flat !p-4 ${voucher.redeemed ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none shrink-0">{voucher.emoji}</span>
        <div className="min-w-0 flex-1">
          <p
            className={`font-display font-bold text-[0.95rem] leading-tight ${
              voucher.redeemed ? 'line-through text-espresso/45' : ''
            }`}
          >
            {voucher.title}
          </p>
          <p className="text-[0.76rem] text-espresso/55 leading-snug mt-0.5">{voucher.note}</p>
        </div>
        <button
          type="button"
          aria-label={`Remove ${voucher.title}`}
          onClick={onRemove}
          className="shrink-0 w-8 h-8 -mt-1 -mr-1 rounded-xl text-espresso/30 hover:text-gulabi-deep grid place-items-center active:translate-y-[2px]"
        >
          ✕
        </button>
      </div>

      <div className="mt-3">
        {voucher.redeemed ? (
          <div className="flex items-center justify-between gap-3">
            <p className="font-display font-bold text-[0.78rem] text-pista-deep">✔ Redeemed</p>
            <Btn tone="cream" size="sm" onClick={onUndo}>
              Undo
            </Btn>
          </div>
        ) : (
          <Btn tone="pink" size="sm" block onClick={onRedeem}>
            Redeem Now
          </Btn>
        )}
      </div>
    </div>
  )
}

export function Wallet() {
  const [wallet, setWallet] = useState<WalletVoucher[]>(() => loadWallet())
  const [confirmClear, setConfirmClear] = useState(false)

  const unredeemed = useMemo(() => wallet.filter((v) => !v.redeemed).length, [wallet])

  // Coupons group under the sibling who signed them, so a stack from two
  // brothers never blurs together.
  const groups = useMemo(() => {
    const map = new Map<string, WalletVoucher[]>()
    for (const voucher of wallet) {
      const list = map.get(voucher.from) ?? []
      list.push(voucher)
      map.set(voucher.from, list)
    }
    return Array.from(map, ([from, items]) => ({ from, items }))
  }, [wallet])

  if (wallet.length === 0) {
    return (
      <Screen header={<TopBar title="Voucher Wallet" left={<BackBtn onClick={goHome} />} />}>
        <div className="max-w-md mx-auto min-h-full flex flex-col justify-center pb-10">
          <div className="text-center">
            <div className="text-7xl mb-3">🎟️</div>
            <h2 className="text-[1.5rem] leading-tight">No vouchers yet</h2>
            <p className="text-[0.9rem] text-espresso/60 leading-snug mt-2 px-4">
              When a brother pays in favours instead of cash, his signed Duty Vouchers land here — and
              stay, so you can redeem them long after the link is gone.
            </p>
          </div>
          <Well className="mt-6">
            <p className="text-[0.8rem] text-espresso/60 leading-snug">
              🔒 Saved only on this device, in this browser. Nothing is uploaded, and clearing your
              browser data clears these too.
            </p>
          </Well>
          <Btn tone="pink" block size="lg" className="mt-6" onClick={() => go('make-rakhi')}>
            Forge a Rakhi →
          </Btn>
          <Btn tone="cream" block className="mt-3" onClick={goHome}>
            ← Home
          </Btn>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      header={
        <TopBar
          title="Voucher Wallet"
          subtitle={`${unredeemed} unredeemed · ${wallet.length} total`}
          left={<BackBtn onClick={goHome} />}
        />
      }
    >
      <div className="max-w-md mx-auto pb-8 space-y-5">
        {groups.map(({ from, items }) => (
          <div key={from} className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <Tag tone="brother">Signed by {from}</Tag>
              <span className="text-[0.74rem] text-espresso/40 num">
                {items.filter((v) => !v.redeemed).length}/{items.length} left
              </span>
            </div>
            {items.map((voucher) => (
              <VoucherCard
                key={voucher.key}
                voucher={voucher}
                onRedeem={() => {
                  setWallet(redeemVoucher(voucher.key, Date.now()))
                  celebrate()
                  toast('Redeemed. Go collect.')
                }}
                onUndo={() => {
                  setWallet(unredeemVoucher(voucher.key))
                  hapticTap()
                }}
                onRemove={() => {
                  setWallet(removeVoucher(voucher.key))
                  toast('Voucher removed')
                }}
              />
            ))}
          </div>
        ))}

        <Well>
          <p className="text-[0.78rem] text-espresso/60 leading-snug">
            🔒 This wallet lives only in this browser on this device. It is never uploaded, and no one
            else can see it.
          </p>
        </Well>

        {confirmClear ? (
          <div className="grid grid-cols-2 gap-3">
            <Btn
              tone="pink"
              block
              silent
              onClick={() => {
                setWallet(clearWallet())
                setConfirmClear(false)
                toast('Wallet cleared')
              }}
            >
              Yes, wipe it
            </Btn>
            <Btn tone="cream" block onClick={() => setConfirmClear(false)}>
              Cancel
            </Btn>
          </div>
        ) : (
          <Btn tone="cream" block onClick={() => setConfirmClear(true)}>
            🗑️ Clear all vouchers
          </Btn>
        )}
      </div>
    </Screen>
  )
}
