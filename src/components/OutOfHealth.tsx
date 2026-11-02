import { useEffect, useState } from 'react'
import { Flame, Heart, ShoppingBag } from 'lucide-react'
import { useNav, type Route } from '@/app/nav'
import { msUntilNextDaily } from '@/game/daily'
import { DAILY_CLEAR_BONUS, FREE_HEALTH_PER_DAY } from '@/progress/health'
import { Button, Panel } from './ui'

export function OutOfHealth({ back }: { back: Route }) {
  const { go } = useNav()
  const [ms, setMs] = useState(msUntilNextDaily())
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextDaily()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="bg-dungeon grid min-h-dvh place-items-center px-4">
      <Panel className="w-full max-w-sm text-center">
        <Heart size={36} className="mx-auto text-ink-400" />
        <div className="mt-2 font-pixel text-2xl text-blood-500">OUT OF HEALTH</div>
        <p className="mt-2 text-sm text-zinc-400">
          Every run costs 1 health. You get {FREE_HEALTH_PER_DAY} free each day, refilled in{' '}
          <span className="tabular font-pixel text-acid-500">
            {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
          </span>{' '}
          (UTC).
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="ember" onClick={() => go({ name: 'shop' })}>
            <ShoppingBag size={16} /> Get more health
          </Button>
          <Button onClick={() => go({ name: 'daily' })}>
            <Flame size={16} className="text-ember-500" /> Daily challenge: +{DAILY_CLEAR_BONUS} health
          </Button>
          <Button variant="ghost" onClick={() => go(back)}>
            Back
          </Button>
        </div>
      </Panel>
    </div>
  )
}
