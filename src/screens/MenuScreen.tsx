import { Flame, Hammer, Play, Settings, ShoppingBag, User } from 'lucide-react'
import { useNav } from '@/app/nav'
import { AccountChip, HealthPill } from '@/components/AccountPanel'
import { Bar, Button, Label, Logo, Notice } from '@/components/ui'
import { PRACTICE_LEVELS } from '@/game/levels'
import { DungeonCanvas } from '@/render/DungeonCanvas'
import { levelProgress } from '@/progress/profile'
import { profileStore, useProfile, useStorageInfo } from '@/progress/store'
import { sfx } from '@/lib/audio'

const BACKDROP = PRACTICE_LEVELS[5].dungeon

export function MenuScreen() {
  const { go } = useNav()
  const p = useProfile()
  const info = useStorageInfo()
  const lv = levelProgress(p.xp)
  const nav = (r: Parameters<typeof go>[0]) => () => {
    sfx.play('click')
    go(r)
  }

  return (
    <div className="bg-dungeon relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-24 top-1/2 hidden w-[520px] -translate-y-1/2 rotate-3 opacity-60 lg:block">
        <DungeonCanvas dungeon={BACKDROP} skinId={p.equipped.skin} trailId={p.equipped.trail} reduceMotion={p.settings.reducedMotion} dim />
      </div>
      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-5 py-10">
        <div className="flex items-center justify-between gap-2">
          <AccountChip />
          <HealthPill onClick={nav({ name: 'shop' })} />
        </div>
        <div className="animate-rise">
          <Logo size="xl" />
          <p className="mt-4 max-w-sm text-pretty text-zinc-300">Build a dungeon. Set the traps. Dare everyone to escape faster than you.</p>
        </div>

        {info.error && (
          <Notice tone="error">
            <div>{info.error}</div>
            <button onClick={() => profileStore.dismissStorageError()} className="mt-1 font-semibold underline">
              Dismiss
            </button>
          </Notice>
        )}

        <button onClick={nav({ name: 'profile' })} className="animate-rise rounded-2xl border border-ink-600/80 bg-ink-800/70 p-4 text-left transition hover:border-volt-500" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <Label>Runner</Label>
              <div className="font-display text-lg font-bold">{p.displayName}</div>
            </div>
            <div className="text-right">
              <Label>Level</Label>
              <div className="tabular font-pixel text-2xl text-acid-500">{lv.level}</div>
            </div>
          </div>
          <div className="mt-3">
            <Bar ratio={lv.ratio} color="bg-volt-500" />
            <div className="tabular mt-1 text-xs text-zinc-400">
              {lv.into} / {lv.needed} XP
            </div>
          </div>
        </button>

        <div className="flex animate-rise flex-col gap-3" style={{ animationDelay: '120ms' }}>
          <Button variant="primary" size="lg" onClick={nav({ name: 'modes' })}>
            <Play size={18} className="fill-current" /> Play
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={nav({ name: 'daily' })}>
              <Flame size={16} className="text-ember-500" /> Daily {p.streak.current > 0 && <span className="tabular text-ember-400">{p.streak.current}d</span>}
            </Button>
            <Button variant="ghost" onClick={nav({ name: 'shop' })}>
              <ShoppingBag size={16} className="text-acid-500" /> Shop
            </Button>
            <Button variant="ghost" onClick={nav({ name: 'editor' })}>
              <Hammer size={16} /> Creator
            </Button>
            <Button variant="ghost" onClick={nav({ name: 'profile' })}>
              <User size={16} /> Profile
            </Button>
            <Button variant="ghost" className="col-span-2" onClick={nav({ name: 'settings' })}>
              <Settings size={16} /> Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
