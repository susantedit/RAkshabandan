/**
 * gestures.ts — the three physical interactions the experience is built around.
 *
 * All of them are pointer-event based (mouse and touch alike) and report a
 * normalised 0→1 progress so the 3D scene and the DOM overlay can stay in sync
 * off a single source of truth.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

type PE = ReactPointerEvent<HTMLElement>
type ME = ReactMouseEvent<HTMLElement>

/* ── circular drag: the aarti ─────────────────────────────────────────────── */

/** Shortest signed angular distance from `a` to `b`, in radians. */
function angleDelta(a: number, b: number): number {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export interface CircularDragOptions {
  /** Full revolutions required to complete. */
  turns?: number
  /** Ignore movement closer than this (px) to the centre — it has no meaningful angle. */
  minRadius?: number
  onComplete?: () => void
  /** Fires once per revolution crossed, for haptics. */
  onRevolution?: (count: number) => void
  disabled?: boolean
}

export interface CircularDragState {
  /** Live pointer angle in radians, for placing the orbiting object. */
  angle: number
  /** 0 → 1 toward `turns` revolutions. */
  progress: number
  active: boolean
  complete: boolean
  reset: () => void
  bind: {
    onPointerDown: (event: PE) => void
    onPointerMove: (event: PE) => void
    onPointerUp: (event: PE) => void
    onPointerCancel: (event: PE) => void
  }
}

export function useCircularDrag({
  turns = 2.5,
  minRadius = 34,
  onComplete,
  onRevolution,
  disabled = false,
}: CircularDragOptions = {}): CircularDragState {
  const [angle, setAngle] = useState(-Math.PI / 2)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)
  const [complete, setComplete] = useState(false)

  const acc = useRef(0)
  const last = useRef<number | null>(null)
  const revolutions = useRef(0)
  const done = useRef(false)

  const total = turns * Math.PI * 2

  const pointAngle = (event: PE): { angle: number; radius: number } => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = event.clientX - cx
    const dy = event.clientY - cy
    // Negate dy so the angle runs counter-clockwise like the 3D scene's Y-up world.
    return { angle: Math.atan2(-dy, dx), radius: Math.hypot(dx, dy) }
  }

  const onPointerDown = useCallback(
    (event: PE) => {
      if (disabled || done.current) return
      const { angle: a, radius } = pointAngle(event)
      if (radius < minRadius) return
      last.current = a
      setAngle(a)
      setActive(true)
      try {
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    },
    [disabled, minRadius],
  )

  const onPointerMove = useCallback(
    (event: PE) => {
      if (disabled || done.current || last.current === null) return
      const { angle: a, radius } = pointAngle(event)
      if (radius < minRadius) return

      // Accumulate signed rotation: dragging back the other way undoes progress,
      // so a wiggle can't be mistaken for a circle.
      acc.current += angleDelta(last.current, a)
      last.current = a
      setAngle(a)

      const magnitude = Math.abs(acc.current)
      const next = Math.min(1, magnitude / total)
      setProgress(next)

      const crossed = Math.floor(magnitude / (Math.PI * 2))
      if (crossed > revolutions.current) {
        revolutions.current = crossed
        onRevolution?.(crossed)
      }

      if (next >= 1 && !done.current) {
        done.current = true
        setComplete(true)
        setActive(false)
        onComplete?.()
      }
    },
    [disabled, minRadius, total, onComplete, onRevolution],
  )

  const release = useCallback((event: PE) => {
    last.current = null
    setActive(false)
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const reset = useCallback(() => {
    acc.current = 0
    last.current = null
    revolutions.current = 0
    done.current = false
    setProgress(0)
    setComplete(false)
    setActive(false)
  }, [])

  return {
    angle,
    progress,
    active,
    complete,
    reset,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
    },
  }
}

/* ── long press: tying the rakhi ─────────────────────────────────────────── */

export interface LongPressState {
  progress: number
  active: boolean
  complete: boolean
  reset: () => void
  bind: {
    onPointerDown: (event: PE) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onPointerCancel: () => void
    onContextMenu: (event: ME) => void
  }
}

export function useLongPress({
  duration = 1500,
  onComplete,
  onStart,
  onCancel,
  disabled = false,
}: {
  duration?: number
  onComplete?: () => void
  onStart?: () => void
  onCancel?: () => void
  disabled?: boolean
} = {}): LongPressState {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)
  const [complete, setComplete] = useState(false)

  const raf = useRef(0)
  const startedAt = useRef(0)
  const done = useRef(false)

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
  }, [])

  useEffect(() => stop, [stop])

  const tick = useCallback(() => {
    const elapsed = performance.now() - startedAt.current
    const next = Math.min(1, elapsed / duration)
    setProgress(next)
    if (next >= 1) {
      done.current = true
      setComplete(true)
      setActive(false)
      stop()
      onComplete?.()
      return
    }
    raf.current = requestAnimationFrame(tick)
  }, [duration, onComplete, stop])

  const onPointerDown = useCallback(
    (event: PE) => {
      if (disabled || done.current) return
      event.preventDefault()
      startedAt.current = performance.now()
      setActive(true)
      onStart?.()
      stop()
      raf.current = requestAnimationFrame(tick)
    },
    [disabled, onStart, stop, tick],
  )

  const release = useCallback(() => {
    if (done.current) return
    stop()
    setActive(false)
    // Springs back rather than snapping to zero, so an accidental lift is forgiving.
    setProgress((current) => {
      if (current > 0) onCancel?.()
      return 0
    })
  }, [onCancel, stop])

  const reset = useCallback(() => {
    stop()
    done.current = false
    setProgress(0)
    setActive(false)
    setComplete(false)
  }, [stop])

  return {
    progress,
    active,
    complete,
    reset,
    bind: {
      onPointerDown,
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
      onContextMenu: (event: ME) => event.preventDefault(),
    },
  }
}

/* ── rapid tapping: cracking the vault ───────────────────────────────────── */

export interface TapCounterState {
  count: number
  progress: number
  complete: boolean
  /** Increments on every registered tap — feed to the 3D shake impulse. */
  pulse: number
  tap: () => void
  reset: () => void
}

export function useTapCounter({
  target,
  onComplete,
  onTap,
  /** Taps decay if the user stops — keeps it a burst, not a slow grind. */
  decayAfterMs = 0,
}: {
  target: number
  onComplete?: () => void
  onTap?: (count: number) => void
  decayAfterMs?: number
}): TapCounterState {
  const [count, setCount] = useState(0)
  const [pulse, setPulse] = useState(0)
  const [complete, setComplete] = useState(false)
  const done = useRef(false)
  const lastTap = useRef(0)

  const tap = useCallback(() => {
    if (done.current) return
    lastTap.current = performance.now()
    setPulse((p) => p + 1)
    setCount((current) => {
      const next = Math.min(target, current + 1)
      onTap?.(next)
      if (next >= target && !done.current) {
        done.current = true
        setComplete(true)
        onComplete?.()
      }
      return next
    })
  }, [target, onComplete, onTap])

  useEffect(() => {
    if (!decayAfterMs || complete) return
    const id = window.setInterval(() => {
      if (performance.now() - lastTap.current > decayAfterMs) {
        setCount((c) => Math.max(0, c - 1))
      }
    }, 400)
    return () => window.clearInterval(id)
  }, [decayAfterMs, complete])

  const reset = useCallback(() => {
    done.current = false
    setCount(0)
    setPulse(0)
    setComplete(false)
  }, [])

  return {
    count,
    progress: target > 0 ? Math.min(1, count / target) : 1,
    complete,
    pulse,
    tap,
    reset,
  }
}

/* ── lever pull: spinning the wheel ──────────────────────────────────────── */

export interface LeverPullState {
  /** 0 → 1 down-travel of the knob. */
  pull: number
  /** Once pulled, the lever stays down — a spin can't be re-rolled. */
  spent: boolean
  bind: {
    onPointerDown: (event: PE) => void
    onPointerMove: (event: PE) => void
    onPointerUp: () => void
    onPointerCancel: () => void
  }
}

/**
 * Drag a knob downward to fire once. Deliberately not a button: the wheel's
 * outcome is already sealed into the link, so the pull has to *feel* like the
 * thing that decided it.
 */
export function useLeverPull({
  distance = 92,
  onPull,
}: {
  distance?: number
  onPull: () => void
}): LeverPullState {
  const [pull, setPull] = useState(0)
  const [spent, setSpent] = useState(false)
  const origin = useRef<number | null>(null)

  return {
    pull,
    spent,
    bind: {
      onPointerDown: (event: PE) => {
        if (spent) return
        origin.current = event.clientY
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          /* ignore */
        }
      },
      onPointerMove: (event: PE) => {
        if (spent || origin.current === null) return
        const next = Math.max(0, Math.min(1, (event.clientY - origin.current) / distance))
        setPull(next)
        if (next >= 1) {
          setSpent(true)
          origin.current = null
          onPull()
        }
      },
      onPointerUp: () => {
        origin.current = null
        if (!spent) setPull(0)
      },
      onPointerCancel: () => {
        origin.current = null
        if (!spent) setPull(0)
      },
    },
  }
}

/* ── drag-to-drop: dropping the rakhi onto a seal ────────────────────────── */

export interface DragDropState {
  /** Pointer offset from the drag origin, in px. */
  offset: { x: number; y: number }
  active: boolean
  dropped: boolean
  /** 0 → 1 proximity to the target. */
  nearness: number
  reset: () => void
  bind: {
    onPointerDown: (event: PE) => void
    onPointerMove: (event: PE) => void
    onPointerUp: (event: PE) => void
    onPointerCancel: (event: PE) => void
  }
}

/**
 * Drag an element toward a target rect. `getTarget` is read live so the target
 * can move (the contract sways) without stale coordinates.
 */
export function useDragToTarget({
  getTarget,
  radius = 90,
  onDrop,
  disabled = false,
}: {
  getTarget: () => { x: number; y: number } | null
  radius?: number
  onDrop?: () => void
  disabled?: boolean
}): DragDropState {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const [dropped, setDropped] = useState(false)
  const [nearness, setNearness] = useState(0)

  const origin = useRef({ x: 0, y: 0 })
  const pointer = useRef({ x: 0, y: 0 })
  const done = useRef(false)

  const measure = useCallback(
    (x: number, y: number) => {
      const target = getTarget()
      if (!target) return 0
      const distance = Math.hypot(x - target.x, y - target.y)
      return Math.max(0, 1 - distance / (radius * 2.2))
    },
    [getTarget, radius],
  )

  const onPointerDown = useCallback(
    (event: PE) => {
      if (disabled || done.current) return
      origin.current = { x: event.clientX, y: event.clientY }
      pointer.current = { x: event.clientX, y: event.clientY }
      setActive(true)
      try {
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    },
    [disabled],
  )

  const onPointerMove = useCallback(
    (event: PE) => {
      if (!active || done.current) return
      pointer.current = { x: event.clientX, y: event.clientY }
      setOffset({
        x: event.clientX - origin.current.x,
        y: event.clientY - origin.current.y,
      })
      setNearness(measure(event.clientX, event.clientY))
    },
    [active, measure],
  )

  const finish = useCallback(
    (event: PE) => {
      try {
        ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
      if (!active || done.current) return
      setActive(false)

      const target = getTarget()
      const hit =
        target && Math.hypot(pointer.current.x - target.x, pointer.current.y - target.y) <= radius

      if (hit) {
        done.current = true
        setDropped(true)
        setNearness(1)
        onDrop?.()
      } else {
        setOffset({ x: 0, y: 0 })
        setNearness(0)
      }
    },
    [active, getTarget, radius, onDrop],
  )

  const reset = useCallback(() => {
    done.current = false
    setOffset({ x: 0, y: 0 })
    setActive(false)
    setDropped(false)
    setNearness(0)
  }, [])

  return {
    offset,
    active,
    dropped,
    nearness,
    reset,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}
