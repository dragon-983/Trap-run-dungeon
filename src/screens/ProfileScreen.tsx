import { useState } from 'react'
import { Award, ExternalLink, Lock, Plug, Receipt, Trophy } from 'lucide-react'
import { useNav } from '@/app/nav'
import { AuthCard, SignedInDetails } from '@/components/AccountPanel'
import { Bar, Button, Label, Panel, Screen, Stat } from '@/components/ui'
import { PRACTICE_LEVELS } from '@/game/levels'
import { formatTime } from '@/game/result'
import { ACHIEVEMENTS } from '@/progress/achievements'
import { COSMETICS, describeRule, type Cosmetic } from '@/progress/cosmetics'
import { levelProgress } from '@/progress/profile'
import { profileStore, useProfile } from '@/progress/store'
import { services } from '@/services'
import { NETWORK_LABEL } from '@/web3/network'
import { formatUsdcAmount, txUrl } from '@/web3/shop'
import { sfx } from '@/lib/audio'

function Swatch({ c }: { c: Cosmetic }) {
  return <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.accent})`, boxShadow: `0 0 14px ${c.color}66` }} />
}

export function ProfileScreen() {
  const { go } = useNav()
  const p = useProfile()
  const lv = levelProgress(p.xp)
  const [name, setName] = useState(p.displayName)
  const rate = p.runs > 0 ? Math.round((p.wins / p.runs) * 100) : 0
  const cleared = PRACTICE_LEVELS.filter((l) => (p.clears[l.dungeon.id] ?? 0) > 0).length
  const minutes = Math.floor(p.playMs / 60000)

  return (
    <Screen title="Profile" onBack={() => go({ name: 'menu' })}>
      <div className="flex flex-col gap-4">
        <AuthCard />
        <Panel>
          <Label>Runner name</Label>
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              profileStore.setName(name)
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              aria-label="Runner name"
              className="h-11 min-w-0 flex-1 rounded-xl border border-ink-500 bg-ink-900 px-3 font-display font-bold text-zinc-50 outline-none focus:border-volt-400"
            />
            <Button type="submit" disabled={name.trim() === p.displayName || !name.trim()}>
              Save
            </Button>
          </form>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-volt-500/20 font-pixel text-2xl text-acid-500">{lv.level}</div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Level {lv.level}</span>
                <span className="tabular">
                  {lv.into} / {lv.needed} XP
                </span>
              </div>
              <div className="mt-1.5">
                <Bar ratio={lv.ratio} color="bg-volt-500" />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">XP, levels and leaderboard times come from skill and consistency only. Nothing you buy affects them.</p>
          <div className="mt-3">
            <SignedInDetails />
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Escapes" value={p.wins} accent="text-acid-500" />
          <Stat label="Defeats" value={p.losses} accent="text-blood-400" />
          <Stat label="Win rate" value={`${rate}%`} />
          <Stat label="Flawless" value={p.flawlessRuns} />
          <Stat label="Streak" value={`${p.streak.current}d`} accent="text-ember-400" />
          <Stat label="Best streak" value={`${p.streak.best}d`} />
          <Stat label="Best combo" value={`x${p.bestCombo}`} accent="text-volt-300" />
          <Stat label="Near misses" value={p.nearMisses} />
        </div>

        <Panel>
          <Label className="mb-3">Dungeon completion</Label>
          <div className="mb-2 flex justify-between text-sm">
            <span>Practice</span>
            <span className="tabular text-zinc-400">
              {cleared} / {PRACTICE_LEVELS.length}
            </span>
          </div>
          <Bar ratio={cleared / PRACTICE_LEVELS.length} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-zinc-400">
            <div>
              <div className="tabular font-pixel text-lg text-zinc-50">{Object.keys(p.daily).length}</div>dailies
            </div>
            <div>
              <div className="tabular font-pixel text-lg text-zinc-50">{p.published.length}</div>published
            </div>
            <div>
              <div className="tabular font-pixel text-lg text-zinc-50">{minutes}</div>min played
            </div>
          </div>
        </Panel>

        <Panel>
          <Label className="mb-3 flex items-center gap-1">
            <Trophy size={12} /> Best escape times
          </Label>
          {Object.keys(p.bests).length === 0 ? (
            <p className="text-sm text-zinc-400">No escapes yet. Clear a practice dungeon to set your first time.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {PRACTICE_LEVELS.filter((l) => p.bests[l.dungeon.id]).map((l) => (
                <li key={l.dungeon.id} className="flex justify-between rounded-lg bg-ink-900/60 px-3 py-2">
                  <span>{l.dungeon.name}</span>
                  <span className="tabular font-pixel text-xs text-acid-500">{formatTime(p.bests[l.dungeon.id].timeMs)}</span>
                </li>
              ))}
              {Object.entries(p.daily)
                .slice(-3)
                .map(([k, v]) => (
                  <li key={k} className="flex justify-between rounded-lg bg-ink-900/60 px-3 py-2">
                    <span>Daily {k}</span>
                    <span className="tabular font-pixel text-xs text-ember-400">{formatTime(v.timeMs)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <Label className="mb-3">Cosmetics</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {COSMETICS.map((c) => {
              const owned = p.unlocked.includes(c.id)
              const on = p.equipped[c.kind] === c.id
              return (
                <button
                  key={c.id}
                  disabled={!owned}
                  onClick={() => {
                    sfx.play('click')
                    profileStore.equip(c.kind, c.id)
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-acid-500 bg-acid-500/10' : 'border-ink-500 bg-ink-900/50'} ${owned ? 'hover:border-volt-400' : 'opacity-55'}`}
                >
                  {owned ? <Swatch c={c} /> : <Lock className="h-8 w-8 shrink-0 p-1.5 text-zinc-500" />}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-zinc-500">
                      {c.kind === 'skin' ? 'Skin' : 'Trail'} · {on ? 'Equipped' : owned ? 'Tap to equip' : describeRule(c.rule)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <Label className="mb-3 flex items-center gap-1">
            <Award size={12} /> Achievements
          </Label>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = p.achievements.some((r) => r.id === a.id)
              return (
                <li key={a.id} className={`rounded-xl border p-3 ${got ? 'border-volt-500/50 bg-volt-500/10' : 'border-ink-600 bg-ink-900/40 opacity-60'}`}>
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-zinc-400">{a.description}</div>
                </li>
              )
            })}
          </ul>
        </Panel>

        {p.payments.length > 0 && (
          <Panel>
            <Label className="mb-3 flex items-center gap-1">
              <Receipt size={12} /> Payments
            </Label>
            <ul className="flex flex-col gap-1 text-sm">
              {p.payments.slice(0, 8).map((r) => (
                <li key={r.txHash} className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/60 px-3 py-2">
                  <span className="truncate">
                    <span className="capitalize">{r.kind}</span> · {r.label}
                  </span>
                  <a href={txUrl(r.txHash)} target="_blank" rel="noopener noreferrer" className="tabular inline-flex shrink-0 items-center gap-1 font-pixel text-xs text-acid-500">
                    {formatUsdcAmount(BigInt(r.amount))} USDC <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel>
          <Label className="mb-2 flex items-center gap-1">
            <Plug size={12} /> Wallets
          </Label>
          <p className="text-sm text-zinc-300">Your Arc wallet is your account. You can always play as a guest. NEAR and Stellar identities will be linked separately later, each proven by its own signed challenge.</p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            <li className="flex justify-between rounded-lg bg-ink-900/60 px-3 py-2">
              <span>{NETWORK_LABEL}</span>
              <span className={p.wallets.some((w) => w.chain === 'arc') ? 'text-acid-300' : 'text-zinc-500'}>{p.wallets.some((w) => w.chain === 'arc') ? 'Signed in' : 'Not signed in'}</span>
            </li>
            {services.wallets.list().map((w) => (
              <li key={w.chain} className="flex justify-between rounded-lg bg-ink-900/60 px-3 py-2">
                <span>{w.displayName}</span>
                <span className="text-zinc-500">Not available yet</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Screen>
  )
}
