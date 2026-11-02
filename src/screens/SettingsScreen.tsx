import { useState } from 'react'
import { useNav } from '@/app/nav'
import { Button, Label, Panel, Screen } from '@/components/ui'
import { sfx } from '@/lib/audio'
import type { Settings } from '@/progress/profile'
import { profileStore, useProfile } from '@/progress/store'

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-left"
    >
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? 'bg-acid-500' : 'bg-ink-500'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-ink-950 transition-all ${value ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}

export function SettingsScreen() {
  const { go } = useNav()
  const p = useProfile()
  const [confirm, setConfirm] = useState(false)
  const set = (patch: Partial<Settings>) => profileStore.setSettings(patch)

  return (
    <Screen title="Settings" onBack={() => go({ name: 'menu' })}>
      <div className="flex flex-col gap-4">
        <Panel className="divide-y divide-ink-600">
          <Toggle label="Sound effects" value={p.settings.sound} onChange={(v) => set({ sound: v })} />
          <div className="py-3">
            <label className="block font-semibold" htmlFor="vol">
              Volume
            </label>
            <input
              id="vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.settings.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              onPointerUp={() => sfx.play('key')}
              className="mt-2 h-8 w-full accent-[#b9ff3b]"
            />
          </div>
          <Toggle label="Reduce motion" hint="Fewer particles, no screen shake." value={p.settings.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
          <Toggle label="30 second build timer" hint="Turn off to build at your own pace in Creator Mode." value={p.settings.buildTimer} onChange={(v) => set({ buildTimer: v })} />
        </Panel>

        <Panel>
          <Label className="mb-2">Touch controls</Label>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-900 p-1" role="radiogroup" aria-label="Touch controls">
            {(['auto', 'on', 'off'] as const).map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={p.settings.touchControls === v}
                onClick={() => set({ touchControls: v })}
                className={`min-h-11 rounded-lg text-sm font-semibold capitalize transition ${p.settings.touchControls === v ? 'bg-volt-500 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Auto shows the on-screen pad on touch devices. Swiping the dungeon always works.</p>
        </Panel>

        <Panel>
          <Label className="mb-2">Controls</Label>
          <ul className="grid gap-1 text-sm text-zinc-300">
            <li>WASD or arrow keys: move</li>
            <li>Space: wait one turn (hazards still move)</li>
            <li>R: restart the run</li>
            <li>Esc: leave the dungeon</li>
          </ul>
        </Panel>

        <Panel>
          <Label className="mb-2">Saved data</Label>
          <p className="mb-3 text-sm text-zinc-400">Progress is stored in this browser only.</p>
          {confirm ? (
            <div className="flex gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  profileStore.resetAll()
                  setConfirm(false)
                  go({ name: 'menu' })
                }}
              >
                Yes, erase everything
              </Button>
              <Button onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setConfirm(true)}>Reset progress</Button>
          )}
        </Panel>
      </div>
    </Screen>
  )
}
