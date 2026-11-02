import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Copy, Hammer, Link2, Loader2, Play, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { usePublicClient } from 'wagmi'
import { inbox } from '@/app/inbox'
import { useNav } from '@/app/nav'
import { playRoute } from '@/app/routes'
import { AuthCard, shortAddress } from '@/components/AccountPanel'
import { PayStatus } from '@/components/PayStatus'
import { Button, Difficulty, Label, MiniDungeon, Notice, Panel, Screen } from '@/components/ui'
import { decodeChallengeId, decodeDungeon, encodeDungeon, extractCode, roomCodeFor } from '@/game/codec'
import { PRACTICE_LEVELS } from '@/game/levels'
import { validateDungeon } from '@/game/validate'
import type { Dungeon } from '@/game/types'
import { buildShareLink } from '@/lib/share'
import { profileStore, useProfile } from '@/progress/store'
import { NETWORK_LABEL } from '@/web3/network'
import { ARC_CHAIN_ID, SHOP_ABI, SHOP_ADDRESS, dungeonHashOf, formatUsdcAmount } from '@/web3/shop'
import { usePurchase } from '@/web3/usePurchase'
import { useShopPrices } from '@/web3/useShopData'

type Tab = 'host' | 'join'

const DEMO: Dungeon = {
  ...PRACTICE_LEVELS[8].dungeon,
  id: 'f-demo-room',
  name: 'Demo Crossfire',
  source: 'friend',
  creator: { profileId: 'demo', displayName: 'NEON_WRAITH' },
}

interface Joined {
  dungeon: Dungeon
  /** Onchain challenge id and creator, or null for the local demo room. */
  verified: { id: number; creator: string } | null
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error('Copy failed. Select the text and copy it manually.')
  }
}

export function FriendScreen() {
  const { go } = useNav()
  const p = useProfile()
  const client = usePublicClient({ chainId: ARC_CHAIN_ID })
  const prices = useShopPrices()
  const pay = usePurchase()
  const address = p.wallets.find((w) => w.chain === 'arc')?.accountId ?? null
  const [tab, setTab] = useState<Tab>(() => (inbox.code || p.published.length === 0 ? 'join' : 'host'))
  const [input, setInput] = useState(() => {
    const c = inbox.code
    inbox.code = null
    return c ?? ''
  })
  const [selected, setSelected] = useState(0)
  const [joined, setJoined] = useState<Joined | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [lastHash, setLastHash] = useState<string | null>(null)

  const hosted = p.published[selected] ?? null
  const myChallenges = useMemo(() => p.challenges.filter((c) => hosted && c.dungeonId === hosted.id), [p.challenges, hosted])
  const latest = myChallenges[0] ?? null
  const hostedCode = hosted && latest ? encodeDungeon(hosted, latest.challengeId) : null
  const room = hosted ? roomCodeFor(hosted) : null

  useEffect(() => {
    let live = true
    setLink(null)
    if (hostedCode) void buildShareLink(`/?c=${hostedCode}`).then((l) => live && setLink(l))
    return () => {
      live = false
    }
  }, [hostedCode])

  const createChallenge = async () => {
    if (!hosted || !prices.data) return
    const res = await pay.run({
      kind: 'challenge',
      label: hosted.name,
      price: prices.data.challengeFee,
      call: { fn: 'createChallenge', hash: dungeonHashOf(hosted) },
    })
    if (!res || res.challengeId === null) return
    const id = Number(res.challengeId)
    profileStore.recordChallenge({ dungeonId: hosted.id, challengeId: id, txHash: res.hash, at: Date.now() })
    profileStore.saveRoom(roomCodeFor(hosted), encodeDungeon(hosted, id))
    setLastHash(res.hash)
    toast.success(`Challenge #${id} created`)
  }

  const lookup = async (raw: string) => {
    setError(null)
    setJoined(null)
    const text = raw.trim()
    if (!text) return setError('Paste a challenge code, link or room code.')
    let code = extractCode(text)
    if (!code) {
      const stored = p.rooms[text.toUpperCase()]
      if (stored) code = stored
      else if (/^[A-Za-z0-9]{6}$/.test(text)) return setError('That room code is not on this device. Ask your friend for the full code or link.')
    }
    const dungeon = code ? decodeDungeon(code) : null
    if (!code || !dungeon) return setError('That code could not be read. Check that you copied all of it.')
    const v = validateDungeon(dungeon)
    if (!v.ok) return setError(`This dungeon is not valid: ${v.errors[0]}`)
    const full = { ...dungeon, par: v.par ?? undefined }

    // A real challenge exists onchain, created (and paid for) by the dungeon's creator.
    const id = decodeChallengeId(code)
    if (!id) return setError('This code is not a paid challenge. Ask your friend to create the challenge in the app.')
    if (!SHOP_ADDRESS || !client) return setError('Challenges are verified onchain, and the shop is not live yet.')
    setChecking(true)
    try {
      const [creator, hash] = await Promise.all([
        client.readContract({ address: SHOP_ADDRESS, abi: SHOP_ABI, functionName: 'challengeCreator', args: [BigInt(id)] }),
        client.readContract({ address: SHOP_ADDRESS, abi: SHOP_ABI, functionName: 'challengeDungeon', args: [BigInt(id)] }),
      ])
      if (/^0x0+$/.test(creator) || hash.toLowerCase() !== dungeonHashOf(full).toLowerCase()) {
        setError('This challenge could not be found onchain, or the dungeon was changed.')
      } else {
        setJoined({ dungeon: full, verified: { id, creator } })
      }
    } catch {
      setError(`Could not reach ${NETWORK_LABEL} to verify this challenge. Check your connection and try again.`)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (input && tab === 'join') void lookup(input)
    // run once for a link that arrived with a code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = (d: Dungeon, own: boolean) => {
    go(playRoute({ ...d, par: d.par ?? validateDungeon(d).par ?? undefined }, own ? 'test' : 'friend', { name: 'friend' }, null))
  }

  return (
    <Screen title="Challenge a Friend" onBack={() => go({ name: 'modes' })}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-800 p-1" role="tablist">
          {(['host', 'join'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`min-h-11 rounded-lg font-display text-sm font-semibold uppercase tracking-wider transition ${tab === t ? 'bg-volt-500 text-white shadow-volt' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              {t === 'host' ? 'Send a challenge' : 'Join a challenge'}
            </button>
          ))}
        </div>

        <Notice>The person who creates a challenge pays a small USDC fee onchain. Friends who play it pay nothing, though each run still uses 1 health.</Notice>

        {tab === 'host' && (
          <>
            {!address && <AuthCard reason="Creating a challenge costs a small USDC fee, so you need an account." />}
            {p.published.length === 0 ? (
              <Panel className="flex flex-col items-center gap-3 py-10 text-center">
                <Hammer size={28} className="text-volt-400" />
                <div className="font-display text-lg font-bold">No dungeons to share yet</div>
                <p className="max-w-xs text-sm text-zinc-400">Build and publish a dungeon in Creator Mode, then challenge a friend with it.</p>
                <Button variant="primary" onClick={() => go({ name: 'editor' })}>
                  Open Creator Mode
                </Button>
              </Panel>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {p.published.map((d, i) => (
                    <button key={d.id} onClick={() => setSelected(i)} className={`shrink-0 rounded-xl border p-2 text-left transition ${i === selected ? 'border-volt-400 bg-volt-500/10' : 'border-ink-500 bg-ink-800/70'}`}>
                      <MiniDungeon dungeon={d} px={72} />
                      <div className="mt-1 max-w-[72px] truncate text-xs font-semibold">{d.name}</div>
                    </button>
                  ))}
                </div>
                {hosted && (
                  <Panel className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-lg font-bold">{hosted.name}</div>
                        <div className="text-xs text-zinc-500">Created by {hosted.creator.displayName}</div>
                      </div>
                      <Difficulty level={hosted.difficulty} />
                    </div>

                    {hostedCode && latest && (
                      <>
                        <div>
                          <Label>Challenge #{latest.challengeId} · room code (this device)</Label>
                          <div className="tabular font-pixel text-3xl tracking-[0.2em] text-acid-500">{room}</div>
                        </div>
                        <div>
                          <Label>Challenge code</Label>
                          <div className="mt-1 break-all rounded-lg bg-ink-900 p-2 font-mono text-xs text-zinc-300">{hostedCode}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => void copy(hostedCode, 'Code')}>
                            <Copy size={15} /> Copy code
                          </Button>
                          <Button variant="volt" disabled={!link} onClick={() => link && void copy(link, 'Link')}>
                            <Link2 size={15} /> Copy link
                          </Button>
                        </div>
                      </>
                    )}

                    <Button variant={latest ? 'ghost' : 'primary'} size={latest ? 'md' : 'lg'} disabled={!address || !prices.data || pay.busy || !SHOP_ADDRESS} onClick={() => void createChallenge()}>
                      {pay.busy ? <Loader2 size={16} className="animate-spin" /> : null}
                      {prices.data ? `${latest ? 'New challenge' : 'Create challenge'} · ${formatUsdcAmount(prices.data.challengeFee)} USDC` : 'Create challenge'}
                    </Button>
                    {!SHOP_ADDRESS && <p className="text-xs text-zinc-500">Challenges need the shop contract, which is not live yet.</p>}
                    <PayStatus step={pay.step} error={pay.error} hash={lastHash} />
                    <Button onClick={() => play(hosted, true)}>
                      <Play size={16} className="fill-current" /> Test-run it (free)
                    </Button>
                  </Panel>
                )}
              </>
            )}
          </>
        )}

        {tab === 'join' && (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void lookup(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste code, link or room code"
                aria-label="Challenge code"
                className="h-12 min-w-0 flex-1 rounded-xl border border-ink-500 bg-ink-900 px-3 text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-volt-400"
              />
              <Button variant="volt" type="submit" disabled={checking}>
                {checking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Find
              </Button>
            </form>
            {error && <Notice tone="error">{error}</Notice>}
            {joined && (
              <Panel className="flex items-center gap-4">
                <MiniDungeon dungeon={joined.dungeon} px={96} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-lg font-bold">{joined.dungeon.name}</div>
                  <div className="text-sm text-zinc-400">by {joined.dungeon.creator.displayName}</div>
                  {joined.verified ? (
                    <div className="mt-1 flex items-center gap-1 text-xs text-acid-300">
                      <BadgeCheck size={13} /> Challenge #{joined.verified.id} verified onchain · {shortAddress(joined.verified.creator)}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-zinc-500">Local demo room</div>
                  )}
                  <div className="mt-1">
                    <Difficulty level={joined.dungeon.difficulty} />
                  </div>
                </div>
                <Button variant="primary" onClick={() => play(joined.dungeon, false)}>
                  <Play size={16} className="fill-current" /> Run
                </Button>
              </Panel>
            )}
            {!joined && !error && !checking && (
              <Panel className="flex flex-col items-center gap-3 py-8 text-center">
                <Users size={28} className="text-volt-400" />
                <p className="max-w-xs text-sm text-zinc-400">Got a code from a friend? Paste it above. Want to see how it works first?</p>
                <Button onClick={() => setJoined({ dungeon: { ...DEMO, par: validateDungeon(DEMO).par ?? undefined }, verified: null })}>Load a demo room</Button>
              </Panel>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}
