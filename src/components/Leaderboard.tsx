import { useMemo } from 'react'
import { Medal } from 'lucide-react'
import { hashString } from '@/game/codec'
import { mulberry32 } from '@/game/daily'
import { formatTime } from '@/game/result'
import { Label } from './ui'

const NAMES = ['NEON_WRAITH', 'pixel.pete', 'GRIDLOCK', 'sir_spikes', 'Vexa', 'moth_king', 'LOWBIT', 'dungeon_dan', 'KiraRun', 'ash.byte', 'toadmage', 'ZeroLives']

export interface BoardEntry {
  name: string
  timeMs: number
  you: boolean
}

/** Deterministic local demo scores. Replace with a real service when a backend exists. */
export function demoBoard(dungeonId: string, par: number, you?: { name: string; timeMs: number }): BoardEntry[] {
  const rng = mulberry32(hashString(`board:${dungeonId}`))
  const pool = [...NAMES].sort(() => rng() - 0.5).slice(0, 8)
  const entries: BoardEntry[] = pool.map((name) => ({ name, timeMs: Math.round(par * (330 + rng() * 520) + rng() * 4000), you: false }))
  if (you) entries.push({ name: you.name, timeMs: you.timeMs, you: true })
  return entries.sort((a, b) => a.timeMs - b.timeMs)
}

export function Leaderboard({ dungeonId, par, you }: { dungeonId: string; par: number; you?: { name: string; timeMs: number } | null }) {
  const rows = useMemo(() => demoBoard(dungeonId, par, you ?? undefined), [dungeonId, par, you])
  const youIndex = rows.findIndex((r) => r.you)
  const shown = rows.slice(0, 5)
  if (youIndex >= 5) shown.push(rows[youIndex])

  return (
    <div className="rounded-2xl border border-ink-600/80 bg-ink-800/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Label>Leaderboard</Label>
        <span className="rounded-full bg-ink-600 px-2 py-0.5 font-pixel text-[9px] uppercase tracking-wider text-zinc-400">Local demo data</span>
      </div>
      <ol className="flex flex-col gap-1">
        {shown.map((r) => {
          const rank = rows.indexOf(r) + 1
          return (
            <li key={`${r.name}-${r.timeMs}`} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${r.you ? 'bg-acid-500/15 text-acid-300 ring-1 ring-acid-500/40' : 'bg-ink-900/50 text-zinc-300'}`}>
              <span className="tabular w-6 font-pixel text-xs">{rank <= 3 ? <Medal size={16} className={rank === 1 ? 'text-yellow-300' : rank === 2 ? 'text-zinc-300' : 'text-ember-500'} /> : rank}</span>
              <span className="flex-1 truncate font-medium">{r.you ? `${r.name} (you)` : r.name}</span>
              <span className="tabular font-pixel text-xs">{formatTime(r.timeMs)}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
