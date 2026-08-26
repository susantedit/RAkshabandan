/**
 * kit.tsx — the chunky cartoon-clay component set.
 *
 * Everything here is deliberately physical: buttons sit on a hard 6px shadow and
 * depress into it, cards have a visible bottom edge, chips clunk down when
 * chosen. The tactility is the point — it makes sibling banter feel like a toy
 * instead of a form.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { parseAmount } from '../lib/money'
import { tap as hapticTap, thud } from '../lib/haptics'
import { IconArrowLeft, IconCheck } from './icons'

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/* ── buttons ─────────────────────────────────────────────────────────────── */

export type BtnTone = 'gold' | 'pink' | 'mint' | 'sky' | 'cream' | 'ink'
export type BtnSize = 'sm' | 'md' | 'lg'

const TONE_CLASS: Record<BtnTone, string> = {
  gold: '',
  pink: 'btn-pink',
  mint: 'btn-mint',
  sky: 'btn-sky',
  cream: 'btn-cream',
  ink: 'btn-ink',
}

const SIZE_CLASS: Record<BtnSize, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' }

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BtnTone
  size?: BtnSize
  block?: boolean
  /** Suppress the little haptic tick (e.g. for destructive confirmations). */
  silent?: boolean
}

export function Btn({
  tone = 'gold',
  size = 'md',
  block,
  silent,
  className,
  onClick,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      type="button"
      className={cx('btn-toy no-select', TONE_CLASS[tone], SIZE_CLASS[size], block && 'w-full', className)}
      onClick={(event) => {
        if (!silent) hapticTap()
        onClick?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  label,
  children,
  className,
  ...rest
}: BtnProps & { label: string }) {
  return (
    <Btn
      aria-label={label}
      className={cx('!px-3.5 !py-3.5 !rounded-2xl', className)}
      {...rest}
    >
      {children}
    </Btn>
  )
}

/* ── surfaces ────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return <Tag className={cx('toy-card', className)}>{children}</Tag>
}

export function Well({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('toy-well p-4', className)}>{children}</div>
}

export function Tag({
  tone = 'gold',
  children,
  className,
}: {
  tone?: 'sister' | 'brother' | 'gold'
  children: ReactNode
  className?: string
}) {
  const map = { sister: 'tag-sister', brother: 'tag-brother', gold: 'tag-gold' }
  return <span className={cx('tag', map[tone], className)}>{children}</span>
}

/* ── option chips ────────────────────────────────────────────────────────── */

export function Chip({
  on,
  onClick,
  title,
  subtitle,
  icon,
  emoji,
  swatch,
  className,
  disabled,
}: {
  on: boolean
  onClick: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  emoji?: string
  swatch?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-on={on}
      disabled={disabled}
      aria-pressed={on}
      onClick={() => {
        hapticTap()
        onClick()
      }}
      className={cx('toy-chip no-select min-w-0 disabled:opacity-45', className)}
    >
      <span
        aria-hidden
        className="absolute top-1.5 right-2 text-pista text-[0.95rem] leading-none transition-opacity flex items-center justify-center"
        style={{ opacity: on ? 1 : 0 }}
      >
        <IconCheck size={16} />
      </span>
      <span className="flex items-center gap-2.5 w-full min-w-0 pr-2">
        {swatch ? (
          <span
            className="w-5 h-5 rounded-full border-[2.5px] border-espresso shrink-0"
            style={{ background: swatch }}
          />
        ) : icon ? (
          <span className="text-marigold shrink-0">{icon}</span>
        ) : emoji ? (
          <span className="text-lg leading-none shrink-0">{emoji}</span>
        ) : null}
        <span className="font-display font-bold text-[0.95rem] leading-tight text-left min-w-0 flex-1">
          {title}
        </span>
      </span>
      {subtitle && (
        <span className="text-[0.74rem] text-espresso/65 leading-snug text-left mt-0.5">{subtitle}</span>
      )}
    </button>
  )
}

/* ── form fields ─────────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block font-display font-bold text-[0.82rem] uppercase tracking-wide text-espresso/60 mb-1.5">
        {label}
      </span>
      <input className="toy-input" {...rest} />
      {hint && <span className="block text-[0.72rem] text-espresso/45 mt-1.5 leading-snug">{hint}</span>}
    </label>
  )
}

export function TextArea({
  label,
  hint,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block font-display font-bold text-[0.82rem] uppercase tracking-wide text-espresso/60 mb-1.5">
        {label}
      </span>
      <textarea className="toy-input resize-none leading-relaxed" rows={3} {...rest} />
      {hint && <span className="block text-[0.72rem] text-espresso/45 mt-1.5 leading-snug">{hint}</span>}
    </label>
  )
}

/** Amount input that only ever holds digits, shown with a ₹ prefix. */
export function AmountField({
  label,
  value,
  onChange,
  hint,
  max,
  className,
  placeholder = '0',
}: {
  label: string
  value: number
  onChange: (next: number) => void
  hint?: string
  max?: number
  className?: string
  placeholder?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="block font-display font-bold text-[0.82rem] uppercase tracking-wide text-espresso/60 mb-1.5">
        {label}
      </span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 num text-lg text-espresso/45">₹</span>
        <input
          className="toy-input pl-9 num text-lg"
          inputMode="numeric"
          value={value === 0 ? '' : String(value)}
          placeholder={placeholder}
          onChange={(event) => onChange(parseAmount(event.target.value, max))}
        />
      </div>
      {hint && <span className="block text-[0.72rem] text-espresso/45 mt-1.5 leading-snug">{hint}</span>}
    </label>
  )
}

/* ── progress ────────────────────────────────────────────────────────────── */

export function Meter({
  value,
  tone = 'gold',
  label,
  className,
  height = 18,
}: {
  value: number
  tone?: 'gold' | 'pink' | 'mint' | 'sky'
  label?: string
  className?: string
  height?: number
}) {
  const fill = {
    gold: 'bg-marigold',
    pink: 'bg-gulabi',
    mint: 'bg-pista',
    sky: 'bg-sky',
  }[tone]
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="font-display font-bold text-[0.78rem] uppercase tracking-wide text-espresso/55">
            {label}
          </span>
          <span className="num text-[0.85rem] text-espresso/70">{Math.round(value * 100)}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full border-[3px] border-clayline bg-[#f0e6da] overflow-hidden"
        style={{ height }}
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-150 ease-out', fill)}
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      </div>
    </div>
  )
}

/** Floating instruction pill — teaches each gesture without a tutorial screen. */
export function HintPill({
  children,
  tone = 'ink',
  pulse,
  className,
}: {
  children: ReactNode
  tone?: 'ink' | 'gold' | 'mint'
  pulse?: boolean
  className?: string
}) {
  const tones = {
    ink: 'bg-espresso text-kesar',
    gold: 'bg-marigold text-espresso',
    mint: 'bg-pista text-[#06322E]',
  }
  return (
    <div
      className={cx(
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-display font-bold text-[0.85rem]',
        'border-[3px] border-espresso shadow-[0_4px_0_var(--color-espresso)] no-select',
        tones[tone],
        pulse && 'animate-bob',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ── layout ──────────────────────────────────────────────────────────────── */

export function Screen({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className="fixed inset-0 flex flex-col">
      {header && <div className="shrink-0 safe-t px-4 pb-2">{header}</div>}
      <div className={cx('flex-1 min-h-0 scroll-y px-4', className)}>{children}</div>
      {footer && (
        <div className="shrink-0 px-4 pt-3 safe-b bg-gradient-to-t from-kesar via-kesar to-transparent">
          {footer}
        </div>
      )}
    </div>
  )
}

export function TopBar({
  title,
  subtitle,
  left,
  right,
}: {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {left}
      <img src="/logo.png" alt="anithor bond logo" className="w-8 h-8 object-contain shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.15rem] truncate">{title}</h2>
        {subtitle && (
          <p className="text-[0.76rem] text-espresso/50 truncate leading-tight mt-0.5">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  )
}

export function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <Btn tone="cream" size="sm" onClick={onClick} aria-label="Go back" className="!px-3">
      <IconArrowLeft size={18} />
    </Btn>
  )
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={current + 1} aria-valuemax={steps.length}>
      {steps.map((step, i) => (
        <div key={step} className="flex-1 flex flex-col gap-1">
          <div
            className={cx(
              'h-2 rounded-full border-2 border-espresso/15 transition-colors',
              i < current ? 'bg-pista' : i === current ? 'bg-marigold' : 'bg-clayline',
            )}
          />
          <span
            className={cx(
              'font-display text-[0.62rem] uppercase tracking-wide truncate',
              i === current ? 'text-espresso' : 'text-espresso/35',
            )}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── bottom sheet ────────────────────────────────────────────────────────── */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-espresso/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[86vh] flex flex-col animate-slide-up">
        <div className="bg-puffy rounded-t-[28px] sm:rounded-[28px] border-[3px] border-clayline shadow-[0_-6px_0_var(--color-claydrop)] sm:shadow-[0_12px_0_var(--color-claydrop)] flex flex-col min-h-0">
          <div className="shrink-0 flex items-center gap-3 px-5 pt-4 pb-3">
            <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 w-12 h-1.5 rounded-full bg-clayline sm:hidden" />
            <h3 className="text-[1.05rem] flex-1">{title}</h3>
            <Btn tone="cream" size="sm" onClick={onClose} className="!px-3" aria-label="Close">
              ✕
            </Btn>
          </div>
          <div className="flex-1 min-h-0 scroll-y px-5 pb-4">{children}</div>
          {footer && <div className="shrink-0 px-5 pb-5 pt-2 safe-b">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

/* ── toasts ──────────────────────────────────────────────────────────────── */

type ToastTone = 'ok' | 'warn' | 'info'
interface ToastItem {
  id: number
  text: string
  tone: ToastTone
}

let toastSeq = 0
const toastListeners = new Set<(item: ToastItem) => void>()

export function toast(text: string, tone: ToastTone = 'ok'): void {
  const item = { id: ++toastSeq, text, tone }
  toastListeners.forEach((listener) => listener(item))
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener = (item: ToastItem) => {
      setItems((current) => [...current.slice(-2), item])
      window.setTimeout(() => {
        setItems((current) => current.filter((existing) => existing.id !== item.id))
      }, 2600)
    }
    toastListeners.add(listener)
    return () => {
      toastListeners.delete(listener)
    }
  }, [])

  const tones: Record<ToastTone, string> = {
    ok: 'bg-pista text-[#06322E]',
    warn: 'bg-gulabi text-white',
    info: 'bg-marigold text-espresso',
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-6 pointer-events-none safe-b">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cx(
            'animate-pop-in font-display font-bold text-[0.9rem] px-5 py-3 rounded-2xl',
            'border-[3px] border-espresso shadow-[0_5px_0_var(--color-espresso)] max-w-sm text-center',
            tones[item.tone],
          )}
        >
          {item.text}
        </div>
      ))}
    </div>
  )
}

/* ── DOM confetti ────────────────────────────────────────────────────────── */

/** Lightweight CSS confetti for DOM-only celebration moments. */
export function Confetti({ fire, pieces = 46 }: { fire: number; pieces?: number }) {
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (fire) setBurst(fire)
  }, [fire])

  const bits = useMemo(() => {
    const colors = ['#FFB703', '#FF4D6D', '#2EC4B6', '#3A86FF', '#FFFFFF']
    return Array.from({ length: pieces }, (_, i) => ({
      left: `${(i * 97) % 100}%`,
      delay: `${(i % 12) * 0.055}s`,
      duration: `${1.5 + ((i * 13) % 9) * 0.12}s`,
      color: colors[i % colors.length],
      size: 7 + ((i * 7) % 8),
      rotate: `${(i * 47) % 360}deg`,
      drift: `${(((i * 31) % 100) - 50) * 1.6}px`,
    }))
  }, [pieces])

  if (!burst) return null

  return (
    <div key={burst} className="fixed inset-0 z-[55] pointer-events-none overflow-hidden">
      {bits.map((bit, i) => (
        <span
          key={i}
          className="absolute top-[-6%] rounded-[3px]"
          style={{
            left: bit.left,
            width: bit.size,
            height: bit.size * 1.7,
            background: bit.color,
            transform: `rotate(${bit.rotate})`,
            animation: `confetti-fall ${bit.duration} ${bit.delay} cubic-bezier(0.3,0.7,0.5,1) forwards`,
            // Consumed by the keyframes below for per-piece horizontal drift.
            ['--drift' as string]: bit.drift,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { opacity: 1; transform: translate3d(0,0,0) rotate(0deg); }
          100% { opacity: 0.15; transform: translate3d(var(--drift), 108vh, 0) rotate(560deg); }
        }
      `}</style>
    </div>
  )
}

/* ── misc ────────────────────────────────────────────────────────────────── */

export function PrivacyNote({ className }: { className?: string }) {
  return (
    <p
      className={cx(
        'text-[0.72rem] leading-snug text-espresso/45 flex items-start gap-1.5',
        className,
      )}
    >
      <span className="shrink-0">🔒</span>
      <span>
        Encrypted on your device and stored only inside the link. No account, no database, nothing
        for us to read.
      </span>
    </p>
  )
}

/** Animated ₹ counter — used for reveals so numbers land with weight. */
export function CountUp({
  to,
  duration = 900,
  className,
  prefix = '₹',
}: {
  to: number
  duration?: number
  className?: string
  prefix?: string
}) {
  const [value, setValue] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const from = 0
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [to, duration])

  return (
    <span className={cx('num', className)}>
      {prefix}
      {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}
    </span>
  )
}

/* ── loading ─────────────────────────────────────────────────────────────── */

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-[6px] border-clayline" />
        <div className="absolute inset-0 rounded-full border-[6px] border-transparent border-t-marigold animate-spin" />
      </div>
      {label && <p className="font-display font-bold text-espresso/55 text-sm">{label}</p>}
    </div>
  )
}

/* ── WebGL capability probe ──────────────────────────────────────────────── */

const NoWebGL = createContext(false)

/**
 * `true` when this device can't do WebGL. Screens use it to swap their 3D stage
 * for a flat emoji stand-in — the app stays fully usable either way, because the
 * invoices, vouchers and UPI handoff are all plain DOM.
 */
export const useNoWebGL = () => useContext(NoWebGL)

export function WebGLGate({ children }: { children: ReactNode }) {
  const [ok] = useState(() => {
    try {
      const canvas = document.createElement('canvas')
      return Boolean(
        canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl'),
      )
    } catch {
      return false
    }
  })
  return <NoWebGL.Provider value={!ok}>{children}</NoWebGL.Provider>
}
