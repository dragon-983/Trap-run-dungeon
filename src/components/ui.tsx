import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ArrowLeft, Heart } from 'lucide-react'
import { GRID, idx, type CellType, type Dungeon } from '@/game/types'

type Variant = 'primary' | 'volt' | 'ghost' | 'danger' | 'ember'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-acid-500 text-ink-950 shadow-acid hover:bg-acid-400',
  volt: 'bg-volt-500 text-white shadow-volt hover:bg-volt-400',
  ember: 'bg-ember-500 text-ink-950 shadow-ember hover:bg-ember-400',
  danger: 'bg-blood-500 text-white hover:bg-blood-400',
  ghost: 'border border-ink-500 bg-ink-800/70 text-zinc-100 hover:border-volt-400 hover:bg-ink-700',
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'lg' | 'sm'
}

export function Button({ variant = 'ghost', size = 'md', className = '', ...rest }: BtnProps) {
  const sz = size === 'lg' ? 'min-h-14 px-7 text-base' : size === 'sm' ? 'min-h-11 px-3 text-xs' : 'min-h-11 px-5 text-sm'
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold uppercase tracking-[0.08em] transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${sz} ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ink-600/80 bg-ink-800/80 p-4 backdrop-blur ${className}`}>{children}</div>
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`font-pixel text-[10px] uppercase tracking-[0.12em] text-zinc-400 ${className}`}>{children}</div>
}

export function Logo({ size = 'md' }: { size?: 'md' | 'xl' }) {
  return (
    <div className={`font-pixel font-bold leading-none tracking-tight ${size === 'xl' ? 'text-5xl sm:text-7xl' : 'text-lg'}`}>
      <span className="text-zinc-50">TRAP</span>
      <span className="text-volt-400 drop-shadow-[0_0_12px_rgba(157,77,255,.9)]">//</span>
      <span className="text-acid-500 drop-shadow-[0_0_12px_rgba(185,255,59,.7)]">RUN</span>
    </div>
  )
}

export function Screen({
  title,
  onBack,
  right,
  children,
  wide = false,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="bg-dungeon min-h-dvh pb-24">
      <header className="sticky top-0 z-20 border-b border-ink-600/60 bg-ink-900/80 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center gap-3 px-4 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
          {onBack && (
            <button onClick={onBack} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-xl text-zinc-300 transition hover:bg-ink-700 hover:text-white">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="font-display text-lg font-bold tracking-tight text-zinc-50">{title}</h1>
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className={`mx-auto animate-rise px-4 pt-5 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>
    </div>
  )
}

export function Bar({ ratio, color = 'bg-acid-500' }: { ratio: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-600">
      <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
    </div>
  )
}

export function Stat({ label, value, accent = '' }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl bg-ink-900/70 px-3 py-2.5">
      <Label>{label}</Label>
      <div className={`tabular mt-1 font-display text-xl font-bold ${accent || 'text-zinc-50'}`}>{value}</div>
    </div>
  )
}

export function Lives({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${lives} lives`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart key={i} size={20} className={i < lives ? 'fill-blood-500 text-blood-500 drop-shadow-[0_0_6px_rgba(255,61,90,.8)]' : 'text-ink-500'} />
      ))}
    </div>
  )
}

export function Difficulty({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`Difficulty ${level} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-[2px] ${i < level ? (level >= 4 ? 'bg-blood-500' : level >= 3 ? 'bg-ember-500' : 'bg-acid-500') : 'bg-ink-500'}`} />
      ))}
    </div>
  )
}

const MINI: Record<CellType, string> = {
  empty: '#171724',
  wall: '#43436b',
  spike: '#ff3d5a',
  pulse: '#ff8a1f',
  sentryH: '#b57bff',
  sentryV: '#b57bff',
  key: '#b9ff3b',
  door: '#a8541a',
  switch: '#d4b0ff',
  gate: '#5a1fb3',
}

/** Small static preview of a dungeon layout. */
export function MiniDungeon({ dungeon, px = 96, className = '' }: { dungeon: Pick<Dungeon, 'cells' | 'start' | 'exit'>; px?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = px * dpr
    c.height = px * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const s = px / GRID
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const t = dungeon.cells[idx(x, y)]
        ctx.fillStyle = MINI[t]
        ctx.fillRect(x * s, y * s, s - 0.5, s - 0.5)
      }
    ctx.fillStyle = '#b9ff3b'
    ctx.fillRect(dungeon.exit.x * s + s * 0.15, dungeon.exit.y * s + s * 0.15, s * 0.7, s * 0.7)
    ctx.strokeStyle = '#b9ff3b'
    ctx.strokeRect(dungeon.start.x * s + 1, dungeon.start.y * s + 1, s - 2, s - 2)
  }, [dungeon, px])
  return <canvas ref={ref} style={{ width: px, height: px }} className={`rounded-lg ${className}`} aria-hidden />
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  const c = tone === 'error' ? 'border-blood-500/50 bg-blood-500/10 text-blood-400' : tone === 'ok' ? 'border-acid-500/40 bg-acid-500/10 text-acid-300' : 'border-volt-500/40 bg-volt-500/10 text-volt-300'
  return <div className={`rounded-xl border px-4 py-3 text-sm ${c}`}>{children}</div>
}
