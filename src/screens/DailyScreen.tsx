import { useCallback, useEffect, useState } from 'react'
import { Flame, Loader2, Play, RefreshCw } from 'lucide-react'
import { useNav } from '@/app/nav'
import { playRoute } from '@/app/routes'
import { Leaderboard } from '@/components/Leaderboard'
import { Button, Difficulty, Label, MiniDungeon, Notice, Panel, Screen, Stat } from '@/components/ui'
import { dateKey, generateDaily, msUntilNextDaily, previousDateKey } from '@/game/daily'
import { formatTime } from '@/game/result'
import type { Dungeon } from '@/game/types'
import { useProfile } from '@/progress/store'

function useCountdown(): string {
  const [ms, setMs] = useState(msUntilNextDaily())
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextDaily()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export function DailyScreen() {
  const { go } = useNav()
  const p = useProfile()
  const key = dateKey()
  const [dungeon, setDungeon] = useState<Dungeon | null>(null)
  const [error, setError] = useState<string | null>(null)
  const countdown = useCountdown()

  const [attempt, setAttempt] = useState(0)
  const load = useCallback(() => {
    setError(null)
    setDungeon(null)
    setAttempt((a) => a + 1)
  }, [])

  useEffect(() => {
    let live = true
    generateDaily(key).then(
      (d) => live && setDungeon(d),
      () => live && setError("Could not prepare today's dungeon."),
    )
    return () => {
      live = false
    }
  }, [key, attempt])

  const today = p.daily[key]
  const week = Array.from({ length: 7 }, (_, i) => {
    let k = key
    for (let n = 0; n < 6 - i; n++) k = previousDateKey(k)
    return { k, done: Boolean(p.daily[k]) }
  })

  return (
    <Screen title="Daily Challenge" onBack={() => go({ name: 'modes' })}>
      <div className="flex flex-col gap-4">
        <Panel className="relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-ember-500/20 blur-2xl" />
          <div className="flex items-start justify-between">
            <div>
              <Label>{key}</Label>
              <div className="font-display text-2xl font-bold">Today's dungeon</div>
              <div className="mt-1 text-sm text-zinc-400">
                Same layout for every runner. Resets in <span className="tabular font-pixel text-ember-400">{countdown}</span> (UTC).
              </div>
            </div>
            <div className="text-right">
              <Flame className="ml-auto text-ember-500" size={28} />
              <div className="tabular font-pixel text-xl text-ember-400">{p.streak.current}</div>
              <Label>day streak</Label>
            </div>
          </div>
          <div className="mt-4 flex gap-1.5" aria-label="Last 7 days">
            {week.map((d) => (
              <div key={d.k} title={d.k} className={`h-2.5 flex-1 rounded-full ${d.done ? 'bg-ember-500 shadow-ember' : 'bg-ink-600'}`} />
            ))}
          </div>
        </Panel>

        {error && (
          <Notice tone="error">
            <div className="flex items-center justify-between gap-3">
              {error}
              <Button size="sm" onClick={load}>
                <RefreshCw size={14} /> Retry
              </Button>
            </div>
          </Notice>
        )}

        {!dungeon && !error && (
          <Panel className="flex items-center justify-center gap-3 py-10 text-zinc-300">
            <Loader2 className="animate-spin" size={20} /> Building and verifying today's dungeon
          </Panel>
        )}

        {dungeon && (
          <>
            <Panel className="flex items-center gap-4">
              <MiniDungeon dungeon={dungeon} px={112} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Difficulty level={dungeon.difficulty} />
                <div className="mt-1 font-display text-lg font-bold">{dungeon.name}</div>
                <div className="tabular text-sm text-zinc-400">Shortest escape: {dungeon.par} turns</div>
                {today ? (
                  <div className="mt-2 text-sm text-acid-300">Cleared today in {formatTime(today.timeMs)}</div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-400">Not attempted yet</div>
                )}
              </div>
            </Panel>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Best streak" value={p.streak.best} accent="text-ember-400" />
              <Stat label="Dailies" value={Object.keys(p.daily).length} />
              <Stat label="Today" value={today ? formatTime(today.timeMs) : '-'} accent="text-acid-500" />
            </div>
            <Button variant="primary" size="lg" onClick={() => go(playRoute(dungeon, 'daily', { name: 'daily' }, null))}>
              <Play size={18} className="fill-current" /> {today ? 'Beat your time' : 'Start the run'}
            </Button>
            <Leaderboard dungeonId={dungeon.id} par={dungeon.par ?? 30} you={today ? { name: p.displayName, timeMs: today.timeMs } : null} />
          </>
        )}
      </div>
    </Screen>
  )
}
