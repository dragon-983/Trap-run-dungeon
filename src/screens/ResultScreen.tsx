import { useEffect, useState } from 'react'
import { Award, Copy, Film, Home, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useNav, type Route } from '@/app/nav'
import { playRoute } from '@/app/routes'
import { Leaderboard } from '@/components/Leaderboard'
import { Bar, Button, Label, Stat } from '@/components/ui'
import { PRACTICE_LEVELS } from '@/game/levels'
import { formatTime, type RunResult } from '@/game/result'
import type { Dungeon, HazardCause } from '@/game/types'
import { sfx } from '@/lib/audio'
import { buildShareLink, getShareBase } from '@/lib/share'
import { getAchievement } from '@/progress/achievements'
import { getCosmetic } from '@/progress/cosmetics'
import type { ProgressReport } from '@/progress/progression'
import { levelProgress } from '@/progress/profile'
import { useProfile } from '@/progress/store'

interface Props {
  result: RunResult
  report: ProgressReport
  dungeon: Dungeon
  back: Route
  next: Dungeon | null
  tip?: string
}

const ADVICE: Record<HazardCause, string> = {
  spike: 'Spikes never move. Route around them.',
  pulse: 'A pulse plate glows orange one turn before it fires. Wait with Space.',
  sentry: 'The purple dots show a sentry patrol path. Time your crossing.',
}

export function ResultScreen({ result, report, dungeon, back, next, tip }: Props) {
  const { go } = useNav()
  const profile = useProfile()
  const win = result.outcome === 'win'
  const lv = levelProgress(profile.xp)
  const [shareBase, setShareBase] = useState<string | null>(null)

  useEffect(() => {
    sfx.play(report.levelAfter > report.levelBefore ? 'levelup' : 'click')
    void getShareBase().then(setShareBase)
  }, [report])

  const topCause = (Object.entries(result.killedBy) as Array<[HazardCause, number]>).sort((a, b) => b[1] - a[1])[0]
  const retry = () => go(playRoute(dungeon, result.mode, back, next, tip))

  const copyResult = async () => {
    const link = await buildShareLink('/')
    const text = `TRAP//RUN ${dungeon.name}: ${formatTime(result.timeMs)}, ${result.moves} moves, ${3 - result.livesLost}/3 lives. Beat it: ${link}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Result copied')
    } catch {
      toast.error('Could not copy. Select and copy manually.')
    }
  }

  return (
    <div className="bg-dungeon min-h-dvh pb-16">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-8">
        <div className="animate-pop text-center">
          <div className={`font-pixel text-4xl sm:text-5xl ${win ? 'text-acid-500 drop-shadow-[0_0_20px_rgba(185,255,59,.7)]' : 'text-blood-500 drop-shadow-[0_0_20px_rgba(255,61,90,.6)]'}`}>
            {win ? 'ESCAPED' : 'CAUGHT'}
          </div>
          <div className="mt-2 font-display text-lg text-zinc-300">{dungeon.name}</div>
          {win && report.isBest && <div className="mt-2 inline-block rounded-full bg-acid-500 px-3 py-1 font-pixel text-[10px] text-ink-950">NEW BEST TIME</div>}
        </div>

        {win ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Time" value={formatTime(result.timeMs)} accent="text-acid-500" />
            <Stat label="Moves" value={`${result.moves}`} />
            <Stat label="Lives lost" value={result.livesLost} accent={result.livesLost === 0 ? 'text-acid-500' : 'text-blood-400'} />
            <Stat label="Score" value={result.score} accent="text-volt-300" />
          </div>
        ) : (
          <div className="rounded-2xl border border-ink-600/80 bg-ink-800/70 p-4">
            <Label>Progress to exit</Label>
            <div className="tabular my-2 font-display text-2xl font-bold">{Math.round(result.progress * 100)}%</div>
            <Bar ratio={result.progress} color="bg-ember-500" />
            {topCause && topCause[1] > 0 && <p className="mt-3 text-sm text-zinc-300">{ADVICE[topCause[0]]}</p>}
            <p className="mt-1 text-sm text-zinc-500">Every run teaches you the layout. Go again.</p>
          </div>
        )}

        {win && (result.bestCombo > 1 || result.nearMisses > 0) && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Best combo" value={`x${result.bestCombo}`} accent="text-volt-300" />
            <Stat label="Near misses" value={result.nearMisses} accent="text-ember-400" />
          </div>
        )}

        <div className="rounded-2xl border border-ink-600/80 bg-ink-800/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <Label>Experience</Label>
            <span className="tabular font-pixel text-sm text-acid-500">{result.mode === 'test' ? 'Test run' : `+${report.xpGained} XP`}</span>
          </div>
          <ul className="mb-3 flex flex-col gap-1 text-sm text-zinc-300">
            {report.breakdown.map((b) => (
              <li key={b.label} className="flex justify-between">
                <span>{b.label}</span>
                <span className="tabular text-zinc-400">+{b.xp}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <span className="font-pixel text-xs text-zinc-400">LV {lv.level}</span>
            <div className="flex-1">
              <Bar ratio={lv.ratio} color="bg-volt-500" />
            </div>
          </div>
          {report.levelAfter > report.levelBefore && (
            <div className="mt-3 flex animate-pop items-center gap-2 rounded-xl bg-volt-500/15 px-3 py-2 font-display font-bold text-volt-300">
              <Sparkles size={18} /> Level up! You are now level {report.levelAfter}.
            </div>
          )}
          {report.healthGained > 0 && <div className="mt-2 text-sm text-blood-400">Daily clear bonus: +{report.healthGained} health.</div>}
          {report.unlockedNextLevel && <div className="mt-2 text-sm text-acid-300">New practice dungeon unlocked.</div>}
          {report.streak !== null && report.streak > 0 && <div className="mt-2 text-sm text-ember-400">Daily streak: {report.streak} day{report.streak > 1 ? 's' : ''}.</div>}
        </div>

        {(report.newCosmetics.length > 0 || report.newAchievements.length > 0) && (
          <div className="rounded-2xl border border-acid-500/40 bg-acid-500/10 p-4">
            <Label className="mb-2 flex items-center gap-1 !text-acid-300">
              <Award size={12} /> Unlocked
            </Label>
            <ul className="flex flex-col gap-1 text-sm text-zinc-100">
              {report.newCosmetics.map((id) => (
                <li key={id}>New cosmetic: {getCosmetic(id).name}</li>
              ))}
              {report.newAchievements.map((id) => (
                <li key={id}>Achievement: {getAchievement(id)?.title}</li>
              ))}
            </ul>
          </div>
        )}

        {win && <Leaderboard dungeonId={dungeon.id} par={result.par} you={{ name: profile.displayName, timeMs: profile.bests[dungeon.id]?.timeMs ?? result.timeMs }} />}

        <div className="flex flex-col gap-2">
          {win && next && (
            <Button variant="primary" size="lg" onClick={() => {
                const i = PRACTICE_LEVELS.findIndex((l) => l.dungeon.id === next.id)
                go(playRoute(next, 'practice', back, PRACTICE_LEVELS[i + 1]?.dungeon ?? null, PRACTICE_LEVELS[i]?.tip))
              }}>
              <SkipForward size={18} /> Next dungeon
            </Button>
          )}
          <Button variant={win && next ? 'ghost' : 'primary'} size="lg" onClick={retry}>
            <RotateCcw size={18} /> {win ? 'Run it again' : 'Try again'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            {result.actions && (
              <Button onClick={() => go({ name: 'replay', dungeon, actions: result.actions, back: { name: 'result', result, report, dungeon, back, next, tip } })}>
                <Film size={16} /> Replay
              </Button>
            )}
            {win && (
              <Button onClick={() => void copyResult()} disabled={!shareBase}>
                <Copy size={16} /> Copy result
              </Button>
            )}
            <Button onClick={() => go(back)}>
              <Home size={16} /> Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
