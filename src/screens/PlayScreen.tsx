import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Key, RotateCcw, Zap } from 'lucide-react'
import { useNav } from '@/app/nav'
import { Dpad } from '@/components/Dpad'
import { Bar, Button, Label, Lives } from '@/components/ui'
import { formatTime } from '@/game/result'
import { RunController } from '@/game/run'
import type { Action, Dungeon } from '@/game/types'
import { sfx } from '@/lib/audio'
import { DungeonCanvas } from '@/render/DungeonCanvas'
import { OutOfHealth } from '@/components/OutOfHealth'
import { healthTotal, profileStore, useProfile } from '@/progress/store'
import type { Route } from '@/app/nav'
import type { PlayMode } from '@/game/result'

interface Props {
  dungeon: Dungeon
  mode: PlayMode
  back: Route
  next: Dungeon | null
  tip?: string
  /** Called instead of recording a result (used by the editor's test mode). */
  onFinish?: (won: boolean) => void
  /** Overrides leaving the dungeon (used by the editor's test mode). */
  onExit?: () => void
}

const KEYS: Record<string, Action> = {
  ArrowUp: 'U', w: 'U', W: 'U',
  ArrowDown: 'D', s: 'D', S: 'D',
  ArrowLeft: 'L', a: 'L', A: 'L',
  ArrowRight: 'R', d: 'R', D: 'R',
  ' ': 'W', x: 'W', X: 'W',
}

export function PlayScreen({ dungeon, mode, back, next, tip, onFinish, onExit }: Props) {
  const nav = useNav()
  const profile = useProfile()
  const [ctrl] = useState(() => new RunController(dungeon))
  const snap = useSyncExternalStore(ctrl.subscribe, ctrl.getSnapshot)
  const [coarse, setCoarse] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const done = useRef(false)
  const needsHealth = mode !== 'test'
  const [allowed, setAllowed] = useState(() => !needsHealth || healthTotal(profileStore.get()) > 0)
  const prevPhase = useRef(snap.phase)
  const restart = useCallback(() => {
    if (needsHealth && healthTotal(profileStore.get()) <= 0) setAllowed(false)
    else ctrl.restart()
  }, [needsHealth, ctrl])
  const exit = useCallback(() => (onExit ? onExit() : nav.go(back)), [onExit, nav, back])

  useEffect(() => {
    if (allowed) ctrl.start()
    return () => ctrl.dispose()
  }, [ctrl, allowed])

  // Each run costs one health, charged when the countdown ends and the run begins.
  useEffect(() => {
    if (snap.phase === 'running' && prevPhase.current !== 'running' && needsHealth) profileStore.spendHealth()
    prevPhase.current = snap.phase
  }, [snap.phase, needsHealth])

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const h = () => setCoarse(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // countdown + go sounds
  useEffect(() => {
    if (snap.phase === 'countdown') sfx.play('tick')
    if (snap.phase === 'running' && snap.moves === 0) sfx.play('go')
  }, [snap.phase, snap.countdown, snap.moves])

  // event sounds
  useEffect(() => {
    for (const e of snap.events.list) {
      if (e.type === 'move') sfx.play('move')
      else if (e.type === 'win') sfx.play('win')
      else sfx.play(e.type)
    }
  }, [snap.events])

  useEffect(() => {
    if (snap.phase === 'lost') sfx.play('lose')
  }, [snap.phase])

  // finish -> result
  useEffect(() => {
    if (snap.phase !== 'won' && snap.phase !== 'lost') return
    const t = setTimeout(
      () => {
        if (done.current) return
        done.current = true
        if (onFinish) {
          onFinish(snap.phase === 'won')
          return
        }
        const result = ctrl.buildResult(mode)
        const report = profileStore.recordRun(result)
        nav.go({ name: 'result', result, report, dungeon, back, next, tip })
      },
      snap.phase === 'won' ? 1100 : 1300,
    )
    return () => clearTimeout(t)
  }, [snap.phase, ctrl, mode, nav, dungeon, back, next, tip, onFinish])

  // keyboard
  useEffect(() => {
    let last = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exit()
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        restart()
        return
      }
      const a = KEYS[e.key]
      if (!a) return
      e.preventDefault()
      const now = performance.now()
      if (e.repeat && now - last < 110) return
      last = now
      ctrl.input(a)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctrl, exit, restart])

  if (!allowed) return <OutOfHealth back={back} />

  const showPad = profile.settings.touchControls === 'on' || (profile.settings.touchControls === 'auto' && coarse)
  const hint = tip && snap.moves < 3 && snap.phase !== 'lost' ? tip : null

  return (
    <div className="bg-dungeon min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-3 px-4 pb-6 pt-3">
        <div className="flex items-center gap-2">
          <button onClick={exit} aria-label="Leave dungeon" className="grid h-11 w-11 place-items-center rounded-xl text-zinc-300 hover:bg-ink-700">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold leading-tight">{dungeon.name}</div>
            <div className="truncate text-xs text-zinc-500">by {dungeon.creator.displayName}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={restart} aria-label="Restart run (R)">
            <RotateCcw size={15} /> <span className="hidden sm:inline">Restart</span> <kbd className="hidden rounded bg-ink-600 px-1.5 font-pixel text-[10px] sm:inline">R</kbd>
          </Button>
        </div>

        <div className="grid grid-cols-3 items-center gap-2 rounded-2xl border border-ink-600/70 bg-ink-800/80 px-4 py-2.5">
          <div>
            <Label>Time</Label>
            <div className="tabular font-pixel text-2xl text-zinc-50">{formatTime(snap.elapsedMs)}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Lives lives={snap.lives} />
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Key size={13} className={snap.keysHeld > 0 ? 'text-acid-500' : ''} /> <span className="tabular">{snap.keysHeld}</span>
            </div>
          </div>
          <div className="text-right">
            <Label>Combo</Label>
            <div className={`tabular font-pixel text-2xl ${snap.combo > 1 ? 'text-volt-400' : 'text-ink-400'}`}>
              {snap.combo > 1 ? (
                <span key={snap.combo} className="inline-flex animate-pop items-center gap-1">
                  <Zap size={16} />x{snap.combo}
                </span>
              ) : (
                'x1'
              )}
            </div>
          </div>
          <div className="col-span-3">
            <Bar ratio={snap.progress} />
          </div>
        </div>

        <div className="relative mx-auto w-full" style={{ maxWidth: 'min(100%, calc(100dvh - 300px))', minWidth: 'min(100%, 280px)' }}>
          <DungeonCanvas
            dungeon={dungeon}
            snapshot={snap}
            skinId={profile.equipped.skin}
            trailId={profile.equipped.trail}
            reduceMotion={profile.settings.reducedMotion}
            onSwipe={(a) => ctrl.input(a)}
            className="overflow-hidden rounded-xl shadow-volt"
          />
          {snap.phase === 'countdown' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-ink-950/50">
              <div key={snap.countdown} className="animate-pop font-pixel text-8xl text-acid-500 drop-shadow-[0_0_24px_rgba(185,255,59,.8)]">
                {snap.countdown}
              </div>
            </div>
          )}
          {snap.phase === 'running' && snap.moves === 0 && snap.elapsedMs < 700 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="animate-pop font-pixel text-7xl text-acid-500 drop-shadow-[0_0_24px_rgba(185,255,59,.8)]">GO</div>
            </div>
          )}
          {snap.phase === 'won' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="animate-pop font-pixel text-5xl text-acid-500 drop-shadow-[0_0_24px_rgba(185,255,59,.9)]">ESCAPED</div>
            </div>
          )}
          {snap.phase === 'lost' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-ink-950/60">
              <div className="animate-pop text-center font-pixel text-4xl text-blood-500">OUT OF LIVES</div>
            </div>
          )}
          {snap.lastHit && snap.phase === 'running' && <div key={snap.livesLost} className="pointer-events-none absolute inset-0 animate-hitflash rounded-xl border-4 border-blood-500" />}
        </div>

        <p className="min-h-5 text-center text-sm text-pretty text-zinc-400">
          {hint ?? (coarse ? 'Swipe the dungeon or use the pad. The hourglass waits one turn.' : 'WASD or arrows to move. Space waits a turn. R restarts.')}
        </p>

        {showPad && (
          <div className="mt-auto flex justify-start pt-2">
            <Dpad onAction={(a) => ctrl.input(a)} />
          </div>
        )}
      </div>
    </div>
  )
}
