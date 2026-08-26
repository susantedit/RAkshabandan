/**
 * payload.ts — the four capsule shapes that chain the whole experience.
 *
 *  #s=   Sister  → Brother   rakhi + thali + Sibling Tax invoice + UPI
 *  #br=  Brother → Sister    ...sister payload + counter-offer (roulette/audit/vouchers)
 *  #b=   Brother → Sister    defense (vault / budget contract / early-bird roulette)
 *  #sr=  Sister  → Brother   ...brother payload + tied rakhi + final settlement
 *
 * Every decoded capsule runs through a `normalize*` pass. Links live forever in
 * people's chat history, so a payload from an older build — or a hand-mangled
 * one — must degrade into something renderable instead of white-screening.
 */

export const SCHEMA_VERSION = 1

/* ── Rakhi ────────────────────────────────────────────────────────────────── */

export const THREADS = ['gold', 'neon', 'crimson', 'crystal'] as const
export type ThreadId = (typeof THREADS)[number]

export const GEMS = ['mandala', 'ruby', 'coin', 'monogram'] as const
export type GemId = (typeof GEMS)[number]

export const MITHAI = ['kaju', 'ladoo', 'gulab'] as const
export type MithaiId = (typeof MITHAI)[number]

export interface ThreadMeta {
  id: ThreadId
  name: string
  blurb: string
  swatch: string
  emoji: string
}

export const THREAD_META: Record<ThreadId, ThreadMeta> = {
  gold: {
    id: 'gold',
    name: 'Gold Mesh',
    blurb: 'Braided zari, heirloom energy',
    swatch: '#F2A93B',
    emoji: '🪢',
  },
  neon: {
    id: 'neon',
    name: 'Cyber Neon',
    blurb: 'Glows in the dark, obviously',
    swatch: '#00E5FF',
    emoji: '⚡',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Silk',
    blurb: 'Classic mauli, soft matte',
    swatch: '#E03150',
    emoji: '🧵',
  },
  crystal: {
    id: 'crystal',
    name: 'Diamond Crystal',
    blurb: 'Expensive-looking on purpose',
    swatch: '#BFE9FF',
    emoji: '💎',
  },
}

export const GEM_META: Record<GemId, { id: GemId; name: string; blurb: string; emoji: string }> = {
  mandala: { id: 'mandala', name: 'Traditional Mandala', blurb: 'Layered petal work', emoji: '🕉️' },
  ruby: { id: 'ruby', name: 'Glowing Ruby', blurb: 'Faceted and lit from inside', emoji: '❤️‍🔥' },
  coin: { id: 'coin', name: 'Tech Coin', blurb: 'For the crypto sibling', emoji: '🪙' },
  monogram: { id: 'monogram', name: 'Custom Monogram', blurb: 'Your initial, engraved', emoji: '🔠' },
}

export const MITHAI_META: Record<MithaiId, { id: MithaiId; name: string; emoji: string }> = {
  kaju: { id: 'kaju', name: 'Kaju Barfi', emoji: '🍬' },
  ladoo: { id: 'ladoo', name: 'Ladoo', emoji: '🟡' },
  gulab: { id: 'gulab', name: 'Rasbari', emoji: '🟤' },
}

export interface RakhiSpec {
  thread: ThreadId
  gem: GemId
  monogram: string
}

export interface ThaliSpec {
  diya: boolean
  roli: boolean
  mithai: MithaiId[]
}

/* ── Money ────────────────────────────────────────────────────────────────── */

export interface BillLine {
  label: string
  amt: number
}

export interface Deduction {
  label: string
  amt: number // ceiling the brother may claw back
  applied: number // what the slider actually landed on
}

export interface WheelSlot {
  label: string
  amt: number
  weight: number
  /** 0 blessings · 1 token cash · 2 consolation · 3 jackpot */
  tier: 0 | 1 | 2 | 3
}

export interface Voucher {
  id: string
  title: string
  note: string
  emoji: string
}

/* ── Capsules ─────────────────────────────────────────────────────────────── */

export interface SisterPayload {
  v: number
  kind: 's'
  sisterName: string
  brotherName: string
  rakhi: RakhiSpec
  thali: ThaliSpec
  wishes: string
  voiceNote: boolean
  bill: BillLine[]
  demandAmt: number
  upiId: string
  upiName: string
  qrImage?: string
}

export type ResponseType = 'roulette' | 'audit' | 'voucher'

export interface BrotherReplyPayload {
  v: number
  kind: 'br'
  sister: SisterPayload
  brotherName: string
  responseType: ResponseType
  seed: number
  slots: WheelSlot[]
  deductions: Deduction[]
  finalPayout: number
  vouchers: Voucher[]
  note: string
}

export type DefenseType = 'vault' | 'contract' | 'roulette'

export interface BrotherPayload {
  v: number
  kind: 'b'
  brotherName: string
  sisterName: string
  defenseType: DefenseType
  vault: {
    taps: number
    mode: 'code' | 'meme'
    code: string
    label: string
    meme: string
    /** Used when `meme` is `custom` — the brother's own line. */
    memeText: string
  }
  contract: { budgetCap: number; terms: string[] }
  roulette: { seed: number; slots: WheelSlot[] }
  note: string
}

export interface SisterReplyPayload {
  v: number
  kind: 'sr'
  brother: BrotherPayload
  sisterName: string
  rakhi: RakhiSpec
  status: 'accepted' | 'countered'
  finalDemandAmt: number
  bill: BillLine[]
  upiId: string
  upiName: string
  qrImage?: string
  reaction: string
  note: string
}

export type AnyPayload =
  | SisterPayload
  | BrotherReplyPayload
  | BrotherPayload
  | SisterReplyPayload

/* ── Defaults ─────────────────────────────────────────────────────────────── */

export const DEFAULT_BILL: BillLine[] = [
  { label: 'Rakhi Base Fee (non-refundable)', amt: 1000 },
  { label: 'Covering for your late nights', amt: 1500 },
  { label: 'Emotional support & pep talks', amt: 800 },
  { label: 'Not telling Mumma about the dent', amt: 1200 },
]

export const BILL_SUGGESTIONS: BillLine[] = [
  { label: 'Homework done on your behalf', amt: 600 },
  { label: 'Alibi services (14 incidents)', amt: 1400 },
  { label: 'Phone charger permanently donated', amt: 500 },
  { label: 'Fashion consulting, unpaid till date', amt: 900 },
  { label: 'Emergency samosa deliveries', amt: 350 },
  { label: 'Wi-Fi password reset support', amt: 250 },
]

export const DEFAULT_DEDUCTIONS: Deduction[] = [
  { label: 'Stole my hoodie (still missing)', amt: 800, applied: 800 },
  { label: 'Remote control monopoly tax', amt: 400, applied: 400 },
  { label: 'Ate my share of the biryani', amt: 600, applied: 600 },
  { label: 'Told Mumma about the dent anyway', amt: 700, applied: 700 },
  { label: 'Used my earphones, returned tangled', amt: 300, applied: 300 },
]

export const VOUCHER_DECK: Voucher[] = [
  {
    id: 'icecream',
    title: '1x Midnight Ice Cream Run',
    note: 'Any flavour. No questions. Weather no excuse.',
    emoji: '🍦',
  },
  {
    id: 'blame',
    title: '1x Take Blame From Parents',
    note: 'I will absorb one (1) scolding on your behalf.',
    emoji: '🛡️',
  },
  {
    id: 'driver',
    title: '1x Personal Driver Duty',
    note: 'Drop and pick-up, one round trip, city limits.',
    emoji: '🚗',
  },
  {
    id: 'remote',
    title: '1x Remote Control Surrender',
    note: 'Full TV sovereignty for one evening.',
    emoji: '📺',
  },
  {
    id: 'chores',
    title: '1x Chore Takeover',
    note: 'Your assigned chore becomes mine. Once.',
    emoji: '🧹',
  },
  {
    id: 'photo',
    title: '1x Unlimited Photoshoot',
    note: '200 photos minimum. No complaining. I will retake.',
    emoji: '📸',
  },
  {
    id: 'zomato',
    title: '1x Order Of Your Choice',
    note: 'One food order on me, capped at reasonable greed.',
    emoji: '🍕',
  },
  {
    id: 'silence',
    title: '1x No-Teasing Week',
    note: 'Seven days of complete verbal restraint.',
    emoji: '🤐',
  },
]

export const DEFAULT_CONTRACT_TERMS = [
  'Must bring water on demand for 14 days',
  'No touching my charger, ever again',
  'Amount is final — no revision petitions',
  'One (1) free hoodie return, no argument',
]

export const CONTRACT_TERM_SUGGESTIONS = [
  'Netflix profile stays MINE',
  'You handle the dishes on Sundays',
  'No waking me before 10am on holidays',
  'My snacks are not community property',
  'You answer the door for all deliveries',
  'Zero complaints to Mumma for 30 days',
]

export const MEME_GIFS: { id: string; label: string; emoji: string; caption: string }[] = [
  { id: 'paisa', label: 'Paisa hi paisa hoga', emoji: '🤑', caption: 'PAISA HI PAISA HOGA' },
  { id: 'sad', label: 'Broke brother arc', emoji: '🥲', caption: 'ACCOUNT BALANCE: ₹0.00' },
  { id: 'nahi', label: 'Absolutely not', emoji: '🙅', caption: 'REQUEST DENIED WITH LOVE' },
  { id: 'blessing', label: 'Blessings only', emoji: '🙏', caption: 'ACCEPT BLESSINGS INSTEAD' },
  { id: 'custom', label: 'Write my own', emoji: '✍️', caption: 'A MESSAGE FROM YOUR BROTHER' },
]

/** The vault fields that decide what the troll reward actually says. */
export type VaultTroll = { meme: string; memeText?: string }

/**
 * What gets printed on the troll vault's reward plate. Presets are canned one
 * liners; `custom` lets the brother write his own, which is the whole point of
 * offering it — a stock meme cannot roast a specific sibling.
 */
export function memeCaption(vault: VaultTroll): string {
  const own = (vault.memeText || '').trim()
  if (vault.meme === 'custom') return own ? own.toUpperCase() : 'HE COULD NOT THINK OF ANYTHING'
  return (MEME_GIFS.find((m) => m.id === vault.meme) ?? MEME_GIFS[0]).caption
}

export function memeEmoji(vault: VaultTroll): string {
  return (MEME_GIFS.find((m) => m.id === vault.meme) ?? MEME_GIFS[0]).emoji
}

export function defaultRakhi(): RakhiSpec {
  return { thread: 'gold', gem: 'mandala', monogram: 'R' }
}

export function defaultThali(): ThaliSpec {
  return { diya: true, roli: true, mithai: ['kaju', 'ladoo'] }
}

export function emptySister(): SisterPayload {
  return {
    v: SCHEMA_VERSION,
    kind: 's',
    sisterName: 'Sujita',
    brotherName: 'Susant',
    rakhi: defaultRakhi(),
    thali: defaultThali(),
    wishes: 'Happy Raksha Bandhan! Send my shagun right now 💖',
    voiceNote: false,
    bill: DEFAULT_BILL.map((b) => ({ ...b })),
    demandAmt: sumBill(DEFAULT_BILL),
    upiId: '',
    upiName: '',
  }
}

export function emptyBrother(): BrotherPayload {
  return {
    v: SCHEMA_VERSION,
    kind: 'b',
    brotherName: 'Susant',
    sisterName: 'Sujita',
    defenseType: 'vault',
    vault: {
      taps: 30,
      mode: 'code',
      code: '',
      label: 'Gift Voucher',
      meme: 'paisa',
      memeText: '',
    },
    contract: { budgetCap: 101, terms: DEFAULT_CONTRACT_TERMS.slice(0, 3) },
    roulette: { seed: 0, slots: [] },
    note: "Happy Raksha Bandhan! Here's your gift 🎁",
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function sumBill(bill: BillLine[]): number {
  return bill.reduce((total, line) => total + (Number(line.amt) || 0), 0)
}

export function sumApplied(deductions: Deduction[]): number {
  return deductions.reduce((total, d) => total + (Number(d.applied) || 0), 0)
}

/* ── Normalisers (defensive decode) ───────────────────────────────────────── */

const str = (value: unknown, fallback = '', max = 400): string =>
  typeof value === 'string' ? value.slice(0, max) : fallback

const num = (value: unknown, fallback = 0, min = 0, max = 10_000_000): number => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

function normRakhi(input: unknown): RakhiSpec {
  const r = (input ?? {}) as Partial<RakhiSpec>
  return {
    thread: oneOf(r.thread, THREADS, 'gold'),
    gem: oneOf(r.gem, GEMS, 'mandala'),
    monogram: str(r.monogram, 'R', 2).toUpperCase() || 'R',
  }
}

function normThali(input: unknown): ThaliSpec {
  const t = (input ?? {}) as Partial<ThaliSpec>
  const mithai = arr(t.mithai)
    .map((m) => oneOf(m, MITHAI, 'kaju'))
    .filter((m, i, all) => all.indexOf(m) === i)
    .slice(0, 3)
  return { diya: bool(t.diya, true), roli: bool(t.roli, true), mithai }
}

function normBill(input: unknown, cap = 12): BillLine[] {
  return arr(input)
    .slice(0, cap)
    .map((line) => {
      const l = (line ?? {}) as Partial<BillLine>
      return { label: str(l.label, 'Unspecified sibling service', 90), amt: num(l.amt, 0, 0, 999_999) }
    })
}

function normSlots(input: unknown): WheelSlot[] {
  return arr(input)
    .slice(0, 16)
    .map((slot) => {
      const s = (slot ?? {}) as Partial<WheelSlot>
      return {
        label: str(s.label, '₹10', 24),
        amt: num(s.amt, 0, 0, 999_999),
        weight: Math.max(0.01, Number(s.weight) || 1),
        tier: num(s.tier, 1, 0, 3) as 0 | 1 | 2 | 3,
      }
    })
}

function normVouchers(input: unknown): Voucher[] {
  return arr(input)
    .slice(0, 5)
    .map((voucher, i) => {
      const v = (voucher ?? {}) as Partial<Voucher>
      return {
        id: str(v.id, `v${i}`, 24),
        title: str(v.title, 'Mystery Favour', 70),
        note: str(v.note, 'Redeemable on demand.', 140),
        emoji: str(v.emoji, '🎟️', 6),
      }
    })
}

export function normalizeSister(input: unknown): SisterPayload {
  const s = (input ?? {}) as Partial<SisterPayload>
  const bill = normBill(s.bill)
  return {
    v: num(s.v, SCHEMA_VERSION, 0, 99),
    kind: 's',
    sisterName: str(s.sisterName, 'Your Sister', 40),
    brotherName: str(s.brotherName, '', 40),
    rakhi: normRakhi(s.rakhi),
    thali: normThali(s.thali),
    wishes: str(s.wishes, '', 600),
    voiceNote: bool(s.voiceNote),
    bill,
    demandAmt: num(s.demandAmt, sumBill(bill), 0, 9_999_999),
    upiId: str(s.upiId, '', 120),
    upiName: str(s.upiName, '', 60),
    qrImage: str(s.qrImage, '', 300_000),
  }
}

export function normalizeBrotherReply(input: unknown): BrotherReplyPayload {
  const b = (input ?? {}) as Partial<BrotherReplyPayload>
  return {
    v: num(b.v, SCHEMA_VERSION, 0, 99),
    kind: 'br',
    sister: normalizeSister(b.sister),
    brotherName: str(b.brotherName, 'Your Brother', 40),
    responseType: oneOf(b.responseType, ['roulette', 'audit', 'voucher'] as const, 'roulette'),
    seed: num(b.seed, 1, 1, 4_294_967_295),
    slots: normSlots(b.slots),
    deductions: arr(b.deductions)
      .slice(0, 10)
      .map((d) => {
        const dd = (d ?? {}) as Partial<Deduction>
        return {
          label: str(dd.label, 'Penalty', 90),
          amt: num(dd.amt, 0, 0, 999_999),
          applied: num(dd.applied, 0, 0, 999_999),
        }
      }),
    finalPayout: num(b.finalPayout, 0, 0, 9_999_999),
    vouchers: normVouchers(b.vouchers),
    note: str(b.note, '', 400),
  }
}

export function normalizeBrother(input: unknown): BrotherPayload {
  const b = (input ?? {}) as Partial<BrotherPayload>
  const vault = (b.vault ?? {}) as Partial<BrotherPayload['vault']>
  const contract = (b.contract ?? {}) as Partial<BrotherPayload['contract']>
  const roulette = (b.roulette ?? {}) as Partial<BrotherPayload['roulette']>
  return {
    v: num(b.v, SCHEMA_VERSION, 0, 99),
    kind: 'b',
    brotherName: str(b.brotherName, 'Your Brother', 40),
    sisterName: str(b.sisterName, '', 40),
    defenseType: oneOf(b.defenseType, ['vault', 'contract', 'roulette'] as const, 'vault'),
    vault: {
      taps: num(vault.taps, 30, 5, 200),
      mode: oneOf(vault.mode, ['code', 'meme'] as const, 'code'),
      code: str(vault.code, '', 80),
      label: str(vault.label, 'Gift Card', 50),
      meme: str(vault.meme, 'paisa', 20),
      memeText: str(vault.memeText, '', 140),
    },
    contract: {
      budgetCap: num(contract.budgetCap, 101, 0, 9_999_999),
      terms: arr(contract.terms)
        .slice(0, 8)
        .map((t) => str(t, 'Unstated clause', 120)),
    },
    roulette: {
      seed: num(roulette.seed, 1, 1, 4_294_967_295),
      slots: normSlots(roulette.slots),
    },
    note: str(b.note, '', 400),
  }
}

export function normalizeSisterReply(input: unknown): SisterReplyPayload {
  const s = (input ?? {}) as Partial<SisterReplyPayload>
  const bill = normBill(s.bill)
  return {
    v: num(s.v, SCHEMA_VERSION, 0, 99),
    kind: 'sr',
    brother: normalizeBrother(s.brother),
    sisterName: str(s.sisterName, 'Your Sister', 40),
    rakhi: normRakhi(s.rakhi),
    status: oneOf(s.status, ['accepted', 'countered'] as const, 'accepted'),
    finalDemandAmt: num(s.finalDemandAmt, sumBill(bill), 0, 9_999_999),
    bill,
    upiId: str(s.upiId, '', 120),
    upiName: str(s.upiName, '', 60),
    qrImage: str(s.qrImage, '', 300_000),
    reaction: str(s.reaction, '', 80),
    note: str(s.note, '', 400),
  }
}
