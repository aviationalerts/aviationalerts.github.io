export type EaseFn = (t: number) => number

export const linear: EaseFn = (t) => t
export const power2Out: EaseFn = (t) => 1 - (1 - t) * (1 - t)
export const power3Out: EaseFn = (t) => 1 - Math.pow(1 - t, 3)
export const power4Out: EaseFn = (t) => 1 - Math.pow(1 - t, 4)
export const power2InOut: EaseFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
export const power4InOut: EaseFn = (t) =>
  t < 0.5 ? 8 * Math.pow(t, 4) : 1 - Math.pow(-2 * t + 2, 4) / 2
export const expoOut: EaseFn = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const expoInOut: EaseFn = (t) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2
}
export const sineInOut: EaseFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2
export const power2EaseOutQuint: EaseFn = (t) => 1 - Math.pow(1 - t, 5)

interface Tween {
  cancel(): void
}

const activeTweens = new Set<Tween>()

export function tween(
  duration: number,
  onUpdate: (p: number) => void,
  opts: { delay?: number; ease?: EaseFn; onComplete?: () => void } = {},
): Tween {
  const { delay = 0, ease = linear, onComplete } = opts
  let raf = 0
  let cancelled = false
  let start = 0

  const handle: Tween = {
    cancel() {
      cancelled = true
      cancelAnimationFrame(raf)
      activeTweens.delete(handle)
    },
  }

  const step = (now: number) => {
    if (cancelled) return
    if (!start) start = now
    const elapsed = now - start - delay
    if (elapsed < 0) {
      raf = requestAnimationFrame(step)
      return
    }
    const p = duration <= 0 ? 1 : Math.min(1, elapsed / duration)
    onUpdate(ease(p))
    if (p < 1) {
      raf = requestAnimationFrame(step)
    } else {
      activeTweens.delete(handle)
      onComplete?.()
    }
  }

  activeTweens.add(handle)
  raf = requestAnimationFrame(step)
  return handle
}

export function cancelAllTweens() {
  for (const t of [...activeTweens]) t.cancel()
}

export function scaleBetween(
  value: number,
  outStart: number,
  outEnd: number,
  inMin: number,
  inMax: number,
): number {
  if (inMax === inMin) return outStart
  const t = (value - inMin) / (inMax - inMin)
  return outStart + t * (outEnd - outStart)
}

export const radians = (deg: number) => (deg * Math.PI) / 180
