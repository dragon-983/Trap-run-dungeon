import { Flame, Hammer, Swords, Target, type LucideIcon } from 'lucide-react'
import { useNav, type Route } from '@/app/nav'
import { Screen } from '@/components/ui'
import { sfx } from '@/lib/audio'

const MODES: Array<{ route: Route; title: string; blurb: string; icon: LucideIcon; tint: string }> = [
  { route: { name: 'practice' }, title: 'Practice', blurb: '12 handmade dungeons that get meaner as you go.', icon: Target, tint: 'text-acid-500 border-acid-500/40 hover:shadow-acid' },
  { route: { name: 'daily' }, title: 'Daily Challenge', blurb: 'One dungeon for everyone. Keep your streak alive.', icon: Flame, tint: 'text-ember-500 border-ember-500/40 hover:shadow-ember' },
  { route: { name: 'friend' }, title: 'Challenge a Friend', blurb: 'Share a code or link. They run your dungeon.', icon: Swords, tint: 'text-volt-400 border-volt-500/40 hover:shadow-volt' },
  { route: { name: 'editor' }, title: 'Creator Mode', blurb: 'Build a dungeon in 30 seconds, test it, publish it.', icon: Hammer, tint: 'text-zinc-100 border-ink-400 hover:border-zinc-300' },
]

export function ModesScreen() {
  const { go } = useNav()
  return (
    <Screen title="Choose a mode" onBack={() => go({ name: 'menu' })}>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m, i) => (
          <button
            key={m.title}
            onClick={() => {
              sfx.play('click')
              go(m.route)
            }}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`group animate-rise rounded-2xl border bg-ink-800/80 p-5 text-left transition active:scale-[0.98] ${m.tint}`}
          >
            <m.icon size={28} />
            <div className="mt-4 font-display text-xl font-bold text-zinc-50">{m.title}</div>
            <p className="mt-1 text-pretty text-sm text-zinc-400">{m.blurb}</p>
          </button>
        ))}
      </div>
    </Screen>
  )
}
