/**
 * upi.ts — real UPI deep links + QR codes, generated entirely on-device.
 *
 * The VPA never leaves the browser except inside the encrypted capsule the user
 * pastes into their own chat. We neither validate it against a server nor
 * initiate any payment ourselves — tapping the button hands off to the user's
 * own UPI app, which is where the money actually moves.
 */

import QRCode from 'qrcode'

export interface UpiRequest {
  /** Payee VPA, e.g. `sneha@okhdfcbank` */
  vpa: string
  /** Payee display name */
  name: string
  /** Amount in rupees. `0` produces an open-amount link. */
  amount: number
  /** Transaction note shown inside the UPI app */
  note: string
}

/**
 * Deliberately lenient: handles are `user@bank`, and banks keep inventing new
 * suffixes. We only reject things that clearly cannot be a VPA.
 */
export function isValidVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,60})@[a-zA-Z][a-zA-Z0-9.-]{1,40}$/.test(vpa.trim())
}

export function buildUpiUri({ vpa, name, amount, note }: UpiRequest): string {
  const params = new URLSearchParams()
  params.set('pa', vpa.trim())
  if (name.trim()) params.set('pn', name.trim())
  if (amount > 0) params.set('am', String(Math.round(amount)))
  params.set('cu', 'INR')
  if (note.trim()) params.set('tn', note.trim().slice(0, 80))
  return `upi://pay?${params.toString()}`
}

/**
 * QR rendered in the Festive Toybox palette. Used for UPI URIs and also for
 * share links, so a desktop user can hand the capsule to their phone.
 */
export async function qrDataUrl(text: string, size = 560): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: { dark: '#2B2523ff', light: '#FFFFFFff' },
  })
}

export const upiQrDataUrl = qrDataUrl

/**
 * Fires the UPI intent. Desktop browsers have no handler for `upi://`, so the
 * caller should surface the QR as the fallback path rather than assume success.
 */
export function openUpiApp(uri: string): void {
  window.location.href = uri
}

export function isLikelyMobile(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

/**
 * Scales down an uploaded QR image file (Fonepay, eSewa, Khalti, Bank)
 * to a lightweight JPEG Data URL (max 420x420 px) so it easily fits
 * inside encrypted hash payload capsules.
 */
export function compressQrImage(file: File, maxDim = 220, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas context unavailable'))
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
