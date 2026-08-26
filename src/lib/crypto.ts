/**
 * crypto.ts — Zero-knowledge URL-fragment capsules.
 *
 * Wire format:  #<prefix>=<ciphertext>.<iv>.<key>     (all base64url)
 *
 * WHAT THIS GUARANTEES
 *  • Server blindness. Per RFC 3986 the browser strips everything from `#`
 *    onward before issuing the HTTP request. The host, the CDN and any
 *    analytics only ever see `GET /`. The payload exists solely in device RAM.
 *  • Tamper evidence. AES-GCM is authenticated: flipping a single bit in the
 *    ciphertext makes `decrypt` throw rather than silently yield garbage, so a
 *    sibling cannot edit the invoice inside a link they were sent.
 *  • Unguessability. No sequential IDs, no `/view/1`. Each link is an isolated
 *    capsule; you cannot enumerate your way to somebody else's.
 *
 * WHAT IT DOES NOT DO
 *  • The key travels inside the same fragment, by design — that is what makes
 *    the exchange work with no accounts and no database. So anyone who obtains
 *    the full link can read it. Confidentiality is exactly the confidentiality
 *    of the DM you paste it into. That's the intended threat model here: keep
 *    the host blind, not keep the recipient out.
 */

/* ── base64url (fragment-safe: no `+`, `/`, or `=` for chat apps to mangle) ── */

const B64_CHUNK = 0x8000 // 32 KiB — keeps String.fromCharCode off the stack limit

export function toB64Url(bytes: Uint8Array): string {
  let raw = ''
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    raw += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK))
  }
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64Url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/* ── deflate-raw, so nested payloads stay inside a pasteable link length ──── */

const FLAG_DEFLATED = 0x43 // 'C'
const FLAG_PLAIN = 0x50 // 'P'

const canCompress = typeof CompressionStream !== 'undefined'
const canDecompress = typeof DecompressionStream !== 'undefined'

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  transform: ReadableWritablePair,
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (!canCompress) return bytes
  try {
    return await pipe(bytes, new CompressionStream('deflate-raw'))
  } catch {
    return bytes
  }
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (!canDecompress) throw new Error('DecompressionStream unavailable')
  return pipe(bytes, new DecompressionStream('deflate-raw'))
}

/* ── encrypt / decrypt ───────────────────────────────────────────────────── */

/** Encrypts a JSON-serialisable object into a `<data>.<iv>.<key>` capsule. */
export async function encryptCapsule(data: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(data))

  const squeezed = await deflate(json)
  const useDeflate = squeezed !== json && squeezed.length < json.length

  // One byte of self-description so decode never has to guess.
  const body = useDeflate ? squeezed : json
  const plaintext = new Uint8Array(body.length + 1)
  plaintext[0] = useDeflate ? FLAG_DEFLATED : FLAG_PLAIN
  plaintext.set(body, 1)

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const rawKey = await crypto.subtle.exportKey('raw', key)

  return [
    toB64Url(new Uint8Array(cipher)),
    toB64Url(iv),
    toB64Url(new Uint8Array(rawKey)),
  ].join('.')
}

/** Decrypts a capsule. Returns `null` for anything tampered with or malformed. */
export async function decryptCapsule<T = unknown>(capsule: string): Promise<T | null> {
  try {
    const [b64Data, b64Iv, b64Key] = capsule.split('.')
    if (!b64Data || !b64Iv || !b64Key) return null

    const key = await crypto.subtle.importKey(
      'raw',
      fromB64Url(b64Key),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )

    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64Url(b64Iv) },
        key,
        fromB64Url(b64Data),
      ),
    )

    const body = plain.subarray(1)
    const json = plain[0] === FLAG_DEFLATED ? await inflate(body) : body
    return JSON.parse(new TextDecoder().decode(json)) as T
  } catch {
    // Authentication-tag failure, truncated link, or foreign data. All the same
    // to us: the capsule is not trustworthy, so we refuse to render it.
    console.warn('[capsule] tampered, truncated, or invalid payload')
    return null
  }
}

/** True when this browser can run the experience at all. */
export function cryptoSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.generateKey === 'function'
  )
}
