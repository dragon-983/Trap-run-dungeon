import { useRef } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hourglass } from 'lucide-react'
import type { Action } from '@/game/types'

interface Props {
  onAction: (a: Action) => void
}

/** On-screen controls. Holding a direction repeats the move. */
export function Dpad({ onAction }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    if (interval.current) clearInterval(interval.current)
    timer.current = null
    interval.current = null
  }
  const press = (a: Action) => (e: React.PointerEvent) => {
    e.preventDefault()
    stop()
    onAction(a)
    if (a === 'W') return
    timer.current = setTimeout(() => {
      interval.current = setInterval(() => onAction(a), 140)
    }, 260)
  }

  const btn = (a: Action, label: string, icon: React.ReactNode, pos: string) => (
    <button
      aria-label={label}
      onPointerDown={press(a)}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-none-all grid h-16 w-16 place-items-center rounded-2xl border border-ink-500 bg-ink-700/90 text-zinc-100 shadow-lg transition active:scale-90 active:border-acid-500 active:bg-ink-600 ${pos}`}
    >
      {icon}
    </button>
  )

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5" role="group" aria-label="Movement controls">
      {btn('U', 'Move up', <ArrowUp />, 'col-start-2 row-start-1')}
      {btn('L', 'Move left', <ArrowLeft />, 'col-start-1 row-start-2')}
      {btn('W', 'Wait one turn', <Hourglass size={20} className="text-ember-500" />, 'col-start-2 row-start-2')}
      {btn('R', 'Move right', <ArrowRight />, 'col-start-3 row-start-2')}
      {btn('D', 'Move down', <ArrowDown />, 'col-start-2 row-start-3')}
    </div>
  )
}
