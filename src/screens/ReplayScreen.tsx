import { useEffect, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react'
import { useNav, type Route } from '@/app/nav'
import { Button, Label } from '@/components/ui'
import { formatTime } from '@/game/result'
import { RunController } from '@/game/run'
import type { Action, Dungeon } from '@/game/types'
import { DungeonCanvas } from '@/render/DungeonCanvas'
import { sfx } from '@/lib/audio'
import { useProfile } from '@/progress/store'

const STEP_MS = 170

export function ReplayScreen({ dungeon, actions, back }: { dungeon: Dungeon; actions: string; back: Route }) {
  const { go } = useNav()
  const profile = useProfile()
  const [ctrl] = useState(() => new RunController(dungeon, { countdownStepMs: 0 }))
  const snap = useSyncExternalStore(ctrl.subscribe, ctrl.getSnapshot)
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    ctrl.start()
    return () => ctrl.dispose()
  }, [ctrl])

  useEffect(() => {
    if (!playing || cursor >= actions.length) return
    const t = setTimeout(() => {
      ctrl.input(actions[cursor] as Action)
      setCursor((c) => c + 1)
    }, STEP_MS)
    return () => clearTimeout(t)
  }, [playing, cursor, actions, ctrl])

  useEffect(() => {
    for (const e of snap.events.list) if (e.type === 'key' || e.type === 'door' || e.type === 'lever' || e.type === 'hit' || e.type === 'win') sfx.play(e.type)
  }, [snap.events])

  const finished = cursor >= actions.length

  return (
    <div className="bg-dungeon min-h-dvh">
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 pb-8 pt-3">
        <div className="flex items-center gap-2">
          <button onClick={() => go(back)} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-xl text-zinc-300 hover:bg-ink-700">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <Label>Replay</Label>
            <div className="truncate font-display text-base font-bold">{dungeon.name}</div>
          </div>
          <div className="tabular font-pixel text-sm text-zinc-300">{formatTime(snap.elapsedMs)}</div>
        </div>
        <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, calc(100dvh - 220px))' }}>
          <DungeonCanvas dungeon={dungeon} snapshot={snap} skinId={profile.equipped.skin} trailId={profile.equipped.trail} reduceMotion={profile.settings.reducedMotion} className="overflow-hidden rounded-xl shadow-volt" />
        </div>
        <div className="tabular text-center text-xs text-zinc-500">
          Step {Math.min(cursor, actions.length)} of {actions.length}. Replays step at a fixed pace; the original clock was real time.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setPlaying((p) => !p)} disabled={finished}>
            {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="volt"
            onClick={() => {
              setPlaying(true)
              ctrl.start()
              setCursor(0)
            }}
          >
            <RotateCcw size={16} /> Again
          </Button>
        </div>
      </div>
    </div>
  )
}
