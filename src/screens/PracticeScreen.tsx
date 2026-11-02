import { Lock, Trophy } from 'lucide-react'
import { useNav } from '@/app/nav'
import { playRoute } from '@/app/routes'
import { Difficulty, MiniDungeon, Screen } from '@/components/ui'
import { PRACTICE_LEVELS } from '@/game/levels'
import { formatTime } from '@/game/result'
import { sfx } from '@/lib/audio'
import { useProfile } from '@/progress/store'

export function PracticeScreen() {
  const { go } = useNav()
  const p = useProfile()
  const cleared = PRACTICE_LEVELS.filter((l) => (p.clears[l.dungeon.id] ?? 0) > 0).length

  return (
    <Screen
      title="Practice"
      onBack={() => go({ name: 'modes' })}
      right={
        <span className="tabular font-pixel text-xs text-zinc-400">
          {cleared}/{PRACTICE_LEVELS.length} CLEARED
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRACTICE_LEVELS.map((l, i) => {
          const locked = i >= p.practiceUnlocked
          const best = p.bests[l.dungeon.id]
          const done = (p.clears[l.dungeon.id] ?? 0) > 0
          return (
            <button
              key={l.dungeon.id}
              disabled={locked}
              onClick={() => {
                sfx.play('click')
                go(playRoute(l.dungeon, 'practice', { name: 'practice' }, PRACTICE_LEVELS[i + 1]?.dungeon ?? null, l.tip))
              }}
              className={`animate-rise rounded-2xl border p-3 text-left transition active:scale-[0.97] ${
                locked ? 'cursor-not-allowed border-ink-600/50 bg-ink-800/40 opacity-60' : done ? 'border-acid-500/30 bg-ink-800/80 hover:border-acid-500' : 'border-ink-500 bg-ink-800/80 hover:border-volt-400'
              }`}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div className="relative">
                <MiniDungeon dungeon={l.dungeon} px={120} className={`w-full ${locked ? 'opacity-25 blur-[1px]' : ''}`} />
                {locked && <Lock className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300" size={24} />}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-pixel text-[10px] text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                <Difficulty level={l.dungeon.difficulty} />
              </div>
              <div className="truncate font-display text-sm font-bold text-zinc-50">{l.dungeon.name}</div>
              <div className="tabular mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                {best ? (
                  <>
                    <Trophy size={12} className="text-acid-500" /> {formatTime(best.timeMs)}
                  </>
                ) : locked ? (
                  'Clear earlier levels'
                ) : (
                  'Not cleared'
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Screen>
  )
}
