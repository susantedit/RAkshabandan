/** share.ts — clipboard + native share, with graceful degradation everywhere. */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }

  // Legacy fallback — still needed for non-secure contexts and older WebViews.
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    el.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export function whatsappLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function telegramLink(url: string, message: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`
}

export type ShareOutcome = 'shared' | 'copied' | 'failed'

/**
 * Prefers the OS share sheet, falls back to the clipboard. `AbortError` means
 * the user consciously dismissed the sheet, so we report that as a no-op rather
 * than silently copying behind their back.
 */
export async function shareLink(title: string, text: string, url: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'failed'
    }
  }
  return (await copyText(`${text}\n${url}`)) ? 'copied' : 'failed'
}

export async function shareFile(file: File, title: string, text: string): Promise<ShareOutcome> {
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text })
      return 'shared'
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'failed'
  }
  return 'failed'
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give Safari a beat before revoking, or the download aborts.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
